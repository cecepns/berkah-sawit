import React, { useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { useHardware } from '../../context/HardwareContext';
import { useSettings } from '../../context/SettingsContext';
import {
  Printer,
  Smartphone,
  Share2,
  Download,
  Image as ImageIcon,
  FileText,
  RefreshCw,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';

export const ReceiptModal = ({ isOpen, onClose, transaction }) => {
  const { settings } = useSettings();
  const { printerState, printReceipt } = useHardware();
  const receiptRef = useRef();

  const [downloadingImg, setDownloadingImg] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  if (!transaction) return null;

  const is80mm = settings.receipt_width === '80mm';

  const formatNumber = (num) =>
    Number(num || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatRp = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

  const handlePrintBluetooth = async () => {
    await printReceipt(transaction, 'bluetooth');
  };

  const handlePrintRawBT = () => {
    printReceipt(transaction, 'rawbt');
  };

  const handleNativePrint = () => {
    const receiptElem = document.getElementById('printable-receipt');
    if (!receiptElem) {
      window.print();
      return;
    }

    // Remove old print frame if exists
    const oldIframe = document.getElementById('receipt-print-iframe');
    if (oldIframe) {
      oldIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    const paperWidth = is80mm ? '78mm' : '56mm';

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Nota Timbangan - ${transaction.ticket_number}</title>
          <style>
            @page {
              size: ${is80mm ? '80mm auto' : '58mm auto'};
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: 'Courier New', Courier, monospace, sans-serif;
              font-size: 11px;
              color: #000000;
              background: #ffffff;
              width: ${paperWidth};
              max-width: 100%;
              padding: 2mm 3mm;
              line-height: 1.3;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .font-extrabold { font-weight: 800; }
            .font-semibold { font-weight: 600; }
            .uppercase { text-transform: uppercase; }
            .tracking-wide { letter-spacing: 0.05em; }
            .tracking-tight { letter-spacing: -0.025em; }
            .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .whitespace-pre-line { white-space: pre-line; }
            .flex { display: flex; justify-content: space-between; }
            .space-y-0\\.5 > * + * { margin-top: 2px; }
            .space-y-1 > * + * { margin-top: 3px; }
            .border-b { border-bottom: 1px dashed #000; }
            .border-t { border-top: 1px dashed #000; }
            .border-dotted { border-bottom: 1px dotted #555; }
            .py-1 { padding-top: 2px; padding-bottom: 2px; }
            .py-2 { padding-top: 4px; padding-bottom: 4px; }
            .py-2\\.5 { padding-top: 5px; padding-bottom: 5px; }
            .pb-2 { padding-bottom: 4px; }
            .pt-2 { padding-top: 4px; }
            .pt-3 { padding-top: 6px; }
            .mb-2 { margin-bottom: 4px; }
            .mb-8 { margin-bottom: 24px; }
            .my-1 { margin-top: 2px; margin-bottom: 2px; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 12px; }
            .text-base { font-size: 14px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[11px\\] { font-size: 10.5px; }
          </style>
        </head>
        <body>
          ${receiptElem.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }, 200);
  };

  const loadingFeePerKg = transaction.loading_fee_per_kg !== undefined ? Number(transaction.loading_fee_per_kg) : 10;
  const loadingFee = transaction.loading_fee !== undefined ? Number(transaction.loading_fee) : Math.round(Number(transaction.netto_kg || 0) * loadingFeePerKg);

  const handleShareWhatsApp = () => {
    const text = `*NOTA TIMBANGAN ${settings.ram_name || 'RAM BERKAH SAWIT TUA'}*
No. Tiket: ${transaction.ticket_number}
Tanggal: ${transaction.transaction_date} ${transaction.transaction_time || ''}
Supplier: ${transaction.supplier_name}
Sopir: ${transaction.driver_name} (${transaction.plate_number})
Asal: ${transaction.origin || '-'}

Gross: ${formatNumber(transaction.gross_kg)} KG
Tare: ${formatNumber(transaction.tare_kg)} KG
Netto: ${formatNumber(transaction.netto_kg)} KG
Potongan (${transaction.deduction_percent}%): ${formatNumber(transaction.deduction_kg)} KG
Sortasi: ${transaction.sortation || 'Matang'}
*BERSIH: ${formatNumber(transaction.clean_kg)} KG*
Harga/KG: ${formatRp(transaction.price_per_kg)}
Biaya Bongkar (@Rp ${loadingFeePerKg}): - ${formatRp(loadingFee)}
-----------------------------
*TOTAL PEMBAYARAN: ${formatRp(transaction.total_price)}*
-----------------------------
${settings.receipt_footer || 'Terima Kasih'}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Download Receipt as Image (PNG)
  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    setDownloadingImg(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Nota-${transaction.ticket_number || 'BST'}.png`;
      link.href = image;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Gambar nota berhasil diunduh');
    } catch (err) {
      console.error('Error generating receipt image:', err);
      toast.error('Gagal mengunduh gambar nota');
    } finally {
      setDownloadingImg(false);
    }
  };

  // Export Receipt as PDF
  const handleExportPDF = async () => {
    if (!receiptRef.current) return;
    setDownloadingPdf(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdfWidth = is80mm ? 80 : 58;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Nota-${transaction.ticket_number || 'BST'}.pdf`);

      toast.success('Nota berhasil diexport ke PDF');
    } catch (err) {
      console.error('Error exporting receipt PDF:', err);
      toast.error('Gagal mengekspor PDF nota');
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cetak Nota Timbangan" maxWidth="max-w-md">
      <div className="space-y-4">
        {/* Thermal Receipt Paper Card */}
        <div
          ref={receiptRef}
          id="printable-receipt"
          className={`mx-auto bg-white text-zinc-950 font-mono text-xs p-5 shadow-md border border-dashed border-zinc-300 rounded-sm leading-relaxed ${
            is80mm ? 'max-w-[340px]' : 'max-w-[280px]'
          }`}
        >
          {/* Header */}
          <div className="text-center pb-2 mb-2 border-b border-dashed border-zinc-800">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">
              {settings.ram_name || 'RAM BERKAH SAWIT TUA'}
            </h2>
            <p className="text-[11px] font-semibold">{settings.location_line1 || 'TANJUNG ENIM'}</p>
            {settings.phone && <p className="text-[10px] text-zinc-600">Telp: {settings.phone}</p>}
          </div>

          {/* Ticket & Date */}
          <div className="text-center py-1 font-bold text-zinc-900 border-b border-dashed border-zinc-400">
            NO TIKET: {transaction.ticket_number}
          </div>

          <div className="flex justify-between py-1 text-[11px] text-zinc-700 border-b border-dashed border-zinc-300">
            <span>Tgl: {transaction.transaction_date}</span>
            <span>Jam: {transaction.transaction_time || '00:00'}</span>
          </div>

          {/* Sender details */}
          <div className="py-2 border-b border-dashed border-zinc-400 space-y-0.5 text-[11px]">
            <div className="flex justify-between">
              <span className="font-semibold">SUPPLIER</span>
              <span className="text-right truncate font-bold">{transaction.supplier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">SOPIR</span>
              <span>{transaction.driver_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">NO POLISI</span>
              <span className="font-bold">{transaction.plate_number}</span>
            </div>
            {transaction.origin && (
              <div className="flex justify-between text-zinc-600">
                <span>ASAL/BLOK</span>
                <span>{transaction.origin} {transaction.block ? `(${transaction.block})` : ''}</span>
              </div>
            )}
          </div>

          {/* Weights */}
          <div className="py-2 border-b border-dashed border-zinc-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>GROSS (Kotor)</span>
              <span>{formatNumber(transaction.gross_kg)} KG</span>
            </div>
            <div className="flex justify-between">
              <span>TARE (Kendaraan)</span>
              <span>{formatNumber(transaction.tare_kg)} KG</span>
            </div>
            <div className="flex justify-between font-bold text-zinc-900 border-t border-dotted border-zinc-300 pt-0.5">
              <span>NETTO</span>
              <span>{formatNumber(transaction.netto_kg)} KG</span>
            </div>
            <div className="flex justify-between text-zinc-700">
              <span>POTONGAN ({transaction.deduction_percent}%)</span>
              <span>{formatNumber(transaction.deduction_kg)} KG</span>
            </div>
            <div className="flex justify-between text-zinc-700">
              <span>SORTASI</span>
              <span className="font-semibold">{transaction.sortation || 'Matang'}</span>
            </div>
            <div className="flex justify-between font-bold text-zinc-900 border-t border-dotted border-zinc-300 pt-0.5">
              <span>BERSIH (KG)</span>
              <span>{formatNumber(transaction.clean_kg)} KG</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>HARGA / KG</span>
              <span>{formatRp(transaction.price_per_kg)}</span>
            </div>
            {(loadingFee > 0 || loadingFeePerKg > 0) && (
              <div className="flex justify-between font-semibold text-zinc-900">
                <span>BIAYA BONGKAR (@Rp {loadingFeePerKg})</span>
                <span>- {formatRp(loadingFee)}</span>
              </div>
            )}
          </div>

          {/* Total Price */}
          <div className="py-2.5 my-1 text-center border-b border-dashed border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-600 block">TOTAL PEMBAYARAN</span>
            <span className="text-base font-extrabold text-zinc-950 block tracking-tight">
              {formatRp(transaction.total_price)}
            </span>
          </div>

          {/* Signatures */}
          <div className="pt-3 pb-2 flex justify-between text-center text-[10px]">
            <div>
              <p className="mb-8">Operator,</p>
              <p className="font-bold">({transaction.operator_name || 'Operator'})</p>
            </div>
            <div>
              <p className="mb-8">Sopir / Pengirim,</p>
              <p className="font-bold">({transaction.driver_name || 'Sopir'})</p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-2 border-t border-dashed border-zinc-400 text-[10px] text-zinc-600 whitespace-pre-line">
            {settings.receipt_footer || 'TERIMA KASIH\nRAM BERKAH SAWIT TUA'}
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
          {/* Bluetooth Print */}
          <button
            type="button"
            onClick={handlePrintBluetooth}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak BT {printerState.isConnected ? '(Ready)' : ''}</span>
          </button>

          {/* RawBT Android */}
          <button
            type="button"
            onClick={handlePrintRawBT}
            className="py-2.5 px-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Smartphone className="w-4 h-4" />
            <span>RawBT App</span>
          </button>

          {/* Browser Print Dialog */}
          <button
            type="button"
            onClick={handleNativePrint}
            className="py-2.5 px-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 text-gray-700 dark:text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print Dialog</span>
          </button>

          {/* WhatsApp Share */}
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-2.5 px-3 rounded-xl bg-green-500/10 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-500/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>WhatsApp</span>
          </button>

          {/* Download Image (PNG) */}
          <button
            type="button"
            onClick={handleDownloadImage}
            disabled={downloadingImg}
            className="py-2.5 px-3 rounded-xl bg-blue-500/10 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-500/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            {downloadingImg ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            <span>{downloadingImg ? 'Memproses...' : 'Unduh PNG'}</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={downloadingPdf}
            className="py-2.5 px-3 rounded-xl bg-rose-500/10 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-500/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
          >
            {downloadingPdf ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>{downloadingPdf ? 'Memproses...' : 'Export PDF'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
