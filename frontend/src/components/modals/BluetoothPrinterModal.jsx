import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useHardware } from '../../context/HardwareContext';
import { useSettings } from '../../context/SettingsContext';
import { Printer, Wifi, WifiOff, RefreshCw, Smartphone, CheckCircle2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export const BluetoothPrinterModal = ({ isOpen, onClose }) => {
  const { printerState, connectPrinter, disconnectPrinter, printReceipt } = useHardware();
  const { settings, updateSettings } = useSettings();
  const [loading, setLoading] = useState(false);

  const sampleTransaction = {
    ticket_number: `${settings.ticket_prefix || 'BST'}-260827-0001`,
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
    supplier_name: 'PT Sinar Jaya',
    supplier_do: 'KUD Makmur',
    driver_name: 'Budi Santoso',
    plate_number: 'KH 1234 AB',
    origin: 'Blok A12',
    gross_kg: 5529,
    tare_kg: 1500,
    netto_kg: 4029,
    deduction_percent: 3,
    deduction_kg: 120.87,
    clean_kg: 3908.13,
    price_per_kg: 2650,
    total_price: 10356544,
    sortation: 'Matang',
    operator_name: 'Operator RAM',
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connectPrinter();
    } finally {
      setLoading(false);
    }
  };

  const handleTestPrint = async (method = 'bluetooth') => {
    try {
      await printReceipt(sampleTransaction, method);
    } catch (e) {
      toast.error('Test print gagal: ' + e.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Koneksi Printer Thermal Bluetooth (ESC/POS)" maxWidth="max-w-md">
      <div className="space-y-5">
        {/* Status Box */}
        <div className={`p-4 rounded-2xl border transition-all ${
          printerState.isConnected
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                printerState.isConnected
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
              }`}>
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {printerState.isConnected ? printerState.deviceName || 'ESC/POS Thermal Printer' : 'Printer Belum Terhubung'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {printerState.isConnected ? 'Web Bluetooth BLE Siap' : 'Ukuran Kertas: ' + (settings.receipt_width || '58mm')}
                </p>
              </div>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              printerState.isConnected
                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${printerState.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              {printerState.isConnected ? 'TERHUBUNG' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Paper Width Config */}
        <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-zinc-800/60 rounded-xl border border-gray-100 dark:border-zinc-800">
          <div>
            <span className="text-xs font-bold text-gray-800 dark:text-zinc-200 block">Ukuran Kertas Thermal</span>
            <span className="text-xs text-gray-500">Standar lebar struk timbangan</span>
          </div>
          <div className="flex gap-1.5">
            {['58mm', '80mm'].map((width) => (
              <button
                key={width}
                type="button"
                onClick={() => updateSettings({ receipt_width: width })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  settings.receipt_width === width
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100'
                }`}
              >
                {width}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          {printerState.isConnected ? (
            <button
              type="button"
              onClick={disconnectPrinter}
              className="w-full py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center gap-2"
            >
              <WifiOff className="w-4 h-4" />
              Putuskan Sambungan Printer
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={handleConnect}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              {loading ? 'Menghubungkan BLE Printer...' : 'Cari & Hubungkan Bluetooth Printer'}
            </button>
          )}

          {/* Test Prints */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleTestPrint('bluetooth')}
              disabled={!printerState.isConnected}
              className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Printer className="w-3.5 h-3.5" />
              Test Cetak BLE
            </button>
            <button
              type="button"
              onClick={() => handleTestPrint('rawbt')}
              className="py-2 px-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Cetak via RawBT
            </button>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 dark:text-zinc-400 text-center leading-relaxed">
          💡 <strong>Tips:</strong> Jika printer thermal Anda menggunakan Bluetooth SPP/Classic, gunakan tombol <em>RawBT</em> untuk mencetak langsung via aplikasi RawBT Driver di Android.
        </p>
      </div>
    </Modal>
  );
};
