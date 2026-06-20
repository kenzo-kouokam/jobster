import React, { useEffect } from 'react';
import './Toast.css';

/**
 * Toast — lightweight ephemeral notification.
 * Props:
 *   toast   : { message: string, type: 'success' | 'error' | 'info', onClick?: () => void } | null
 *   onClose : () => void
 *   onAction: () => void — called when the toast itself is clicked (if toast.onClick is set)
 * Auto-dismisses after 3.2 s, or 6 s when clickable (leaves time to react).
 */
export default function Toast({ toast, onClose, onAction }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, toast.onClick ? 6000 : 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const icon  = icons[toast.type] || icons.success;
  const clickable = !!toast.onClick;

  return (
    <div
      className={`toast toast--${toast.type || 'success'} ${clickable ? 'toast--clickable' : ''}`}
      role="status"
      aria-live="polite"
      onClick={clickable ? onAction : undefined}
    >
      <span className="toast-icon">{icon}</span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Fermer la notification">×</button>
    </div>
  );
}
