import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncSelect from 'react-select/async';
import { useSettings } from '../context/SettingsContext';
import { useHardware } from '../context/HardwareContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { request } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import {
  saveFormDraft,
  getFormDraft,
  clearFormDraft,
  saveLocalTransaction,
  cacheSuppliers,
  getCachedSuppliers,
} from '../services/offlineDb';
import {
  Scale,
  Printer,
  Users,
  Truck,
  MapPin,
  Plus,
  Minus,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  User,
  Building2,
  Phone,
} from 'lucide-react';
import { BluetoothScaleModal } from '../components/modals/BluetoothScaleModal';
import { SupplierModal } from '../components/modals/SupplierModal';
import { ReceiptModal } from '../components/modals/ReceiptModal';
import toast from 'react-hot-toast';

export const TimbangPage = () => {
  const { settings } = useSettings();
  const { isOnline, scaleState, printerState, printReceipt } = useHardware();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // Form State
  const [ticketNumber, setTicketNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierDo, setSupplierDo] = useState('');
  const [driverName, setDriverName] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [origin, setOrigin] = useState('');
  const [block, setBlock] = useState('');

  // Weighing & Pricing State
  const [grossKg, setGrossKg] = useState('');
  const [tareKg, setTareKg] = useState('0');
  const [sortation, setSortation] = useState('Matang');
  const [deductionPercent, setDeductionPercent] = useState(0);
  const [pricePerKg, setPricePerKg] = useState(2650);
  const [loadingFeePerKg, setLoadingFeePerKg] = useState(10);
  const [notes, setNotes] = useState('');

  // Master Lists for Autocomplete & Dropdowns
  const [suppliers, setSuppliers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [sortations, setSortations] = useState([
    { name: 'Matang', default_deduction_percent: 0 },
    { name: 'Mengkal', default_deduction_percent: 3 },
    { name: 'Mentah', default_deduction_percent: 5 },
    { name: 'Lewat Matang', default_deduction_percent: 3 },
    { name: 'Busuk', default_deduction_percent: 10 },
    { name: 'Brondolan', default_deduction_percent: 1 },
    { name: 'Campuran', default_deduction_percent: 3 },
  ]);

  // UI Modals & Loading
  const [submitting, setSubmitting] = useState(false);
  const [showScaleModal, setShowScaleModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectKey, setSelectKey] = useState(0);

  // Derived Calculations
  const gross = parseFloat(grossKg) || 0;
  const tare = parseFloat(tareKg) || 0;
  const netto = Math.max(0, gross - tare);
  const pct = parseFloat(deductionPercent) || 0;
  const deductionKg = Math.round(((netto * pct) / 100) * 100) / 100;
  const cleanKg = Math.max(0, Math.round((netto - deductionKg) * 100) / 100);
  const price = parseFloat(pricePerKg) || 0;
  const loadingFeeRate = parseFloat(loadingFeePerKg) || 0;
  const loadingFee = Math.round(netto * loadingFeeRate);
  const grossTotal = Math.round(cleanKg * price);
  const totalPrice = Math.max(0, grossTotal - loadingFee);

  // Fetch Ticket Number, Masters & Today's Price
  const generateTicket = async () => {
    try {
      const res = await request.get(API_ENDPOINTS.TRANSACTIONS.NEXT_TICKET);
      if (res.success && res.ticketNumber) {
        setTicketNumber(res.ticketNumber);
        return;
      }
    } catch {
      // Fallback local ticket generator
      const prefix = settings.ticket_prefix || 'BST';
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const randSeq = String(Math.floor(Math.random() * 900) + 100);
      setTicketNumber(`${prefix}-${yy}${mm}${dd}-${randSeq}`);
    }
  };

  const fetchMasterData = async () => {
    // 1. Suppliers
    try {
      const supRes = await request.get(API_ENDPOINTS.SUPPLIERS.LIST, { limit: 100 });
      if (supRes.success && supRes.data) {
        setSuppliers(supRes.data);
        await cacheSuppliers(supRes.data);
      }
    } catch {
      const cached = await getCachedSuppliers();
      if (cached && cached.length > 0) setSuppliers(cached);
    }

    // 2. Today Price & Default Loading Fee
    try {
      const priceRes = await request.get(API_ENDPOINTS.PRICES.TODAY);
      if (priceRes.success && priceRes.price_per_kg) {
        setPricePerKg(priceRes.price_per_kg);
      }
    } catch {
      if (settings.default_price) setPricePerKg(settings.default_price);
    }

    if (settings.default_loading_fee !== undefined) {
      setLoadingFeePerKg(settings.default_loading_fee);
    }

    // 3. Autocomplete Drivers & Vehicles
    try {
      const [drvRes, vehRes, sortRes] = await Promise.allSettled([
        request.get(API_ENDPOINTS.DRIVERS.LIST),
        request.get(API_ENDPOINTS.VEHICLES.LIST),
        request.get(API_ENDPOINTS.SORTATIONS.LIST),
      ]);
      if (drvRes.status === 'fulfilled' && drvRes.value?.data) setDrivers(drvRes.value.data);
      if (vehRes.status === 'fulfilled' && vehRes.value?.data) setVehicles(vehRes.value.data);
      if (sortRes.status === 'fulfilled' && sortRes.value?.data?.length > 0) setSortations(sortRes.value.data);
    } catch {
      // Ignore
    }
  };

  // Initial Load & Draft Recovery
  useEffect(() => {
    generateTicket();
    fetchMasterData();

    // Check draft
    getFormDraft().then((draft) => {
      if (draft && draft.grossKg) {
        setSupplierId(draft.supplierId || '');
        setSupplierName(draft.supplierName || '');
        setSupplierDo(draft.supplierDo || '');
        setDriverName(draft.driverName || '');
        setPlateNumber(draft.plateNumber || '');
        setOrigin(draft.origin || '');
        setBlock(draft.block || '');
        setGrossKg(draft.grossKg || '');
        setTareKg(draft.tareKg || '0');
        setSortation(draft.sortation || 'Matang');
        setDeductionPercent(draft.deductionPercent || 0);
        if (draft.pricePerKg) setPricePerKg(draft.pricePerKg);
        if (draft.loadingFeePerKg !== undefined) setLoadingFeePerKg(draft.loadingFeePerKg);
        toast('Melanjutkan draf timbangan sebelumnya');
      }
    });
  }, []);

  // Auto-Save Draft on Change
  useEffect(() => {
    if (grossKg || supplierName || plateNumber) {
      saveFormDraft({
        supplierId,
        supplierName,
        supplierDo,
        driverName,
        plateNumber,
        origin,
        block,
        grossKg,
        tareKg,
        sortation,
        deductionPercent,
        pricePerKg,
        loadingFeePerKg,
      });
    }
  }, [supplierId, supplierName, supplierDo, driverName, plateNumber, origin, block, grossKg, tareKg, sortation, deductionPercent, pricePerKg, loadingFeePerKg]);

  // Async Supplier Options Loader (Search by API with Offline Cache fallback)
  const loadSupplierOptions = useCallback(async (inputValue) => {
    try {
      const res = await request.get(API_ENDPOINTS.SUPPLIERS.LIST, {
        search: inputValue || '',
        limit: 50,
      });
      if (res.success && res.data) {
        return res.data.map((s) => ({
          value: s.id,
          label: s.name,
          supplier: s,
        }));
      }
      return [];
    } catch {
      const cached = await getCachedSuppliers();
      if (cached && cached.length > 0) {
        const query = (inputValue || '').toLowerCase().trim();
        const filtered = query
          ? cached.filter(
              (s) =>
                (s.name && s.name.toLowerCase().includes(query)) ||
                (s.do_name && s.do_name.toLowerCase().includes(query)) ||
                (s.village && s.village.toLowerCase().includes(query)) ||
                (s.supplier_code && s.supplier_code.toLowerCase().includes(query))
            )
          : cached;
        return filtered.map((s) => ({
          value: s.id,
          label: s.name,
          supplier: s,
        }));
      }
      return [];
    }
  }, []);

  // Default options for react-select initial dropdown
  const defaultSupplierOptions = useMemo(() => {
    return suppliers.map((s) => ({
      value: s.id,
      label: s.name,
      supplier: s,
    }));
  }, [suppliers]);

  // Current selected option for AsyncSelect
  const currentSupplierOption = useMemo(() => {
    if (!supplierId && !supplierName) return null;
    const match = suppliers.find((s) => String(s.id) === String(supplierId));
    if (match) {
      return {
        value: match.id,
        label: match.name,
        supplier: match,
      };
    }
    if (supplierName) {
      return {
        value: supplierId || 'custom',
        label: supplierName,
        supplier: {
          id: supplierId || null,
          name: supplierName,
          do_name: supplierDo,
        },
      };
    }
    return null;
  }, [supplierId, supplierName, supplierDo, suppliers]);

  // Handle Supplier Selection from AsyncSelect
  const handleSelectSupplierOption = (option) => {
    if (!option) {
      setSupplierId('');
      setSupplierName('');
      setSupplierDo('');
      return;
    }

    const selected = option.supplier;
    if (selected) {
      setSupplierId(selected.id || '');
      setSupplierName(selected.name || option.label);
      setSupplierDo(selected.do_name || '');
      if (selected.village && !origin) {
        setOrigin(`Desa ${selected.village}`);
      }
    } else {
      setSupplierId(option.value || '');
      setSupplierName(option.label || '');
    }
  };

  // Handle Sortation Change
  const handleSortationChange = (val) => {
    setSortation(val);
    const found = sortations.find((s) => s.name === val);
    if (found && found.default_deduction_percent !== undefined) {
      setDeductionPercent(Number(found.default_deduction_percent));
    }
  };

  // Adjust Deduction Stepper
  const handleAdjustDeduction = (delta) => {
    setDeductionPercent((prev) => Math.max(0, Math.min(100, Math.round((Number(prev) + delta) * 10) / 10)));
  };

  // Reset Form
  const handleReset = async () => {
    await clearFormDraft();
    setSupplierId('');
    setSupplierName('');
    setSupplierDo('');
    setDriverName('');
    setPlateNumber('');
    setOrigin('');
    setBlock('');
    setGrossKg('');
    setTareKg('0');
    setSortation('Matang');
    setDeductionPercent(0);
    setNotes('');
    setSelectKey((prev) => prev + 1);
    generateTicket();
    toast.success('Formulir timbangan direset');
  };

  // Submit Transaction & Print Receipt
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Validations
    if (!supplierName.trim()) {
      toast.error('Supplier wajib dipilih atau diisi!');
      return;
    }
    if (!driverName.trim()) {
      toast.error('Nama Sopir wajib diisi!');
      return;
    }
    if (!plateNumber.trim()) {
      toast.error('Nomor Polisi kendaraan wajib diisi!');
      return;
    }
    if (gross <= 0) {
      toast.error('Gross (berat kotor) harus lebih besar dari 0!');
      return;
    }
    if (gross < tare) {
      toast.error('Tare (berat kendaraan) tidak boleh lebih besar dari Gross!');
      return;
    }

    setSubmitting(true);

    const now = new Date();
    const transPayload = {
      ticket_number: ticketNumber,
      supplier_id: supplierId || null,
      supplier_name: supplierName,
      supplier_do: supplierDo || null,
      driver_name: driverName,
      plate_number: plateNumber.toUpperCase(),
      origin: origin || null,
      block: block || null,
      gross_kg: gross,
      tare_kg: tare,
      netto_kg: netto,
      sortation: sortation,
      deduction_percent: pct,
      deduction_kg: deductionKg,
      clean_kg: cleanKg,
      price_per_kg: price,
      loading_fee_per_kg: loadingFeeRate,
      loading_fee: loadingFee,
      total_price: totalPrice,
      transaction_date: now.toISOString().split('T')[0],
      transaction_time: now.toTimeString().split(' ')[0].slice(0, 5),
      operator_id: user?.id || 1,
      operator_name: user?.name || 'Operator',
      notes: notes || null,
      status: 'completed',
    };

    try {
      if (isOnline) {
        const res = await request.post(API_ENDPOINTS.TRANSACTIONS.CREATE, transPayload);
        if (res.success) {
          toast.success('Transaksi Berhasil Disimpan!');
        }
      } else {
        // Save Offline to IndexedDB
        await saveLocalTransaction({ ...transPayload, sync_status: 'pending' });
        toast.success('Transaksi Disimpan di Memori Offline!');
      }

      // Clear draft & set completed
      await clearFormDraft();
      setCompletedTransaction(transPayload);
      setShowReceiptModal(true);

      // Auto-trigger Bluetooth Print if connected
      if (printerState.isConnected) {
        printReceipt(transPayload, 'bluetooth');
      }

      // Reset for next transaction
      setGrossKg('');
      setTareKg('0');
      setDeductionPercent(0);
      generateTicket();
    } catch {
      // If server error, fallback to offline store
      await saveLocalTransaction({ ...transPayload, sync_status: 'pending' });
      toast.success('Tersimpan di antrean offline lokal');
      setCompletedTransaction(transPayload);
      setShowReceiptModal(true);
      await clearFormDraft();
      generateTicket();
    } finally {
      setSubmitting(false);
    }
  };

  // Custom React Select Styling for Dark / Light mode
  const customSelectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: '42px',
        backgroundColor: isDark ? '#18181b' : '#ffffff',
        borderColor: state.isFocused
          ? '#10b981'
          : isDark
          ? '#27272a'
          : '#e5e7eb',
        borderRadius: '0.75rem',
        boxShadow: state.isFocused ? '0 0 0 2px rgba(16, 185, 129, 0.2)' : 'none',
        '&:hover': {
          borderColor: '#10b981',
        },
        cursor: 'pointer',
        padding: '0 4px',
        fontSize: '0.875rem',
        fontWeight: '600',
      }),
      menu: (base) => ({
        ...base,
        backgroundColor: isDark ? '#18181b' : '#ffffff',
        borderRadius: '0.75rem',
        border: `1px solid ${isDark ? '#27272a' : '#e5e7eb'}`,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        zIndex: 50,
        overflow: 'hidden',
      }),
      menuList: (base) => ({
        ...base,
        padding: '6px',
        maxHeight: '260px',
      }),
      option: (base, state) => ({
        ...base,
        backgroundColor: state.isSelected
          ? '#059669'
          : state.isFocused
          ? isDark
            ? '#27272a'
            : '#f3f4f6'
          : 'transparent',
        color: state.isSelected ? '#ffffff' : isDark ? '#f4f4f5' : '#111827',
        borderRadius: '0.5rem',
        padding: '8px 12px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        '&:active': {
          backgroundColor: '#059669',
          color: '#ffffff',
        },
      }),
      singleValue: (base) => ({
        ...base,
        color: isDark ? '#f4f4f5' : '#111827',
        fontWeight: '600',
        fontSize: '0.875rem',
      }),
      input: (base) => ({
        ...base,
        color: isDark ? '#f4f4f5' : '#111827',
        fontSize: '0.875rem',
        fontWeight: '500',
      }),
      placeholder: (base) => ({
        ...base,
        color: isDark ? '#71717a' : '#9ca3af',
        fontSize: '0.875rem',
        fontWeight: '500',
      }),
      noOptionsMessage: (base) => ({
        ...base,
        color: isDark ? '#a1a1aa' : '#6b7280',
        fontSize: '0.875rem',
        padding: '12px',
      }),
      loadingMessage: (base) => ({
        ...base,
        color: isDark ? '#a1a1aa' : '#6b7280',
        fontSize: '0.875rem',
        padding: '12px',
      }),
      indicatorSeparator: (base) => ({
        ...base,
        backgroundColor: isDark ? '#27272a' : '#e5e7eb',
      }),
      dropdownIndicator: (base, state) => ({
        ...base,
        color: state.isFocused ? '#10b981' : isDark ? '#71717a' : '#9ca3af',
        '&:hover': {
          color: '#10b981',
        },
      }),
      clearIndicator: (base) => ({
        ...base,
        color: isDark ? '#71717a' : '#9ca3af',
        '&:hover': {
          color: '#ef4444',
        },
      }),
    }),
    [isDark]
  );

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Ticket & BT Scale Header Card */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-widest block">
            NO TIKET PENIMBANGAN
          </span>
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{ticketNumber || 'BST-XXXXXX-XXXX'}</span>
            <button
              type="button"
              onClick={generateTicket}
              className="p-1 text-gray-400 hover:text-emerald-600 rounded-lg transition-colors"
              title="Generate nomor tiket baru"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 font-medium">
            {new Intl.DateTimeFormat('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }).format(new Date())}
          </p>
        </div>

        {/* BT Scale Shortcut */}
        <button
          type="button"
          onClick={() => setShowScaleModal(true)}
          className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            scaleState.isConnected
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : 'bg-zinc-900 hover:bg-black dark:bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>
            {scaleState.isConnected
              ? `LIVE: ${Number(scaleState.weight).toLocaleString('id-ID')} KG`
              : 'BT SCALE'}
          </span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CARD 1: DATA PENGIRIM */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-3.5">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-2.5">
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
              <Users className="w-4 h-4 text-emerald-600" />
              Data Pengirim / Supplier
            </h2>
            <button
              type="button"
              onClick={() => setShowSupplierModal(true)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Supplier
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Supplier React-Select with API Search */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Nama Supplier / DO *
              </label>
              <AsyncSelect
                key={selectKey}
                cacheOptions
                defaultOptions={defaultSupplierOptions}
                loadOptions={loadSupplierOptions}
                value={currentSupplierOption}
                onChange={handleSelectSupplierOption}
                placeholder="Ketik untuk cari supplier dari server..."
                noOptionsMessage={({ inputValue }) =>
                  inputValue ? `Tidak ada supplier "${inputValue}"` : 'Ketik nama supplier untuk mencari'
                }
                loadingMessage={() => 'Mencari supplier...'}
                isClearable
                styles={customSelectStyles}
                formatOptionLabel={(option) => {
                  const s = option.supplier;
                  return (
                    <div className="flex flex-col py-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm">{option.label}</span>
                        {s?.supplier_code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded">
                            {s.supplier_code}
                          </span>
                        )}
                      </div>
                      {(s?.do_name || s?.village || s?.phone) && (
                        <div className="flex items-center flex-wrap gap-2 text-xs opacity-75 mt-0.5">
                          {s?.do_name && (
                            <span className="flex items-center gap-1 font-medium">
                              <Building2 className="w-3 h-3" />
                              DO: {s.do_name}
                            </span>
                          )}
                          {s?.village && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {s.village}
                            </span>
                          )}
                          {s?.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3" />
                              {s.phone}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }}
              />
            </div>

            {/* Custom Supplier DO / KUD */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Keterangan DO / KUD
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={supplierDo}
                  onChange={(e) => setSupplierDo(e.target.value)}
                  placeholder="KUD Makmur / DO Mandiri..."
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
            </div>

            {/* Sopir */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Nama Sopir *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  list="driver-list"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nama sopir armada"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
              <datalist id="driver-list">
                {drivers.map((d, i) => (
                  <option key={i} value={d.name} />
                ))}
              </datalist>
            </div>

            {/* No Polisi */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Nomor Polisi Kendaraan *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  list="vehicle-list"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                  placeholder="KH 1234 AB / BG 8765 EA"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-mono font-bold text-gray-900 dark:text-white uppercase focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <Truck className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              </div>
              <datalist id="vehicle-list">
                {vehicles.map((v, i) => (
                  <option key={i} value={v.plate_number} />
                ))}
              </datalist>
            </div>

            {/* Asal Kebun / Blok */}
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Asal Kebun / Blok Lokasi (Opsional)
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Blok A12, Desa Air Paku, Keban Agung..."
                    className="w-full pl-9 pr-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                </div>
                <input
                  type="text"
                  value={block}
                  onChange={(e) => setBlock(e.target.value)}
                  placeholder="Blok / Afdeling"
                  className="w-32 px-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CARD 2: DATA TIMBANGAN */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-2.5">
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
              <Scale className="w-4 h-4 text-emerald-600" />
              Data Timbangan (KG)
            </h2>
            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              SATUAN KG
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Gross Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                  GROSS (Kotor) *
                </label>
                {scaleState.isConnected && (
                  <button
                    type="button"
                    onClick={() => setGrossKg(String(scaleState.weight))}
                    className="text-[10px] font-bold text-emerald-600 hover:underline"
                  >
                    Ambil BT
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                required
                value={grossKg}
                onChange={(e) => setGrossKg(e.target.value)}
                placeholder="5529"
                className="w-full px-3.5 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-lg font-mono font-extrabold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Tare Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-700 dark:text-zinc-300">
                  TARE (Kendaraan) *
                </label>
                {scaleState.isConnected && (
                  <button
                    type="button"
                    onClick={() => setTareKg(String(scaleState.weight))}
                    className="text-[10px] font-bold text-emerald-600 hover:underline"
                  >
                    Ambil BT
                  </button>
                )}
              </div>
              <input
                type="number"
                step="any"
                required
                value={tareKg}
                onChange={(e) => setTareKg(e.target.value)}
                placeholder="1500"
                className="w-full px-3.5 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-lg font-mono font-extrabold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Large Netto Display */}
            <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800 flex flex-col justify-center text-center sm:text-right">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
                NETTO (Gross - Tare)
              </span>
              <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                {netto.toLocaleString('id-ID')} <span className="text-sm font-sans font-bold">KG</span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: POTONGAN, SORTASI & HARGA */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/80 pb-2.5">
            <h2 className="text-sm font-extrabold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-wide">
              % Potongan, Sortasi, Harga & Biaya Bongkar
            </h2>
            <span className="text-xs font-bold text-gray-500 font-mono">
              BERSIH: {cleanKg.toLocaleString('id-ID')} KG
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Sortasi Selector */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Kategori Sortasi
              </label>
              <select
                value={sortation}
                onChange={(e) => handleSortationChange(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
              >
                {sortations.map((st, i) => (
                  <option key={i} value={st.name}>
                    {st.name} ({st.default_deduction_percent || 0}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Deduction % Stepper */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Potongan %
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleAdjustDeduction(-1)}
                  className="w-10 h-10 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 font-extrabold text-base flex items-center justify-center text-gray-700 dark:text-zinc-200 active:scale-95 transition-transform"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={deductionPercent}
                    onChange={(e) => setDeductionPercent(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-2 text-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl font-mono font-extrabold text-base text-gray-900 dark:text-white"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-gray-400">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdjustDeduction(1)}
                  className="w-10 h-10 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 font-extrabold text-base flex items-center justify-center text-gray-700 dark:text-zinc-200 active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Price / KG Input */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Harga / KG (Rupiah) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">Rp</span>
                <input
                  type="number"
                  required
                  value={pricePerKg}
                  onChange={(e) => setPricePerKg(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base font-mono font-extrabold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Loading Fee (Biaya Bongkar) / KG */}
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Biaya Bongkar / KG
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-bold text-gray-400">Rp</span>
                <input
                  type="number"
                  step="any"
                  value={loadingFeePerKg}
                  onChange={(e) => setLoadingFeePerKg(e.target.value)}
                  placeholder="10"
                  className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-base font-mono font-extrabold text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Breakdown summary pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs">
            <div className="p-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
              <span className="text-gray-500 dark:text-zinc-400 block">Potongan KG:</span>
              <span className="font-bold text-gray-900 dark:text-white font-mono">
                {deductionKg.toLocaleString('id-ID')} KG
              </span>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
              <span className="text-gray-500 dark:text-zinc-400 block">Bersih KG:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {cleanKg.toLocaleString('id-ID')} KG
              </span>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
              <span className="text-gray-500 dark:text-zinc-400 block">Biaya Bongkar:</span>
              <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                - Rp {loadingFee.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="p-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
              <span className="text-gray-500 dark:text-zinc-400 block">Sortasi:</span>
              <span className="font-bold text-gray-900 dark:text-white">{sortation}</span>
            </div>
          </div>
        </div>

        {/* CARD 4: TOTAL BERSIH BESAR */}
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-5 sm:p-6 rounded-2xl text-white shadow-xl shadow-emerald-700/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-200 block mb-1">
              TOTAL PEMBAYARAN BERSIH
            </span>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white animate-fadeIn">
              Rp {totalPrice.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-emerald-100 mt-1 font-medium">
              ({cleanKg.toLocaleString('id-ID')} kg x Rp {price.toLocaleString('id-ID')}) - Bongkar: Rp {loadingFee.toLocaleString('id-ID')} ({netto.toLocaleString('id-ID')} kg x Rp {loadingFeeRate})
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-colors"
              title="Reset Form"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 sm:flex-none px-6 py-3.5 bg-zinc-950 hover:bg-black text-white rounded-xl font-extrabold text-sm sm:text-base shadow-lg shadow-black/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Scale className="w-5 h-5" />
              )}
              <span>TIMBANG & CETAK NOTA</span>
            </button>
          </div>
        </div>
      </form>

      {/* Modals */}
      <BluetoothScaleModal
        isOpen={showScaleModal}
        onClose={() => setShowScaleModal(false)}
        onApplyWeight={(wt, target) => {
          if (target === 'gross') setGrossKg(String(wt));
          if (target === 'tare') setTareKg(String(wt));
        }}
      />

      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        onSave={async (newSup) => {
          if (isOnline) {
            const res = await request.post(API_ENDPOINTS.SUPPLIERS.CREATE, newSup);
            if (res.success && res.data) {
              toast.success('Supplier baru berhasil ditambahkan');
              fetchMasterData();
              const created = res.data;
              setSupplierId(created.id);
              setSupplierName(created.name);
              setSupplierDo(created.do_name || '');
              if (created.village && !origin) {
                setOrigin(`Desa ${created.village}`);
              }
              setSelectKey((prev) => prev + 1);
            }
          } else {
            const localSup = { id: `sup_${Date.now()}`, ...newSup };
            setSuppliers((prev) => [localSup, ...prev]);
            setSupplierId(localSup.id);
            setSupplierName(localSup.name);
            setSupplierDo(localSup.do_name || '');
            if (localSup.village && !origin) {
              setOrigin(`Desa ${localSup.village}`);
            }
            setSelectKey((prev) => prev + 1);
            toast.success('Supplier tersimpan secara lokal');
          }
        }}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={completedTransaction}
      />
    </div>
  );
};
