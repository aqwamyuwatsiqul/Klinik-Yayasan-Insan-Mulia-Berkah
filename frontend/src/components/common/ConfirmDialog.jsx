import { AlertTriangle, CheckCircle } from 'lucide-react';
import Spinner from './Spinner';

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  variant = 'danger',
}) {
  if (!open) return null;

  const isDanger  = variant === 'danger';
  const iconBg    = isDanger ? 'bg-status-danger-bg' : 'bg-status-success-bg';
  const iconColor = isDanger ? 'text-status-danger'  : 'text-primary';
  const Icon      = isDanger ? AlertTriangle : CheckCircle;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal-box max-w-sm">
        <div className="modal-body text-center py-8">
          <div className={`mx-auto w-14 h-14 rounded-[12px] flex items-center justify-center mb-4 ${iconBg}`}>
            <Icon className={`w-7 h-7 ${iconColor}`} />
          </div>
          <h3 id="confirm-title" className="text-base font-semibold text-text-primary mb-2">
            {title}
          </h3>
          <p className="text-sm text-text-secondary">{message}</p>
        </div>
        <div className="modal-footer justify-center gap-3">
          <button onClick={onCancel} disabled={loading} className="btn-secondary">
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={isDanger ? 'btn-danger' : 'btn-success'}
          >
            {loading ? <Spinner size="sm" /> : 'Ya, konfirmasi'}
          </button>
        </div>
      </div>
    </div>
  );
}
