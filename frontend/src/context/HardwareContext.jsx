import React, { createContext, useContext, useState, useEffect } from 'react';
import { scaleService } from '../services/scaleService';
import { printerService } from '../services/printerService';
import { getPendingOfflineTransactions, markTransactionSynced } from '../services/offlineDb';
import { request } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { useSettings } from './SettingsContext';
import toast from 'react-hot-toast';

const HardwareContext = createContext();

export const HardwareProvider = ({ children }) => {
  const { settings } = useSettings();

  // Network state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Scale state
  const [scaleState, setScaleState] = useState({
    isConnected: false,
    deviceName: null,
    weight: 0,
    isSimulating: false,
  });

  // Printer state
  const [printerState, setPrinterState] = useState({
    isConnected: false,
    deviceName: null,
  });

  // Check pending offline transactions
  const checkPendingSync = async () => {
    try {
      const pending = await getPendingOfflineTransactions();
      setPendingSyncCount(pending.length);
      return pending;
    } catch {
      return [];
    }
  };

  // Sync offline transactions to backend
  const syncOfflineData = async () => {
    if (!navigator.onLine || isSyncing) return;
    const pending = await checkPendingSync();
    if (pending.length === 0) return;

    setIsSyncing(true);
    try {
      const res = await request.post(API_ENDPOINTS.TRANSACTIONS.SYNC, { items: pending });
      if (res.success) {
        for (const item of pending) {
          await markTransactionSynced(item.local_uuid);
        }
        await checkPendingSync();
        toast.success(`✓ ${res.syncedCount || pending.length} transaksi offline berhasil disinkronkan!`);
      }
    } catch (e) {
      console.warn('Sync failed, will retry later:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Listeners for Network & Hardware
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Koneksi internet pulih (ONLINE)');
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('Mode OFFLINE aktif. Transaksi akan disimpan di memori perangkat.', { icon: '📶' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    checkPendingSync();

    // Subscribe to Scale
    const unsubScale = scaleService.onWeightChange((data) => {
      setScaleState((prev) => ({ ...prev, ...data }));
    });

    // Subscribe to Printer
    const unsubPrinter = printerService.onStateChange((data) => {
      setPrinterState({
        isConnected: data.isConnected,
        deviceName: data.device ? data.device.name || 'Bluetooth Printer' : null,
      });
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubScale();
      unsubPrinter();
    };
  }, []);

  // Scale actions
  const connectScale = async () => {
    try {
      const name = await scaleService.connect();
      toast.success(`Timbangan terhubung: ${name}`);
      return true;
    } catch (err) {
      toast.error(err.message || 'Gagal menghubungkan timbangan');
      return false;
    }
  };

  const disconnectScale = async () => {
    await scaleService.disconnect();
    toast('Timbangan diputuskan', { icon: '🔌' });
  };

  const startScaleSimulation = (baseWeight) => {
    scaleService.startSimulation(baseWeight);
    toast.success('Simulasi Timbangan Digital Aktif');
  };

  const stopScaleSimulation = () => {
    scaleService.stopSimulation();
    toast('Simulasi Timbangan Dinonaktifkan', { icon: '⏹' });
  };

  // Printer actions
  const connectPrinter = async () => {
    try {
      const name = await printerService.connect();
      toast.success(`Printer terhubung: ${name}`);
      return true;
    } catch (err) {
      toast.error(err.message || 'Gagal menghubungkan printer Bluetooth');
      return false;
    }
  };

  const disconnectPrinter = async () => {
    await printerService.disconnect();
    toast('Printer Bluetooth diputuskan', { icon: '🔌' });
  };

  const printReceipt = async (transaction, printMethod = 'auto') => {
    if (printMethod === 'bluetooth' || (printMethod === 'auto' && printerState.isConnected)) {
      try {
        await printerService.printViaBluetooth(transaction, settings);
        toast.success('✓ Nota berhasil dicetak via Bluetooth!');
        return true;
      } catch (err) {
        toast.error(`Bluetooth Print gagal: ${err.message}. Membuka Preview...`);
        return false;
      }
    } else if (printMethod === 'rawbt') {
      try {
        printerService.printViaRawBT(transaction, settings);
        toast.success('Mengirim ke RawBT...');
        return true;
      } catch (err) {
        toast.error('Gagal mengirim ke RawBT');
        return false;
      }
    }
    return false;
  };

  return (
    <HardwareContext.Provider
      value={{
        isOnline,
        pendingSyncCount,
        isSyncing,
        syncOfflineData,
        checkPendingSync,
        scaleState,
        connectScale,
        disconnectScale,
        startScaleSimulation,
        stopScaleSimulation,
        printerState,
        connectPrinter,
        disconnectPrinter,
        printReceipt,
      }}
    >
      {children}
    </HardwareContext.Provider>
  );
};

export const useHardware = () => useContext(HardwareContext);
