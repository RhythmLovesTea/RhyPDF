import React from 'react';
import { Button } from '@rhypdf/ui';
import { Save, Download, X } from 'lucide-react';

export interface ConfirmSaveOriginalDialogProps {
  isOpen: boolean;
  filename: string;
  onClose: () => void;
  onSaveOriginal: () => void;
  onDownloadCopy: () => void;
}

export const ConfirmSaveOriginalDialog: React.FC<ConfirmSaveOriginalDialogProps> = ({
  isOpen,
  filename,
  onClose,
  onSaveOriginal,
  onDownloadCopy
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="dialog-confirm-save-original"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
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
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Save to Original File?</h3>
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
            fontSize: 14,
            color: 'var(--bg-muted-foreground, #64748b)',
            margin: '0 0 20px 0',
            lineHeight: 1.5
          }}
        >
          Do you want to overwrite the original file <strong>{filename}</strong> on your device? You
          can also download an edited copy to protect the original.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button
            data-testid="btn-save-confirm"
            variant="primary"
            onClick={onSaveOriginal}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Save size={16} />
            <span>Overwrite Original File</span>
          </Button>

          <Button
            data-testid="btn-save-as-copy"
            variant="secondary"
            onClick={onDownloadCopy}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            <Download size={16} />
            <span>Download a Copy Instead</span>
          </Button>

          <Button
            data-testid="btn-save-cancel"
            variant="ghost"
            onClick={onClose}
            style={{ width: '100%' }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
