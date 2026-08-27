// Digital Scale Service supporting Web Bluetooth BLE & Weight Stream Simulation

class ScaleService {
  constructor() {
    this.device = null;
    this.characteristic = null;
    this.isConnected = false;
    this.currentWeight = 0;
    this.listeners = [];
    this.simInterval = null;
    this.isSimulating = false;
  }

  onWeightChange(cb) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  notify(data) {
    this.listeners.forEach((l) => l(data));
  }

  // Connect to Bluetooth Scale
  async connect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth tidak didukung di browser ini. Anda dapat menggunakan mode Manual atau Simulasi Timbangan.');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000181d-0000-1000-8000-00805f9b34fb', // Standard Weight Scale Service
          '0000ffe0-0000-1000-8000-00805f9b34fb', // Common serial BLE (XK3190, HC-08/HM-10)
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        ],
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        this.isConnected = false;
        this.characteristic = null;
        this.notify({ isConnected: false, weight: 0 });
      });

      const server = await this.device.gatt.connect();
      const services = await server.getPrimaryServices();

      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.notify || char.properties.indicate || char.properties.read) {
            this.characteristic = char;
            break;
          }
        }
        if (this.characteristic) break;
      }

      if (this.characteristic && (this.characteristic.properties.notify || this.characteristic.properties.indicate)) {
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
          this.parseScaleData(event.target.value);
        });
      }

      this.isConnected = true;
      this.isSimulating = false;
      this.notify({ isConnected: true, deviceName: this.device.name || 'Digital Scale BT' });
      return this.device.name || 'Digital Scale BT';
    } catch (err) {
      this.isConnected = false;
      this.notify({ isConnected: false, error: err.message });
      throw err;
    }
  }

  // Parse bytes from scale (XK3190 format or standard Weight measurement)
  parseScaleData(dataView) {
    try {
      // Decode ASCII text if transmitted as string (e.g. "+ 005529 kg" or "ST,GS,+05529.0kg")
      const decoder = new TextDecoder('utf-8');
      const text = decoder.decode(dataView);
      const match = text.match(/[-+]?\d+(\.\d+)?/);
      if (match) {
        const weight = parseFloat(match[0]);
        if (!isNaN(weight)) {
          this.currentWeight = weight;
          this.notify({ isConnected: true, weight: this.currentWeight, raw: text });
          return;
        }
      }

      // If standard BLE 16-bit / 32-bit weight measurement
      if (dataView.byteLength >= 2) {
        const flags = dataView.getUint8(0);
        let weight = dataView.getUint16(1, true);
        if (flags & 0x01) {
          weight = weight * 0.005; // Imperial or resolution factor
        }
        this.currentWeight = weight;
        this.notify({ isConnected: true, weight: this.currentWeight });
      }
    } catch (e) {
      console.warn('Scale parse error:', e);
    }
  }

  // Start Built-in Scale Simulator (Great for desktop testing & demo)
  startSimulation(baseWeight = 5529) {
    this.stopSimulation();
    this.isSimulating = true;
    this.isConnected = true;
    this.currentWeight = baseWeight;

    this.notify({
      isConnected: true,
      isSimulating: true,
      deviceName: 'DIGITAL SCALE SIMULATOR (XK3190)',
      weight: this.currentWeight,
    });

    this.simInterval = setInterval(() => {
      // Subtle fluctuation (+- 2 kg) like live scale
      const jitter = (Math.random() - 0.5) * 4;
      this.currentWeight = Math.max(0, Math.round((baseWeight + jitter) * 10) / 10);
      this.notify({
        isConnected: true,
        isSimulating: true,
        deviceName: 'DIGITAL SCALE SIMULATOR (XK3190)',
        weight: this.currentWeight,
      });
    }, 1200);
  }

  setSimulatedWeight(weight) {
    if (this.isSimulating) {
      this.startSimulation(weight);
    }
  }

  stopSimulation() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    if (this.isSimulating) {
      this.isSimulating = false;
      this.isConnected = false;
      this.notify({ isConnected: false, weight: 0 });
    }
  }

  async disconnect() {
    this.stopSimulation();
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.isConnected = false;
    this.characteristic = null;
    this.notify({ isConnected: false, weight: 0 });
  }
}

export const scaleService = new ScaleService();
