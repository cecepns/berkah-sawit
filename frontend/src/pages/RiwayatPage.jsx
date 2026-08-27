import React, { useState, useEffect, useCallback } from 'react';
import { request } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { SearchInput } from '../components/common/SearchInput';
import { Pagination } from '../components/common/Pagination';
import { ReceiptModal } from '../components/modals/ReceiptModal';
import { EditTransactionModal } from '../components/modals/EditTransactionModal';
import { CancelTransactionModal } from '../components/modals/CancelTransactionModal';
import { useAuth } from '../context/AuthContext';
import {
  History,
  Printer,
  Edit,
  Trash2,
  Calendar,
  Truck,
  Filter,
  CheckCircle2,
  Ban,
  Clock,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const RiwayatPage = () => {
  const { isAdmin } = useAuth();

  // Query & Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // 'today', 'yesterday', 'all', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Data & State
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  // Modals
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search,
        status: statusFilter,
      };

      if (dateFilter === 'today') params.date = 'today';
      else if (dateFilter === 'yesterday') params.date = 'yesterday';
      else if (dateFilter === 'custom') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }

      const res = await request.get(API_ENDPOINTS.TRANSACTIONS.LIST, params);
      if (res.success) {
        setTransactions(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch transactions from server, showing sample/cached', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, dateFilter, startDate, endDate, statusFilter]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleEditSave = async (id, updatedData) => {
    const res = await request.put(API_ENDPOINTS.TRANSACTIONS.UPDATE(id), updatedData);
    if (res.success) {
      fetchTransactions();
    }
  };

  const handleConfirmCancel = async (id, reason) => {
    const res = await request.post(API_ENDPOINTS.TRANSACTIONS.CANCEL(id), { cancel_reason: reason });
    if (res.success) {
      toast.success('Tiket transaksi dibatalkan');
      fetchTransactions();
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Riwayat Timbangan
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Daftar seluruh tiket penimbangan TBS yang tercatat
          </p>
        </div>

        <button
          type="button"
          onClick={fetchTransactions}
          disabled={loading}
          className="p-2 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1.5 transition-colors self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="🔍 Cari tiket, supplier, nopol, sopir, atau asal..."
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-gray-800 dark:text-zinc-200"
            >
              <option value="all">Status: Semua</option>
              <option value="completed">Status: Selesai</option>
              <option value="cancelled">Status: Dibatalkan</option>
            </select>
          </div>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-100 dark:border-zinc-800 text-xs">
          <span className="text-gray-400 font-semibold mr-1">Filter Waktu:</span>
          {[
            { id: 'all', label: 'Semua' },
            { id: 'today', label: 'Hari Ini' },
            { id: 'yesterday', label: 'Kemarin' },
            { id: 'custom', label: 'Rentang Tanggal' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setDateFilter(tab.id);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                dateFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {dateFilter === 'custom' && (
            <div className="flex items-center gap-1.5 ml-auto">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs"
              />
              <span>s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs"
              />
            </div>
          )}
        </div>
      </div>

      {/* Transactions List Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl text-center text-gray-500 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
            <p className="text-xs font-semibold">Memuat riwayat transaksi...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-10 rounded-2xl border border-gray-100 dark:border-zinc-800 text-center space-y-2">
            <History className="w-10 h-10 mx-auto text-gray-300 dark:text-zinc-600" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-zinc-300">
              Belum ada data timbangan
            </h3>
            <p className="text-xs text-gray-400">
              Transaksi yang Anda simpan akan muncul di sini.
            </p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isCancelled = tx.status === 'cancelled';
            return (
              <div
                key={tx.id || tx.ticket_number}
                className={`bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border shadow-sm transition-all hover:shadow-md ${
                  isCancelled
                    ? 'border-red-200 dark:border-red-950/40 bg-red-50/20'
                    : 'border-gray-100 dark:border-zinc-800'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-zinc-800/80">
                  {/* Ticket & Sortasi */}
                  <div className="flex items-center gap-2.5">
                    <span className="text-base sm:text-lg font-mono font-extrabold text-gray-900 dark:text-white">
                      {tx.ticket_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isCancelled
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {isCancelled ? 'Dibatalkan' : tx.sortation || 'Matang'}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {tx.transaction_date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {tx.transaction_time || '00:00'}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <h3 className="font-extrabold text-gray-900 dark:text-white text-sm">
                      {tx.supplier_name}
                    </h3>
                    {tx.supplier_do && (
                      <p className="text-gray-500 font-medium">DO/KUD: {tx.supplier_do}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-gray-600 dark:text-zinc-400">
                      <span className="flex items-center gap-1 font-mono font-bold bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                        <Truck className="w-3 h-3" />
                        {tx.plate_number}
                      </span>
                      <span>Sopir: <strong>{tx.driver_name}</strong></span>
                    </div>
                  </div>

                  {/* Numbers */}
                  <div className="sm:text-right flex flex-col justify-center">
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {Number(tx.clean_kg || 0).toLocaleString('id-ID')} KG
                    </span>
                    <span className="text-sm font-extrabold font-mono text-gray-900 dark:text-white">
                      Rp {Number(tx.total_price || 0).toLocaleString('id-ID')}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      (Gross: {Number(tx.gross_kg).toLocaleString('id-ID')} - Tare: {Number(tx.tare_kg).toLocaleString('id-ID')} - Pot: {tx.deduction_percent}%)
                    </span>
                  </div>
                </div>

                {/* Cancel Reason Warning */}
                {isCancelled && tx.cancel_reason && (
                  <div className="mb-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
                    <Ban className="w-4 h-4 shrink-0" />
                    <span><strong>Alasan Dibatalkan:</strong> {tx.cancel_reason}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-400">
                    Operator: {tx.operator_name || 'Operator'}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Nota Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTransaction(tx);
                        setShowReceiptModal(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Nota
                    </button>

                    {/* Edit Button (Admin / if not cancelled) */}
                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setShowEditModal(true);
                        }}
                        className="p-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                        title="Edit Data Transaksi"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete / Cancel Button */}
                    {!isCancelled && isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setShowCancelModal(true);
                        }}
                        className="p-1.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Batalkan Transaksi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        limit={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
      />

      {/* Modals */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={selectedTransaction}
      />

      <EditTransactionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        transaction={selectedTransaction}
        onSave={handleEditSave}
      />

      <CancelTransactionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        transaction={selectedTransaction}
        onConfirmCancel={handleConfirmCancel}
      />
    </div>
  );
};
