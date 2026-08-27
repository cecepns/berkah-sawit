import React, { useRef } from 'react';
import { Modal } from '../common/Modal';
import { useHardware } from '../../context/HardwareContext';
import { useSettings } from '../../context/SettingsContext';
import { Printer, Smartphone, Share2, Copy, Check, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export const ReceiptModal = ({ isOpen, onClose, transaction }) => {
  const { settings } = useSettings();
  const { printerState, printReceipt } = useHardware();
  const receiptRef = useRef();

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
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*NOTA TIMBANGAN ${settings.ram_name || 'RAM BERKAH SAWIT TUA'}*
No. Tiket: ${transaction.ticket_number}
Tanggal: ${transaction.transaction_date} ${transaction.transaction_time || ''}
Supplier: ${transaction.supplier_name} ${transaction.supplier_do ? `(${transaction.supplier_do})` : ''}
Sopir: ${transaction.driver_name} (${transaction.plate_number})
Asal: ${transaction.origin || '-'}

Gross: ${formatNumber(transaction.gross_kg)} KG
Tare: ${formatNumber(transaction.tare_kg)} KG
Netto: ${formatNumber(transaction.netto_kg)} KG
Potongan (${transaction.deduction_percent}%): ${formatNumber(transaction.deduction_kg)} KG
Sortasi: ${transaction.sortation || 'Matang'}
*BERSIH: ${formatNumber(transaction.clean_kg)} KG*
Harga/KG: ${formatRp(transaction.price_per_kg)}
-----------------------------
*TOTAL: ${formatRp(transaction.total_price)}*
-----------------------------
${settings.receipt_footer || 'Terima Kasih'}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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
            {transaction.supplier_do && (
              <div className="flex justify-between text-zinc-600">
                <span>DO / KUD</span>
                <span>{transaction.supplier_do}</span>
              </div>
            )}
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={handlePrintBluetooth}
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            Cetak Bluetooth {printerState.isConnected ? '(Ready)' : ''}
          </button>

          <button
            type="button"
            onClick={handlePrintRawBT}
            className="py-2.5 px-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Smartphone className="w-4 h-4" />
            RawBT Android
          </button>

          <button
            type="button"
            onClick={handleNativePrint}
            className="py-2.5 px-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/80 hover:bg-gray-100 text-gray-700 dark:text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            Print Dialog
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="py-2.5 px-3 rounded-xl bg-green-500/10 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 hover:bg-green-500/20 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Kirim WhatsApp
          </button>
        </div>
      </div>
    </Modal>
  );
};
