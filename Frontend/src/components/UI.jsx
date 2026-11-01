import { createContext, useContext, useEffect, useState } from 'react';
import { Activity, Check, ChevronDown, Eye, EyeOff, X } from 'lucide-react';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={setToast}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} /> {toast}
          <button className="icon-button toast-close" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15} /></button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

export function Brand({ compact = false }) {
  return (
    <span className={`brand ${compact ? 'brand-compact' : ''}`}>
      <span className="brand-icon"><Activity size={17} strokeWidth={2.2} /></span>
      <span>PulseWatch</span>
    </span>
  );
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button inline-flex items-center justify-center gap-2 button-${variant} ${className}`} {...props}>{children}</button>;
}

export function IconButton({ label, children, className = '', ...props }) {
  return <button className={`icon-button ${className}`} aria-label={label} {...props}>{children}</button>;
}

export function PageHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="page-heading flex items-center justify-between">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', ...props }) {
  return <section className={`surface-card ${className}`} {...props}>{children}</section>;
}

export function CardHeading({ title, detail, action }) {
  return (
    <div className="card-heading">
      <div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const kind = status.toLowerCase();
  return <span className={`status-badge status-${kind}`}><span className="status-dot" />{status}</span>;
}

export function Field({ label, hint, error, className = '', children, ...props }) {
  const [visible, setVisible] = useState(false);
  const isPassword = props.type === 'password';
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      <span className={`input-wrap ${error ? 'input-error' : ''}`}>
        {children || <input {...props} type={isPassword && visible ? 'text' : props.type} />}
        {isPassword && !children && (
          <button type="button" className="input-trailing" onClick={() => setVisible((value) => !value)} aria-label={visible ? 'Hide password' : 'Show password'}>
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </span>
      {error && <span className="field-error">{error}</span>}
      {hint && !error && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function SelectField({ label, children, ...props }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="select-wrap"><select {...props}>{children}</select><ChevronDown size={15} /></span>
    </label>
  );
}

export function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="toggle-row">
      <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  );
}

export function EmptyState({ title, description, action }) {
  return <div className="empty-state"><span className="empty-icon"><Activity size={19} /></span><strong>{title}</strong><p>{description}</p>{action}</div>;
}

export function LoadingState({ label = 'Loading' }) {
  return (
    <div className="loading-state" role="status" aria-busy="true">
      <span className="loading-line loading-line-short" />
      <span className="loading-line" />
      <span className="loading-line loading-line-medium" />
      <span className="loading-label">{label}…</span>
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading">
          <div><h2 id="modal-title">{title}</h2>{description && <p>{description}</p>}</div>
          <IconButton label="Close dialog" onClick={onClose}><X size={17} /></IconButton>
        </div>
        <div className="modal-content">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </section>
    </div>
  );
}
