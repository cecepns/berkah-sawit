import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2, CheckCircle2 } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Tindakan',
  message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'danger', // danger, warning, primary
  loading = false,
}) => {
  const isDanger = type === 'danger';
  const isWarning = type === 'warning';

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" showClose={!loading}>
      <div className="text-center py-2">
        <div className={`mx-auto flex items-center justify-center w-14 h-14 rounded-full mb-4 ${
          isDanger ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400' :
          isWarning ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400' :
          'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
        }`}>
          {isDanger ? <Trash2 className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
        </div>

        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-zinc-400 mb-6">
          {message}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="w-1/2 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-zinc-300 font-semibold text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`w-1/2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${
              isDanger ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' :
              isWarning ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500' :
              'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
            }`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
