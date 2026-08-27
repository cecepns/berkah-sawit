import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useHardware } from '../../context/HardwareContext';
import { Scale, Wifi, WifiOff, Play, Square, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const BluetoothScaleModal = ({ isOpen, onClose, onApplyWeight }) => {
  const {
    scaleState,
    connectScale,
    disconnectScale,
    startScaleSimulation,
    stopScaleSimulation,
  } = useHardware();

  const [loading, setLoading] = useState(false);
  const [simWeightInput, setSimWeightInput] = useState('5529');

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connectScale();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSimulation = () => {
    if (scaleState.isSimulating) {
      stopScaleSimulation();
    } else {
      const num = parseFloat(simWeightInput) || 5529;
      startScaleSimulation(num);
    }
  };

  const handleApply = (targetField = 'gross') => {
    if (scaleState.weight > 0 && onApplyWeight) {
      onApplyWeight(scaleState.weight, targetField);
      toast.success(`Berat ${scaleState.weight.toLocaleString('id-ID')} kg dimasukkan ke ${targetField.toUpperCase()}`);
      onClose();
    } else {
      toast.error('Belum ada pembacaan berat');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Koneksi Timbangan Digital (Bluetooth)" maxWidth="max-w-md">
      <div className="space-y-5">
        {/* Connection Status Card */}
        <div className={`p-4 rounded-2xl border transition-all ${
          scaleState.isConnected
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
            : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                scaleState.isConnected
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500'
              }`}>
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {scaleState.isConnected ? scaleState.deviceName || 'Digital Scale BT' : 'Timbangan Belum Terhubung'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {scaleState.isSimulating ? 'Mode Simulator Aktif' : scaleState.isConnected ? 'Web Bluetooth BLE Live' : 'Bluetooth / Serial XK3190'}
                </p>
              </div>
            </div>

            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              scaleState.isConnected
                ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
            }`}>
              <span className={`w-2 h-2 rounded-full ${scaleState.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              {scaleState.isConnected ? 'TERHUBUNG' : 'OFFLINE'}
            </span>
          </div>

          {/* Live Weight Display */}
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-200/80 dark:border-zinc-800 text-center">
            <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">
              Berat Terdeteksi (Live)
            </span>
            <div className="text-4xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              {Number(scaleState.weight || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
              <span className="text-lg font-sans font-bold text-gray-500 ml-1.5">KG</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {scaleState.isConnected && !scaleState.isSimulating ? (
            <button
              type="button"
              onClick={disconnectScale}
              className="w-full py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center justify-center gap-2"
            >
              <WifiOff className="w-4 h-4" />
              Putuskan Koneksi Timbangan
            </button>
          ) : (
            <button
              type="button"
              disabled={loading || scaleState.isSimulating}
              onClick={handleConnect}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              {loading ? 'Mencari Perangkat BLE...' : 'Cari Perangkat Bluetooth Scale'}
            </button>
          )}

          {/* Scale Simulator Section (Testing & Demo) */}
          <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Simulasi Indikator Timbangan (Demo)
              </span>
              <button
                type="button"
                onClick={handleToggleSimulation}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                  scaleState.isSimulating
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {scaleState.isSimulating ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {scaleState.isSimulating ? 'Stop Demo' : 'Aktifkan Demo'}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="number"
                value={simWeightInput}
                onChange={(e) => setSimWeightInput(e.target.value)}
                placeholder="Berat simulasi (kg)"
                className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-amber-200 dark:border-zinc-700 rounded-lg text-xs font-mono text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const num = parseFloat(simWeightInput) || 5529;
                  startScaleSimulation(num);
                }}
                className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-semibold whitespace-nowrap"
              >
                Set Berat
              </button>
            </div>
          </div>
        </div>

        {/* Apply buttons to Form */}
        {onApplyWeight && (
          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex gap-2">
            <button
              type="button"
              onClick={() => handleApply('gross')}
              className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Terapkan ke GROSS
            </button>
            <button
              type="button"
              onClick={() => handleApply('tare')}
              className="flex-1 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-900 text-white dark:bg-zinc-700 dark:hover:bg-zinc-600 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Terapkan ke TARE
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};
