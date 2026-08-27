import React, { useState, useEffect, useCallback } from 'react';
import { request } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { SearchInput } from '../components/common/SearchInput';
import { Pagination } from '../components/common/Pagination';
import { SupplierModal } from '../components/modals/SupplierModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Building,
  TrendingUp,
  FileText,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SupplierPage = () => {
  const { isAdmin } = useAuth();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [suppliers, setSuppliers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  // Modals & Active states
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [deletingSupplier, setDeletingSupplier] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Supplier Detail History Modal
  const [selectedSupplierDetail, setSelectedSupplierDetail] = useState(null);
  const [supplierTransactions, setSupplierTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await request.get(API_ENDPOINTS.SUPPLIERS.LIST, { page, limit, search });
      if (res.success) {
        setSuppliers(res.data || []);
        if (res.pagination) {
          setPagination(res.pagination);
        }
      }
    } catch (e) {
      console.warn('Could not fetch suppliers:', e);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const handleSaveSupplier = async (formData) => {
    if (editingSupplier) {
      const res = await request.put(API_ENDPOINTS.SUPPLIERS.UPDATE(editingSupplier.id), formData);
      if (res.success) {
        toast.success('Data supplier berhasil diperbarui');
        fetchSuppliers();
      }
    } else {
      const res = await request.post(API_ENDPOINTS.SUPPLIERS.CREATE, formData);
      if (res.success) {
        toast.success('Supplier baru berhasil ditambahkan');
        fetchSuppliers();
      }
    }
  };

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;
    try {
      const res = await request.delete(API_ENDPOINTS.SUPPLIERS.DELETE(deletingSupplier.id));
      if (res.success) {
        toast.success('Supplier berhasil dihapus');
        setShowDeleteConfirm(false);
        setDeletingSupplier(null);
        fetchSuppliers();
      }
    } catch (e) {
      toast.error('Gagal menghapus supplier: ' + e.message);
    }
  };

  const handleViewDetail = async (supplier) => {
    setSelectedSupplierDetail(supplier);
    setLoadingTransactions(true);
    try {
      const res = await request.get(API_ENDPOINTS.SUPPLIERS.TRANSACTIONS(supplier.id), { limit: 50 });
      if (res.success) {
        setSupplierTransactions(res.data || []);
      }
    } catch {
      setSupplierTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Manajemen Supplier / Petani
          </h2>
          <p className="text-xs text-gray-500 font-medium">
            Kelola data supplier, kemitraan DO/KUD, dan riwayat pasokan TBS
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingSupplier(null);
            setShowSupplierModal(true);
          }}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" />
          Tambah Supplier
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm">
        <SearchInput
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          placeholder="🔍 Cari nama supplier, DO, kode, no hp, atau desa..."
        />
      </div>

      {/* Supplier Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full bg-white dark:bg-zinc-900 p-8 rounded-2xl text-center text-gray-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
            <p className="text-xs font-semibold">Memuat daftar supplier...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-zinc-900 p-10 rounded-2xl border border-gray-100 dark:border-zinc-800 text-center text-gray-500">
            <Users className="w-10 h-10 mx-auto text-gray-300 dark:text-zinc-600 mb-2" />
            <h3 className="text-sm font-bold text-gray-700 dark:text-zinc-300">
              Tidak ada supplier ditemukan
            </h3>
            <p className="text-xs text-gray-400">
              Klik tombol "Tambah Supplier" untuk mendaftarkan mitra baru.
            </p>
          </div>
        ) : (
          suppliers.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header Top */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono tracking-wider">
                      {s.supplier_code || `SUP-${String(s.id).padStart(3, '0')}`}
                    </span>
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                      {s.name}
                    </h3>
                    {s.do_name && (
                      <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3.5 h-3.5" />
                        DO: {s.do_name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplier(s);
                        setShowSupplierModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                      title="Edit Supplier"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingSupplier(s);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Hapus Supplier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Location & Contact */}
                <div className="space-y-1 text-xs text-gray-600 dark:text-zinc-400 mb-4">
                  {s.phone && (
                    <div className="flex items-center gap-1.5 font-medium">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      <span>{s.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{s.village || 'Tanjung Enim'}, {s.district || 'Lawang Kidul'}</span>
                  </div>
                </div>

                {/* Stats Summary Pills */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 text-center mb-4">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">
                      Transaksi
                    </span>
                    <span className="text-sm font-extrabold text-gray-900 dark:text-white font-mono">
                      {s.total_transactions || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">
                      Total Berat
                    </span>
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                      {Number(s.total_kg || 0).toLocaleString('id-ID')} <span className="text-[9px]">KG</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-bold block">
                      Pembelian
                    </span>
                    <span className="text-xs font-extrabold text-gray-900 dark:text-white font-mono truncate block">
                      Rp {Number(s.total_amount || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>

              {/* View Detail History Button */}
              <button
                type="button"
                onClick={() => handleViewDetail(s)}
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                Lihat Riwayat Pasokan
              </button>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        limit={limit}
        onPageChange={(p) => setPage(p)}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
      />

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={showSupplierModal}
        onClose={() => setShowSupplierModal(false)}
        supplier={editingSupplier}
        onSave={handleSaveSupplier}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteSupplier}
        title="Hapus Supplier"
        message={`Apakah Anda yakin ingin menghapus supplier ${deletingSupplier?.name}?`}
        confirmText="Ya, Hapus"
      />

      {/* Supplier History Detail Modal */}
      <Modal
        isOpen={!!selectedSupplierDetail}
        onClose={() => setSelectedSupplierDetail(null)}
        title={`Riwayat Pasokan: ${selectedSupplierDetail?.name || ''}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs">
            <div>
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                {selectedSupplierDetail?.name} {selectedSupplierDetail?.do_name ? `(${selectedSupplierDetail?.do_name})` : ''}
              </p>
              <p className="text-emerald-700 dark:text-emerald-400">
                Total Berat: {Number(selectedSupplierDetail?.total_kg || 0).toLocaleString('id-ID')} KG
              </p>
            </div>
            <div className="text-right font-mono font-bold text-emerald-800 dark:text-emerald-300">
              Rp {Number(selectedSupplierDetail?.total_amount || 0).toLocaleString('id-ID')}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto border border-gray-100 dark:border-zinc-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-zinc-800/80 text-gray-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">No Tiket</th>
                  <th className="p-2.5">Tanggal</th>
                  <th className="p-2.5">Nopol</th>
                  <th className="p-2.5 text-right">Bersih (KG)</th>
                  <th className="p-2.5 text-right">Total (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {loadingTransactions ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-500">
                      Memuat transaksi...
                    </td>
                  </tr>
                ) : supplierTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400">
                      Belum ada catatan transaksi untuk supplier ini.
                    </td>
                  </tr>
                ) : (
                  supplierTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/40">
                      <td className="p-2.5 font-mono font-bold text-gray-900 dark:text-white">
                        {t.ticket_number}
                      </td>
                      <td className="p-2.5 text-gray-600 dark:text-zinc-400">
                        {t.transaction_date}
                      </td>
                      <td className="p-2.5 font-mono font-semibold text-gray-700 dark:text-zinc-300">
                        {t.plate_number}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {Number(t.clean_kg).toLocaleString('id-ID')}
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-gray-900 dark:text-white">
                        Rp {Number(t.total_price).toLocaleString('id-ID')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>
    </div>
  );
};
