import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { User, Phone, MapPin, Building, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const SupplierModal = ({ isOpen, onClose, supplier, onSave }) => {
  const [formData, setFormData] = useState({
    supplier_code: '',
    name: '',
    do_name: '',
    phone: '',
    address: '',
    village: '',
    district: 'Lawang Kidul',
    regency: 'Muara Enim',
    notes: '',
    status: 'active',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        supplier_code: supplier.supplier_code || '',
        name: supplier.name || '',
        do_name: supplier.do_name || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        village: supplier.village || '',
        district: supplier.district || 'Lawang Kidul',
        regency: supplier.regency || 'Muara Enim',
        notes: supplier.notes || '',
        status: supplier.status || 'active',
      });
    } else {
      setFormData({
        supplier_code: '',
        name: '',
        do_name: '',
        phone: '',
        address: '',
        village: '',
        district: 'Lawang Kidul',
        regency: 'Muara Enim',
        notes: '',
        status: 'active',
      });
    }
  }, [supplier, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nama Supplier wajib diisi');
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={supplier ? 'Edit Data Supplier' : 'Tambah Supplier Baru'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Nama Supplier / Pemilik Sawit *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: PT Sinar Jaya / Petani Mandiri"
                className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Nama DO / KUD (Opsional)
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={formData.do_name}
                onChange={(e) => setFormData({ ...formData, do_name: e.target.value })}
                placeholder="KUD Makmur / DO Mandiri"
                className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Nomor WhatsApp / HP
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="0812-xxxx-xxxx"
                className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Desa / Wilayah
            </label>
            <input
              type="text"
              value={formData.village}
              onChange={(e) => setFormData({ ...formData, village: e.target.value })}
              placeholder="Air Paku / Lingga"
              className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Kecamatan & Kabupaten
            </label>
            <input
              type="text"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
              placeholder="Lawang Kidul, Muara Enim"
              className="w-full px-3.5 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Alamat Lengkap
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-3 pointer-events-none" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Jl. Lintas ..."
                className="w-full pl-10 pr-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 block mb-1">
              Catatan Khusus
            </label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Catatan armada atau ketentuan khusus..."
              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-zinc-800"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'Menyimpan...' : 'Simpan Data Supplier'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
