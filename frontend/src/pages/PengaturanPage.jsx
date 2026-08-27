import React, { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useHardware } from '../context/HardwareContext';
import { useAuth } from '../context/AuthContext';
import { request } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { clearLocalTransactions, getOfflineDb } from '../services/offlineDb';
import {
  Settings,
  Building2,
  DollarSign,
  Layers,
  Users,
  HardDrive,
  Save,
  CheckCircle2,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Printer,
  Scale,
  Download,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const PengaturanPage = () => {
  const { settings, updateSettings, loading: savingSettings } = useSettings();
  const { scaleState, printerState, connectScale, connectPrinter } = useHardware();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('ram_identity'); // 'ram_identity', 'price', 'sortation', 'users', 'hardware'

  // RAM Identity Form
  const [identityForm, setIdentityForm] = useState({
    ram_name: '',
    ram_code: '',
    location_line1: '',
    location_line2: '',
    phone: '',
    address: '',
    ticket_prefix: '',
    receipt_footer: '',
    receipt_width: '58mm',
    default_price: 2650,
  });

  // Price Setting State
  const [dailyPriceInput, setDailyPriceInput] = useState('2650');
  const [priceNotes, setPriceNotes] = useState('');
  const [priceHistory, setPriceHistory] = useState([]);

  // Sortations State
  const [sortations, setSortations] = useState([]);
  const [newSortName, setNewSortName] = useState('');
  const [newSortPct, setNewSortPct] = useState('0');

  // Users State
  const [users, setUsers] = useState([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('operator');

  useEffect(() => {
    if (settings) {
      setIdentityForm({
        ram_name: settings.ram_name || 'RAM BERKAH SAWIT TUA',
        ram_code: settings.ram_code || 'BST',
        location_line1: settings.location_line1 || 'Tanjung Enim',
        location_line2: settings.location_line2 || 'Tanjung Enim',
        phone: settings.phone || '0812-7890-1234',
        address: settings.address || 'Jl. Lintas Tanjung Enim',
        ticket_prefix: settings.ticket_prefix || 'BST',
        receipt_footer: settings.receipt_footer || 'TERIMA KASIH\nRAM BERKAH SAWIT TUA',
        receipt_width: settings.receipt_width || '58mm',
        default_price: settings.default_price || 2650,
      });
      setDailyPriceInput(String(settings.default_price || 2650));
    }
  }, [settings]);

  const fetchMasters = async () => {
    try {
      const [priceRes, sortRes, userRes] = await Promise.allSettled([
        request.get(API_ENDPOINTS.PRICES.LIST),
        request.get(API_ENDPOINTS.SORTATIONS.LIST),
        request.get(API_ENDPOINTS.USERS.LIST),
      ]);
      if (priceRes.status === 'fulfilled' && priceRes.value?.data) setPriceHistory(priceRes.value.data);
      if (sortRes.status === 'fulfilled' && sortRes.value?.data) setSortations(sortRes.value.data);
      if (userRes.status === 'fulfilled' && userRes.value?.data) setUsers(userRes.value.data);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchMasters();
  }, [activeTab]);

  // Handle RAM Identity Save
  const handleSaveIdentity = async (e) => {
    e.preventDefault();
    await updateSettings(identityForm);
  };

  // Handle Daily Price Update
  const handleUpdatePrice = async (e) => {
    e.preventDefault();
    const p = parseFloat(dailyPriceInput) || 2650;
    try {
      const res = await request.post(API_ENDPOINTS.PRICES.UPDATE, {
        price_per_kg: p,
        notes: priceNotes,
        effective_date: new Date().toISOString().split('T')[0],
      });
      if (res.success) {
        toast.success('Harga harian TBS berhasil disimpan');
        updateSettings({ default_price: p });
        fetchMasters();
      }
    } catch {
      updateSettings({ default_price: p });
      toast.success('Harga harian TBS disimpan lokal');
    }
  };

  // Handle Add Sortation
  const handleAddSortation = async (e) => {
    e.preventDefault();
    if (!newSortName.trim()) return;
    try {
      await request.post(API_ENDPOINTS.SORTATIONS.CREATE, {
        name: newSortName,
        default_deduction_percent: parseFloat(newSortPct) || 0,
      });
      toast.success('Sortasi ditambahkan');
      setNewSortName('');
      setNewSortPct('0');
      fetchMasters();
    } catch (e) {
      toast.error('Gagal menambah sortasi: ' + e.message);
    }
  };

  // Handle Add User
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUserName || !newUserUsername || !newUserPassword) {
      toast.error('Lengkapi semua data user');
      return;
    }
    try {
      const res = await request.post(API_ENDPOINTS.USERS.CREATE, {
        name: newUserName,
        username: newUserUsername,
        password: newUserPassword,
        role: newUserRole,
      });
      if (res.success) {
        toast.success('Pengguna baru berhasil dibuat');
        setNewUserName('');
        setNewUserUsername('');
        setNewUserPassword('');
        fetchMasters();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
  };

  // Clear Offline Cache
  const handleClearCache = async () => {
    if (window.confirm('Hapus seluruh antrean cache lokal? Pastikan semua transaksi penting sudah tersinkron.')) {
      await clearLocalTransactions();
      toast.success('Cache lokal berhasil dibersihkan');
    }
  };

  // Backup Export
  const handleExportBackup = async () => {
    const db = await getOfflineDb();
    const transactions = await db.getAll('transactions');
    const backup = {
      timestamp: new Date().toISOString(),
      settings: identityForm,
      localTransactions: transactions,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_ram_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    toast.success('File backup berhasil diunduh');
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-emerald-600" />
          Pengaturan Sistem & Profil RAM
        </h2>
        <p className="text-xs text-gray-500 font-medium">
          Kustomisasi nama RAM, harga standar TBS, sortasi, printer, dan pengguna
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 dark:bg-zinc-900 rounded-2xl text-xs font-bold">
        {[
          { id: 'ram_identity', label: 'Profil & Identitas RAM', icon: Building2 },
          { id: 'price', label: 'Harga TBS Harian', icon: DollarSign },
          { id: 'sortation', label: 'Master Sortasi', icon: Layers },
          { id: 'users', label: 'Pengguna & Akses', icon: Users },
          { id: 'hardware', label: 'Hardware & Backup', icon: HardDrive },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === t.id
                ? 'bg-white dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: RAM Identity */}
      {activeTab === 'ram_identity' && (
        <form onSubmit={handleSaveIdentity} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="border-b border-gray-100 dark:border-zinc-800 pb-3">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wide">
              Kustomisasi Nama & Identitas RAM
            </h3>
            <p className="text-xs text-gray-500">
              Nama ini akan otomatis tampil di seluruh antarmuka, nomor tiket, dan nota cetak thermal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Nama Lengkap RAM / Usaha *
              </label>
              <input
                type="text"
                required
                value={identityForm.ram_name}
                onChange={(e) => setIdentityForm({ ...identityForm, ram_name: e.target.value })}
                placeholder="RAM BERKAH SAWIT TUA"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Singkatan Logo / Inisial (Maks. 5 Karakter)
              </label>
              <input
                type="text"
                maxLength={5}
                value={identityForm.ram_code}
                onChange={(e) => setIdentityForm({ ...identityForm, ram_code: e.target.value.toUpperCase() })}
                placeholder="BST"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-mono font-bold uppercase text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Lokasi Baris 1 (Kota / Kecamatan)
              </label>
              <input
                type="text"
                value={identityForm.location_line1}
                onChange={(e) => setIdentityForm({ ...identityForm, location_line1: e.target.value })}
                placeholder="Tanjung Enim"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Lokasi Baris 2 (Kabupaten / Provinsi)
              </label>
              <input
                type="text"
                value={identityForm.location_line2}
                onChange={(e) => setIdentityForm({ ...identityForm, location_line2: e.target.value })}
                placeholder="Muara Enim, Sumatera Selatan"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Nomor Telepon / WhatsApp RAM
              </label>
              <input
                type="text"
                value={identityForm.phone}
                onChange={(e) => setIdentityForm({ ...identityForm, phone: e.target.value })}
                placeholder="0812-7890-1234"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Prefix Nomor Tiket
              </label>
              <input
                type="text"
                value={identityForm.ticket_prefix}
                onChange={(e) => setIdentityForm({ ...identityForm, ticket_prefix: e.target.value.toUpperCase() })}
                placeholder="BST"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-mono font-bold uppercase text-gray-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Alamat Lengkap RAM
              </label>
              <input
                type="text"
                value={identityForm.address}
                onChange={(e) => setIdentityForm({ ...identityForm, address: e.target.value })}
                placeholder="Jl. Sawit Raya No. 88, Tanjung Enim"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm text-gray-900 dark:text-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Footer Catatan Struk Thermal
              </label>
              <textarea
                rows={2}
                value={identityForm.receipt_footer}
                onChange={(e) => setIdentityForm({ ...identityForm, receipt_footer: e.target.value })}
                placeholder="TERIMA KASIH&#10;RAM BERKAH SAWIT TUA"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-mono text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingSettings ? 'Menyimpan...' : 'Simpan Profil RAM'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Daily Price */}
      {activeTab === 'price' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form onSubmit={handleUpdatePrice} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Update Harga TBS Hari Ini
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Harga / KG (Rupiah) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">Rp</span>
                <input
                  type="number"
                  required
                  value={dailyPriceInput}
                  onChange={(e) => setDailyPriceInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base font-mono font-extrabold text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Catatan Perubahan (Opsional)
              </label>
              <input
                type="text"
                value={priceNotes}
                onChange={(e) => setPriceNotes(e.target.value)}
                placeholder="Penyesuaian harga pabrik"
                className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
            >
              <Save className="w-4 h-4" />
              Terapkan Harga Hari Ini
            </button>
          </form>

          {/* History table */}
          <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Riwayat Harga Harian TBS
            </h3>
            <div className="overflow-x-auto border border-gray-100 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Tanggal Berlaku</th>
                    <th className="p-2.5">Harga / KG</th>
                    <th className="p-2.5">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {priceHistory.map((p, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-semibold text-gray-900 dark:text-white">{p.effective_date}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-600">Rp {Number(p.price_per_kg).toLocaleString('id-ID')}</td>
                      <td className="p-2.5 text-gray-500">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Sortations */}
      {activeTab === 'sortation' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form onSubmit={handleAddSortation} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-3.5">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Tambah Kategori Sortasi
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Nama Kategori *
              </label>
              <input
                type="text"
                required
                value={newSortName}
                onChange={(e) => setNewSortName(e.target.value)}
                placeholder="Matang / Mentah / Busuk"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Potongan Standar (%)
              </label>
              <input
                type="number"
                step="0.5"
                value={newSortPct}
                onChange={(e) => setNewSortPct(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Simpan Sortasi
            </button>
          </form>

          <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Daftar Kategori Sortasi & Default Potongan
            </h3>
            <div className="overflow-x-auto border border-gray-100 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Kategori</th>
                    <th className="p-2.5">Potongan Default (%)</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {sortations.map((s, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-gray-900 dark:text-white">{s.name}</td>
                      <td className="p-2.5 font-mono font-bold text-amber-600">{s.default_deduction_percent}%</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {s.status || 'Aktif'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Users */}
      {activeTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form onSubmit={handleAddUser} className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-3.5">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Tambah Pengguna Baru
            </h3>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Nama Lengkap *
              </label>
              <input
                type="text"
                required
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="Operator 2"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Username *
              </label>
              <input
                type="text"
                required
                value={newUserUsername}
                onChange={(e) => setNewUserUsername(e.target.value)}
                placeholder="operator2"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Hak Akses (Role)
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-bold"
              >
                <option value="operator">Operator (Timbang, Riwayat, Supplier)</option>
                <option value="admin">Administrator (Akses Penuh)</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Simpan Pengguna
            </button>
          </form>

          <div className="md:col-span-2 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-3">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Daftar Pengguna Sistem
            </h3>
            <div className="overflow-x-auto border border-gray-100 dark:border-zinc-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Nama</th>
                    <th className="p-2.5">Username</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {users.map((u, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-bold text-gray-900 dark:text-white">{u.name}</td>
                      <td className="p-2.5 font-mono text-gray-600 dark:text-zinc-400">{u.username}</td>
                      <td className="p-2.5 uppercase font-bold text-[10px]">{u.role}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                          {u.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Hardware & Backup */}
      {activeTab === 'hardware' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Hardware status */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Status Perangkat Hardware
            </h3>
            <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Timbangan Digital (BLE)</h4>
                  <p className="text-[11px] text-gray-500">
                    {scaleState.isConnected ? scaleState.deviceName : 'Tidak terhubung'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={connectScale}
                className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold"
              >
                {scaleState.isConnected ? 'Terhubung' : 'Sambungkan'}
              </button>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-emerald-600" />
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Thermal Printer (ESC/POS)</h4>
                  <p className="text-[11px] text-gray-500">
                    {printerState.isConnected ? printerState.deviceName : 'Tidak terhubung'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={connectPrinter}
                className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-bold"
              >
                {printerState.isConnected ? 'Terhubung' : 'Sambungkan'}
              </button>
            </div>
          </div>

          {/* Backup & Storage */}
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-gray-900 dark:text-white">
              Penyimpanan & Cadangan Data
            </h3>
            <p className="text-xs text-gray-500">
              Aplikasi ini dilengkapi penyimpanan lokal IndexedDB yang aman untuk operasional di lapangan saat sinyal tidak stabil.
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Unduh Cadangan JSON (Backup)
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                className="w-full py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 font-semibold text-xs hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Bersihkan Cache Antrean Lokal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
