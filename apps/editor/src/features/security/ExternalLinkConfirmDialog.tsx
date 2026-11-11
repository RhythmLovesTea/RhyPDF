import React from 'react';
import { Button } from '@rhypdf/ui';
import { ExternalLink, X, ShieldCheck } from 'lucide-react';

export interface ExternalLinkConfirmDialogProps {
  isOpen: boolean;
  targetUrl: string;
  onClose: () => void;
  onConfirmOpen: () => void;
}

export const ExternalLinkConfirmDialog: React.FC<ExternalLinkConfirmDialogProps> = ({
  isOpen,
  targetUrl,
  onClose,
  onConfirmOpen
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="dialog-external-link-confirm"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10002
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--bg-foreground, #0f172a)',
          borderRadius: 12,
          padding: 24,
          width: '90%',
          maxWidth: 440,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ExternalLink size={20} color="var(--bg-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Open External Link?</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
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
            margin: '0 0 14px 0',
            lineHeight: 1.4
          }}
        >
          You clicked a link inside this PDF document. For your safety, please verify the
          destination before proceeding:
        </p>

        <div
          data-testid="text-external-url-destination"
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--bg-secondary, #f1f5f9)',
            borderRadius: 6,
            wordBreak: 'break-all',
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--bg-primary, #2563eb)',
            marginBottom: 20
          }}
        >
          {targetUrl}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="btn-confirm-open-external-link"
            variant="primary"
            onClick={onConfirmOpen}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <ShieldCheck size={16} />
            <span>Open Link</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
