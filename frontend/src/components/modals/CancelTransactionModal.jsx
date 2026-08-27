import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { AlertTriangle, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

export const CancelTransactionModal = ({ isOpen, onClose, transaction, onConfirmCancel }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error('Silakan isi alasan pembatalan tiket transaksi');
      return;
    }

    setLoading(true);
    try {
      await onConfirmCancel(transaction.id, reason);
      setReason('');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal membatalkan transaksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Batalkan Tiket Transaksi" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3.5 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 dark:text-red-300 space-y-1">
            <p className="font-bold">
              Apakah Anda yakin ingin membatalkan tiket #{transaction.ticket_number}?
            </p>
            <p className="text-red-700/80 dark:text-red-400/80 leading-relaxed">
              Data transaksi akan ditandai sebagai dibatalkan (soft delete) untuk keperluan audit, dan tidak akan dihitung di rekap pembelian/berat.
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
            Alasan Pembatalan Transaksi *
          </label>
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Kesalahan input berat / Supplier membatalkan pengiriman..."
            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 font-semibold text-xs hover:bg-gray-100"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Ban className="w-4 h-4" />
            {loading ? 'Memproses...' : 'Ya, Batalkan Tiket'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
