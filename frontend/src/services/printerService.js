// Printer Service supporting Web Bluetooth BLE, RawBT Android Bridge, and Print Fallback

class PrinterService {
  constructor() {
    this.device = null;
    this.characteristic = null;
    this.isConnected = false;
    this.listeners = [];
  }

  onStateChange(cb) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  notify() {
    this.listeners.forEach((l) => l({ isConnected: this.isConnected, device: this.device }));
  }

  // Connect to Web Bluetooth BLE Printer
  async connect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth tidak didukung pada browser ini. Gunakan Chrome di Android/PC atau cetak via Preview/RawBT.');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Common thermal printer service
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        ],
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.isConnected = false;
        this.characteristic = null;
        this.notify();
      });

      const server = await this.device.gatt.connect();
      
      // Try to discover primary services and writable characteristics
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char;
            break;
          }
        }
        if (this.characteristic) break;
      }

      if (!this.characteristic) {
        throw new Error('Karakteristik printer tidak ditemukan pada perangkat ini.');
      }

      this.isConnected = true;
      this.notify();
      return this.device.name || 'Bluetooth Thermal Printer';
    } catch (err) {
      this.isConnected = false;
      this.notify();
      throw err;
    }
  }

  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.characteristic = null;
    this.notify();
  }

  // Generate 58mm (32 chars) or 80mm (48 chars) ESC/POS commands
  generateEscPosCommands(transaction, ramSettings = {}) {
    const is80mm = ramSettings.receipt_width === '80mm';
    const lineWidth = is80mm ? 48 : 32;

    const ESC = 0x1b;
    const GS = 0x1d;

    const INIT = [ESC, 0x40];
    const ALIGN_LEFT = [ESC, 0x61, 0x00];
    const ALIGN_CENTER = [ESC, 0x61, 0x01];
    const ALIGN_RIGHT = [ESC, 0x61, 0x02];
    const BOLD_ON = [ESC, 0x45, 0x01];
    const BOLD_OFF = [ESC, 0x45, 0x00];
    const DOUBLE_HEIGHT = [GS, 0x21, 0x01];
    const DOUBLE_WIDTH = [GS, 0x21, 0x10];
    const DOUBLE_SIZE = [GS, 0x21, 0x11];
    const NORMAL_SIZE = [GS, 0x21, 0x00];
    const FEED_LINES = (n = 3) => [ESC, 0x64, n];
    const CUT_PAPER = [GS, 0x56, 0x41, 0x00];

    const separator = '='.repeat(lineWidth) + '\n';
    const subSeparator = '-'.repeat(lineWidth) + '\n';

    const formatRow = (left, right) => {
      const l = String(left || '');
      const r = String(right || '');
      const space = lineWidth - l.length - r.length;
      if (space < 0) {
        return l + '\n' + ' '.repeat(lineWidth - r.length) + r + '\n';
      }
      return l + ' '.repeat(space) + r + '\n';
    };

    const encoder = new TextEncoder();
    let parts = [];

    // Helper to add text
    const addText = (text) => parts.push(encoder.encode(text));
    const addBytes = (bytes) => parts.push(new Uint8Array(bytes));

    // 1. Initialize
    addBytes(INIT);

    // 2. Header
    addBytes(ALIGN_CENTER);
    addBytes(BOLD_ON);
    addBytes(DOUBLE_HEIGHT);
    addText((ramSettings.ram_name || 'RAM BERKAH SAWIT TUA') + '\n');
    addBytes(NORMAL_SIZE);
    addBytes(BOLD_OFF);
    addText((ramSettings.location_line1 || 'TANJUNG ENIM') + '\n');
    if (ramSettings.phone) {
      addText(`Telp: ${ramSettings.phone}\n`);
    }
    addText(separator);

    // 3. Ticket info
    addBytes(ALIGN_CENTER);
    addBytes(BOLD_ON);
    addText(`NO TIKET: ${transaction.ticket_number}\n`);
    addBytes(BOLD_OFF);
    addBytes(ALIGN_LEFT);
    addText(formatRow(`Tgl: ${transaction.transaction_date || ''}`, `Jam: ${transaction.transaction_time || ''}`));
    addText(subSeparator);

    // 4. Sender & Vehicle
    addText(`SUPPLIER   : ${transaction.supplier_name || '-'}\n`);
    addText(`SOPIR      : ${transaction.driver_name || '-'}\n`);
    addText(`NO POLISI  : ${transaction.plate_number || '-'}\n`);
    if (transaction.origin) {
      addText(`ASAL/BLOK  : ${transaction.origin} ${transaction.block ? `(${transaction.block})` : ''}\n`);
    }
    addText(subSeparator);

    // 5. Weighing details
    const formatNumber = (num) => Number(num || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatRp = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

    addText(formatRow('GROSS (Kotor)', `${formatNumber(transaction.gross_kg)} KG`));
    addText(formatRow('TARE (Kendaraan)', `${formatNumber(transaction.tare_kg)} KG`));
    addBytes(BOLD_ON);
    addText(formatRow('NETTO', `${formatNumber(transaction.netto_kg)} KG`));
    addBytes(BOLD_OFF);

    addText(formatRow(`POTONGAN (${transaction.deduction_percent || 0}%)`, `${formatNumber(transaction.deduction_kg)} KG`));
    addText(formatRow('SORTASI', `${transaction.sortation || 'Matang'}`));

    addBytes(BOLD_ON);
    addText(formatRow('BERSIH (KG)', `${formatNumber(transaction.clean_kg)} KG`));
    addText(formatRow('HARGA / KG', formatRp(transaction.price_per_kg)));
    
    // Biaya Bongkar (Netto * loading_fee_per_kg)
    const loadingFeePerKg = transaction.loading_fee_per_kg !== undefined ? Number(transaction.loading_fee_per_kg) : 10;
    const loadingFee = transaction.loading_fee !== undefined ? Number(transaction.loading_fee) : Math.round(Number(transaction.netto_kg || 0) * loadingFeePerKg);
    if (loadingFee > 0 || loadingFeePerKg > 0) {
      addText(formatRow(`BONGKAR (@Rp${loadingFeePerKg})`, `- ${formatRp(loadingFee)}`));
    }
    addBytes(BOLD_OFF);
    addText(subSeparator);

    // 6. Total Price
    addBytes(ALIGN_CENTER);
    addBytes(BOLD_ON);
    addText('TOTAL PEMBAYARAN\n');
    addBytes(DOUBLE_SIZE);
    addText(`${formatRp(transaction.total_price)}\n`);
    addBytes(NORMAL_SIZE);
    addBytes(BOLD_OFF);
    addText(separator);

    // 7. Footer & Signatures
    addBytes(ALIGN_LEFT);
    addText(formatRow('Operator:', 'Sopir / Pengirim:'));
    addText('\n\n\n');
    addText(formatRow(`(${transaction.operator_name || 'Operator'})`, `(${transaction.driver_name || 'Sopir'})`));
    addText('\n');

    addBytes(ALIGN_CENTER);
    const footerText = ramSettings.receipt_footer || 'TERIMA KASIH\nRAM BERKAH SAWIT TUA';
    addText(footerText + '\n');

    addBytes(FEED_LINES(3));
    addBytes(CUT_PAPER);

    // Combine all chunks into a single Uint8Array
    let totalLength = parts.reduce((acc, p) => acc + p.length, 0);
    let fullBytes = new Uint8Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      fullBytes.set(part, offset);
      offset += part.length;
    }

    return fullBytes;
  }

  // Print directly via Web Bluetooth
  async printViaBluetooth(transaction, ramSettings) {
    if (!this.isConnected || !this.characteristic) {
      throw new Error('Printer Bluetooth belum terhubung.');
    }

    const bytes = this.generateEscPosCommands(transaction, ramSettings);
    
    // Chunk transmission (512 bytes limit per write in BLE)
    const CHUNK_SIZE = 128;
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.slice(i, i + CHUNK_SIZE);
      await this.characteristic.writeValue(chunk);
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  // Print via Android RawBT intent bridge
  printViaRawBT(transaction, ramSettings) {
    const bytes = this.generateEscPosCommands(transaction, ramSettings);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    window.location.href = `rawbt:data:application/octet-stream;base64,${base64}`;
  }
}

export const printerService = new PrinterService();
