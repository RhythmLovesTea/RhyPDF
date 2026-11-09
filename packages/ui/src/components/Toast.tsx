import React from 'react';

export interface ToastProps {
  title: string;
  message?: string;
  variant?: 'info' | 'success' | 'error';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ title, message, variant = 'info', onClose }) => {
  const defaultStyle = { bg: '#eff6ff', color: '#1e40af', border: '#bfdbfe' };
  const variantStyles: Record<
    'info' | 'success' | 'error',
    { bg: string; color: string; border: string }
  > = {
    info: defaultStyle,
    success: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    error: { bg: '#fef2f2', color: '#991b1b', border: '#fecaca' }
  };

  const style = variantStyles[variant] ?? defaultStyle;

  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        boxShadow: 'var(--shadow-md)',
        maxWidth: 360
      }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{title}</div>
        {message && <div style={{ fontSize: 'var(--text-xs)', marginTop: 2 }}>{message}</div>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Dismiss toast"
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: 0,
            paddingInlineStart: 8,
            fontSize: '14px'
          }}
        >
          &times;
        </button>
      )}
    </div>
  );
};
