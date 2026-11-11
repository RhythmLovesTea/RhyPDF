import React from 'react';
import { Button } from '@rhypdf/ui';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export interface ClearDataConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: () => void;
}

export const ClearDataConfirmDialog: React.FC<ClearDataConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirmClear
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="dialog-clear-all-data"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10003
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--bg-foreground, #0f172a)',
          borderRadius: 12,
          padding: 24,
          width: '90%',
          maxWidth: 420,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <AlertTriangle size={24} color="#ef4444" />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Clear All Local Data?</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bg-muted-foreground, #64748b)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <p
          style={{
            fontSize: 13,
            color: 'var(--bg-muted-foreground, #64748b)',
            margin: '0 0 20px 0',
            lineHeight: 1.5
          }}
        >
          This will permanently wipe all local working copies, recent document history, saved
          signatures, and local version history from this browser. This action cannot be undone.
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="btn-confirm-clear-all"
            variant="destructive"
            onClick={onConfirmClear}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Trash2 size={16} />
            <span>Wipe All Local Data</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
