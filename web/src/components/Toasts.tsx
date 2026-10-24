import { IconAlert, IconCheck, IconInfo, IconX } from './Icons';

export type ToastKind = 'error' | 'success' | 'info';
export type ToastItem = { id: number; kind: ToastKind; message: string };

const ICONS = {
  error: IconAlert,
  success: IconCheck,
  info: IconInfo,
};

export function Toasts({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toasts" aria-live="polite" aria-atomic="false">
      {items.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <div
            key={toast.id}
            className={`toast toast--${toast.kind}`}
            role={toast.kind === 'error' ? 'alert' : 'status'}
          >
            <span className="toast-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            <p>{toast.message}</p>
            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Bildirimi kapat"
            >
              <IconX size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
