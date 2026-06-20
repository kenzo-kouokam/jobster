import React, { useEffect } from 'react';
import './Toast.css';

/**
 * Toast — lightweight ephemeral notification.
 * Props:
 *   toast  : { message: string, type: 'success' | 'error' | 'info' } | null
 *   onClose: () => void
 * Auto-dismisses after 3.2 s.
 */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 3200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const icon  = icons[toast.type] || icons.success;

  return (
    <div className={`toast toast--${toast.type || 'success'}`} role="status" aria-live="polite">
      <span className="toast-icon">{icon}</span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" onClick={onClose} aria-label="Fermer la notification">×</button>
    </div>
  );
}
