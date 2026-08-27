import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Scale, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const EditTransactionModal = ({ isOpen, onClose, transaction, onSave }) => {
  const [formData, setFormData] = useState({
    supplier_name: '',
    supplier_do: '',
    driver_name: '',
    plate_number: '',
    origin: '',
    gross_kg: 0,
    tare_kg: 0,
    netto_kg: 0,
    deduction_percent: 0,
    deduction_kg: 0,
    clean_kg: 0,
    price_per_kg: 2650,
    total_price: 0,
    sortation: 'Matang',
    notes: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transaction) {
      setFormData({
        supplier_name: transaction.supplier_name || '',
        supplier_do: transaction.supplier_do || '',
        driver_name: transaction.driver_name || '',
        plate_number: transaction.plate_number || '',
        origin: transaction.origin || '',
        gross_kg: Number(transaction.gross_kg) || 0,
        tare_kg: Number(transaction.tare_kg) || 0,
        netto_kg: Number(transaction.netto_kg) || 0,
        deduction_percent: Number(transaction.deduction_percent) || 0,
        deduction_kg: Number(transaction.deduction_kg) || 0,
        clean_kg: Number(transaction.clean_kg) || 0,
        price_per_kg: Number(transaction.price_per_kg) || 0,
        total_price: Number(transaction.total_price) || 0,
        sortation: transaction.sortation || 'Matang',
        notes: transaction.notes || '',
      });
    }
  }, [transaction, isOpen]);

  // Recalculate weights on change
  const handleWeightChange = (field, val) => {
    const num = parseFloat(val) || 0;
    const next = { ...formData, [field]: num };

    const gross = field === 'gross_kg' ? num : next.gross_kg;
    const tare = field === 'tare_kg' ? num : next.tare_kg;
    const pct = field === 'deduction_percent' ? num : next.deduction_percent;
    const price = field === 'price_per_kg' ? num : next.price_per_kg;

    const netto = Math.max(0, gross - tare);
    const dedKg = Math.round(((netto * pct) / 100) * 100) / 100;
    const cleanKg = Math.max(0, Math.round((netto - dedKg) * 100) / 100);
    const total = Math.round(cleanKg * price);

    setFormData({
      ...next,
      netto_kg: netto,
      deduction_kg: dedKg,
      clean_kg: cleanKg,
      total_price: total,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.gross_kg < formData.tare_kg) {
      toast.error('Tare tidak boleh lebih besar dari Gross');
      return;
    }

    setLoading(true);
    try {
      await onSave(transaction.id, formData);
      toast.success('Data transaksi berhasil diperbarui');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan perubahan transaksi');
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Transaksi #${transaction.ticket_number}`}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sender Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Supplier
            </label>
            <input
              type="text"
              required
              value={formData.supplier_name}
              onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Sopir
            </label>
            <input
              type="text"
              required
              value={formData.driver_name}
              onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              No Polisi
            </label>
            <input
              type="text"
              required
              value={formData.plate_number}
              onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold text-gray-900 dark:text-white uppercase"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Sortasi
            </label>
            <input
              type="text"
              value={formData.sortation}
              onChange={(e) => setFormData({ ...formData, sortation: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Weights Calculation Grid */}
        <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Gross (Kg)
              </label>
              <input
                type="number"
                step="any"
                value={formData.gross_kg}
                onChange={(e) => handleWeightChange('gross_kg', e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Tare (Kg)
              </label>
              <input
                type="number"
                step="any"
                value={formData.tare_kg}
                onChange={(e) => handleWeightChange('tare_kg', e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Netto (Kg)
              </label>
              <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {formData.netto_kg.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Potongan %
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.deduction_percent}
                onChange={(e) => handleWeightChange('deduction_percent', e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Bersih (Kg)
              </label>
              <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {formData.clean_kg.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
                Harga / Kg
              </label>
              <input
                type="number"
                value={formData.price_per_kg}
                onChange={(e) => handleWeightChange('price_per_kg', e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-zinc-700">
            <span className="text-xs font-bold text-gray-700 dark:text-zinc-300">Total Harga:</span>
            <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
              Rp {formData.total_price.toLocaleString('id-ID')}
            </span>
          </div>
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
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
