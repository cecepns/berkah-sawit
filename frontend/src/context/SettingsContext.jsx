import React, { createContext, useContext, useState, useEffect } from 'react';
import { request } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import toast from 'react-hot-toast';

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  ram_name: 'RAM BERKAH SAWIT TUA',
  ram_code: 'BST',
  location_line1: 'Tanjung Enim',
  location_line2: 'Muara Enim, Sumatera Selatan',
  phone: '0812-7890-1234',
  address: 'Jl. Sawit Raya No. 88, Tanjung Enim',
  ticket_prefix: 'BST',
  receipt_footer: 'TERIMA KASIH\nRAM BERKAH SAWIT TUA',
  receipt_width: '58mm',
  rounding_rule: 'exact',
  default_price: 2650,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('ram_sawit_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.SETTINGS.GET);
      if (res.success && res.data) {
        setSettings((prev) => {
          const updated = { ...prev, ...res.data };
          localStorage.setItem('ram_sawit_settings', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (e) {
      // Local settings fallback
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings) => {
    setLoading(true);
    try {
      const merged = { ...settings, ...newSettings };
      setSettings(merged);
      localStorage.setItem('ram_sawit_settings', JSON.stringify(merged));

      await request.put(API_ENDPOINTS.SETTINGS.UPDATE, merged);
      toast.success('Pengaturan RAM berhasil disimpan');
      return true;
    } catch (error) {
      // Even if backend fails (e.g. offline), local updates still succeed
      toast.success('Pengaturan RAM disimpan secara lokal');
      return true;
    } finally {
      setLoading(false);
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, fetchSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
