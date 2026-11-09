import React from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onClose, title, description, children }) => {
  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--bg-card-foreground)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '90%',
          maxWidth: 480,
          padding: 'var(--space-3)',
          border: '1px solid var(--bg-border)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="dialog-title" style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 600 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: 'var(--bg-muted-foreground)'
            }}
          >
            &times;
          </button>
        </div>
        {description && (
          <p
            style={{
              color: 'var(--bg-muted-foreground)',
              fontSize: 'var(--text-sm)',
              marginTop: 4
            }}
          >
            {description}
          </p>
        )}
        <div style={{ marginTop: 'var(--space-2)' }}>{children}</div>
      </div>
    </div>
  );
};
