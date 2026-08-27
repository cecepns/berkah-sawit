import React, { useState, useEffect, useCallback } from 'react';
import { request } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { StatCard } from '../components/common/StatCard';
import { useSettings } from '../context/SettingsContext';
import {
  BarChart3,
  Calendar,
  Download,
  FileSpreadsheet,
  Printer,
  Scale,
  DollarSign,
  TrendingUp,
  Truck,
  Users,
  PieChart,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

export const LaporanPage = () => {
  const { settings } = useSettings();

  const [dateRangeType, setDateRangeType] = useState('today'); // 'today', 'this_month', 'custom'
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'suppliers', 'sortations', 'vehicles'

  const [summaryData, setSummaryData] = useState(null);
  const [suppliersData, setSuppliersData] = useState([]);
  const [driversData, setDriversData] = useState([]);
  const [vehiclesData, setVehiclesData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set default dates according to filter
  const handleRangeChange = (type) => {
    setDateRangeType(type);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (type === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(firstDay);
      setEndDate(todayStr);
    }
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.REPORTS.PERIOD, { startDate, endDate });
      if (res.success && res.data) {
        setSummaryData(res.data.summary || {});
        setSuppliersData(res.data.bySupplier || []);
        setDriversData(res.data.byDriver || []);
        setVehiclesData(res.data.byVehicle || []);
      }
    } catch (e) {
      console.warn('Failed to fetch period reports:', e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Export to Excel (.xlsx)
  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Sheet Ringkasan
      const summaryRows = [
        ['LAPORAN REKAPITULASI PEMBELIAN TBS KELAPA SAWIT'],
        [settings.ram_name || 'RAM BERKAH SAWIT TUA'],
        [`Periode: ${startDate} s/d ${endDate}`],
        [],
        ['Parameter', 'Nilai'],
        ['Total Transaksi', summaryData?.total_trans || 0],
        ['Total Gross (KG)', summaryData?.gross_kg || 0],
        ['Total Tare (KG)', summaryData?.tare_kg || 0],
        ['Total Netto (KG)', summaryData?.netto_kg || 0],
        ['Total Potongan (KG)', summaryData?.deduction_kg || 0],
        ['Total Bersih (KG)', summaryData?.clean_kg || 0],
        ['Total Pembelian (Rp)', summaryData?.total_price || 0],
        ['Rata-rata Harga / KG', summaryData?.avg_price || 0],
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');

      // 2. Sheet Per Supplier
      if (suppliersData.length > 0) {
        const supplierRows = [
          ['No', 'Nama Supplier', 'DO / KUD', 'Jumlah Transaksi', 'Gross (KG)', 'Netto (KG)', 'Potongan (KG)', 'Bersih (KG)', 'Total (Rp)'],
          ...suppliersData.map((s, idx) => [
            idx + 1,
            s.supplier_name,
            s.supplier_do || '-',
            s.total_trans,
            Number(s.gross_kg),
            Number(s.netto_kg),
            Number(s.deduction_kg),
            Number(s.clean_kg),
            Number(s.total_price),
          ]),
        ];
        const wsSup = XLSX.utils.aoa_to_sheet(supplierRows);
        XLSX.utils.book_append_sheet(wb, wsSup, 'Per Supplier');
      }

      // 3. Sheet Per Kendaraan
      if (vehiclesData.length > 0) {
        const vehRows = [
          ['No', 'Nomor Polisi', 'Jumlah Transaksi', 'Total Bersih (KG)', 'Total Pembelian (Rp)'],
          ...vehiclesData.map((v, idx) => [
            idx + 1,
            v.plate_number,
            v.total_trans,
            Number(v.clean_kg),
            Number(v.total_price),
          ]),
        ];
        const wsVeh = XLSX.utils.aoa_to_sheet(vehRows);
        XLSX.utils.book_append_sheet(wb, wsVeh, 'Per Kendaraan');
      }

      XLSX.writeFile(wb, `Laporan_RAM_${startDate}_sd_${endDate}.xlsx`);
      toast.success('Laporan Excel berhasil diunduh');
    } catch (e) {
      toast.error('Gagal export excel: ' + e.message);
    }
  };

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(14);
      doc.text(settings.ram_name || 'RAM BERKAH SAWIT TUA', 14, 15);
      doc.setFontSize(10);
      doc.text(`Laporan Penimbangan TBS Sawit - Periode: ${startDate} s/d ${endDate}`, 14, 22);

      // Summary Table
      doc.autoTable({
        startY: 28,
        head: [['Total Transaksi', 'Total Gross (KG)', 'Netto (KG)', 'Bersih (KG)', 'Total Nilai (Rp)']],
        body: [
          [
            summaryData?.total_trans || 0,
            Number(summaryData?.gross_kg || 0).toLocaleString('id-ID'),
            Number(summaryData?.netto_kg || 0).toLocaleString('id-ID'),
            Number(summaryData?.clean_kg || 0).toLocaleString('id-ID'),
            'Rp ' + Number(summaryData?.total_price || 0).toLocaleString('id-ID'),
          ],
        ],
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] },
      });

      // Suppliers Table
      if (suppliersData.length > 0) {
        doc.text('Rincian Pasokan Per Supplier', 14, doc.lastAutoTable.finalY + 10);
        doc.autoTable({
          startY: doc.lastAutoTable.finalY + 14,
          head: [['No', 'Supplier', 'DO/KUD', 'Trx', 'Bersih (KG)', 'Total (Rp)']],
          body: suppliersData.map((s, idx) => [
            idx + 1,
            s.supplier_name,
            s.supplier_do || '-',
            s.total_trans,
            Number(s.clean_kg).toLocaleString('id-ID'),
            'Rp ' + Number(s.total_price).toLocaleString('id-ID'),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [24, 24, 27] },
        });
      }

      doc.save(`Laporan_RAM_${startDate}_sd_${endDate}.pdf`);
      toast.success('Laporan PDF berhasil diunduh');
    } catch (e) {
      toast.error('Gagal export PDF: ' + e.message);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header & Date Filter */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Laporan & Rekapitulasi RAM
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Analisis volume timbangan, potongan, dan total perputaran dana
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={exportToExcel}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button
            type="button"
            onClick={exportToPDF}
            className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="p-2 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300"
            title="Cetak Halaman"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-xs">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'this_month', label: 'Bulan Ini' },
            { id: 'custom', label: 'Pilih Periode' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleRangeChange(r.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                dateRangeType === r.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setDateRangeType('custom');
            }}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-semibold"
          />
          <span className="text-gray-400 font-bold">s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setDateRangeType('custom');
            }}
            className="px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-semibold"
          />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Total Transaksi"
          value={summaryData?.total_trans || 0}
          subtitle="Tiket Timbangan"
          icon={BarChart3}
          color="emerald"
        />
        <StatCard
          title="Total Berat Bersih"
          value={`${Number(summaryData?.clean_kg || 0).toLocaleString('id-ID')} KG`}
          subtitle={`Gross: ${Number(summaryData?.gross_kg || 0).toLocaleString('id-ID')} KG`}
          icon={Scale}
          color="blue"
        />
        <StatCard
          title="Total Pembelian"
          value={`Rp ${Number(summaryData?.total_price || 0).toLocaleString('id-ID')}`}
          subtitle="Nilai Pembayaran TBS"
          icon={DollarSign}
          color="amber"
        />
        <StatCard
          title="Rata-rata Harga"
          value={`Rp ${Number(summaryData?.avg_price || 0).toLocaleString('id-ID')}`}
          subtitle="Per Kilogram TBS"
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Detailed Aggregation Tabs */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/40 text-xs font-bold">
          {[
            { id: 'summary', label: 'Ringkasan Rinci', icon: BarChart3 },
            { id: 'suppliers', label: 'Per Supplier', icon: Users },
            { id: 'vehicles', label: 'Per Kendaraan / Sopir', icon: Truck },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 transition-all ${
                activeTab === tab.id
                  ? 'border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-zinc-900'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'summary' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-xl space-y-2.5">
                <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Rincian Penimbangan (KG)
                </h3>
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-zinc-700">
                  <span className="text-gray-500">Gross (Kotor):</span>
                  <span className="font-mono font-bold">{Number(summaryData?.gross_kg || 0).toLocaleString('id-ID')} KG</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-zinc-700">
                  <span className="text-gray-500">Tare (Kendaraan):</span>
                  <span className="font-mono font-bold">{Number(summaryData?.tare_kg || 0).toLocaleString('id-ID')} KG</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-zinc-700">
                  <span className="text-gray-500">Netto:</span>
                  <span className="font-mono font-bold">{Number(summaryData?.netto_kg || 0).toLocaleString('id-ID')} KG</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-zinc-700">
                  <span className="text-gray-500">Total Potongan:</span>
                  <span className="font-mono font-bold text-amber-600">{Number(summaryData?.deduction_kg || 0).toLocaleString('id-ID')} KG</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  <span>Total Bersih:</span>
                  <span className="font-mono">{Number(summaryData?.clean_kg || 0).toLocaleString('id-ID')} KG</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-zinc-800/40 rounded-xl space-y-2.5">
                <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Rincian Keuangan
                </h3>
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-zinc-700">
                  <span className="text-gray-500">Total Transaksi Selesai:</span>
                  <span className="font-mono font-bold">{summaryData?.total_trans || 0} Tiket</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-200 dark:border-zinc-700">
                  <span className="text-gray-500">Rata-rata Harga / KG:</span>
                  <span className="font-mono font-bold">Rp {Number(summaryData?.avg_price || 0).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-gray-900 dark:text-white text-sm">
                  <span>Total Nilai Pembelian:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    Rp {Number(summaryData?.total_price || 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-2.5">Supplier / Mitra</th>
                    <th className="p-2.5">DO / KUD</th>
                    <th className="p-2.5 text-center">Trx</th>
                    <th className="p-2.5 text-right">Gross (KG)</th>
                    <th className="p-2.5 text-right">Bersih (KG)</th>
                    <th className="p-2.5 text-right">Total Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                  {suppliersData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-gray-400">
                        Tidak ada data untuk periode ini.
                      </td>
                    </tr>
                  ) : (
                    suppliersData.map((s, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                        <td className="p-2.5 font-bold text-gray-900 dark:text-white">{s.supplier_name}</td>
                        <td className="p-2.5 text-gray-500">{s.supplier_do || '-'}</td>
                        <td className="p-2.5 text-center font-mono font-bold">{s.total_trans}</td>
                        <td className="p-2.5 text-right font-mono">{Number(s.gross_kg).toLocaleString('id-ID')}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(s.clean_kg).toLocaleString('id-ID')}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-gray-900 dark:text-white">
                          Rp {Number(s.total_price).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vehicles */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Rekap Armada (No Polisi)
                </h3>
                <div className="overflow-x-auto border border-gray-100 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2">No Polisi</th>
                        <th className="p-2 text-center">Trx</th>
                        <th className="p-2 text-right">Bersih (KG)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                      {vehiclesData.map((v, i) => (
                        <tr key={i}>
                          <td className="p-2 font-mono font-bold text-gray-900 dark:text-white">{v.plate_number}</td>
                          <td className="p-2 text-center font-mono">{v.total_trans}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600">{Number(v.clean_kg).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Drivers */}
              <div>
                <h3 className="text-xs font-bold text-gray-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Rekap Sopir
                </h3>
                <div className="overflow-x-auto border border-gray-100 dark:border-zinc-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-zinc-800 text-gray-500 uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-2">Nama Sopir</th>
                        <th className="p-2 text-center">Trx</th>
                        <th className="p-2 text-right">Bersih (KG)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                      {driversData.map((d, i) => (
                        <tr key={i}>
                          <td className="p-2 font-bold text-gray-900 dark:text-white">{d.driver_name}</td>
                          <td className="p-2 text-center font-mono">{d.total_trans}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600">{Number(d.clean_kg).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
