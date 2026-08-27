import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useHardware } from '../../context/HardwareContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  Scale,
  Printer,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { BluetoothScaleModal } from '../modals/BluetoothScaleModal';
import { BluetoothPrinterModal } from '../modals/BluetoothPrinterModal';

export const Header = () => {
  const { settings } = useSettings();
  const {
    isOnline,
    pendingSyncCount,
    syncOfflineData,
    isSyncing,
    scaleState,
    printerState,
  } = useHardware();
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [showScaleModal, setShowScaleModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-gray-100 dark:border-zinc-800 px-3 sm:px-6 py-2 sm:py-2.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & RAM Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center font-extrabold text-xs sm:text-sm tracking-wider shadow-md shadow-emerald-600/20 shrink-0">
              {settings.ram_code || 'BST'}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-gray-900 dark:text-white tracking-tight uppercase leading-tight truncate">
                {settings.ram_name || 'RAM BERKAH SAWIT TUA'}
              </h1>
              <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide truncate hidden sm:block">
                {settings.location_line1 || 'TANJUNG ENIM'} {settings.location_line2 ? ` - ${settings.location_line2}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Hardware, Online Status & Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Online / Offline & Sync Badge */}
            {isOnline ? (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-900/50 whitespace-nowrap shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="hidden md:inline">ONLINE</span>
                {pendingSyncCount > 0 && (
                  <button
                    type="button"
                    onClick={syncOfflineData}
                    disabled={isSyncing}
                    title="Sinkronkan data offline"
                    className="ml-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] flex items-center gap-1 font-bold active:scale-95 transition-transform whitespace-nowrap"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{pendingSyncCount}</span>
                    <span className="hidden sm:inline">Sync</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[10px] sm:text-[11px] font-bold border border-amber-300 dark:border-amber-800 whitespace-nowrap shrink-0">
                <WifiOff className="w-3 h-3 text-amber-600 animate-pulse shrink-0" />
                <span className="hidden sm:inline">OFFLINE</span>
                {pendingSyncCount > 0 && <span>({pendingSyncCount})</span>}
              </div>
            )}

            {/* Quick BT Scale Button */}
            <button
              type="button"
              onClick={() => setShowScaleModal(true)}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                scaleState.isConnected
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
              title="Koneksi Timbangan Digital (Bluetooth / Simulator)"
            >
              <Scale className="w-4 h-4" />
              <span className="hidden md:inline font-mono">
                {scaleState.isConnected ? `${Number(scaleState.weight).toLocaleString('id-ID')} KG` : 'SCALE'}
              </span>
            </button>

            {/* Quick BT Printer Button */}
            <button
              type="button"
              onClick={() => setShowPrinterModal(true)}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
                printerState.isConnected
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
              title="Koneksi Thermal Printer (Bluetooth ESC/POS)"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">PRINTER</span>
            </button>

            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 sm:p-2 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors shrink-0"
              aria-label="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-600" />}
            </button>

            {/* User Profile & Logout (Desktop & Tablet) */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-zinc-800 shrink-0">
              <div className="text-right">
                <span className="text-xs font-bold text-gray-900 dark:text-white block leading-none truncate max-w-[90px] md:max-w-[120px]">
                  {user?.name || 'Operator'}
                </span>
                <span className="text-[10px] text-gray-500 uppercase font-semibold">
                  {user?.role || 'Operator'}
                </span>
              </div>
              <button
                type="button"
                onClick={logout}
                className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Keluar"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <BluetoothScaleModal isOpen={showScaleModal} onClose={() => setShowScaleModal(false)} />
      <BluetoothPrinterModal isOpen={showPrinterModal} onClose={() => setShowPrinterModal(false)} />
    </>
  );
};
