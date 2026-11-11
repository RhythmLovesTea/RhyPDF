import React from 'react';
import { Button } from '@rhypdf/ui';
import { AlertCircle } from 'lucide-react';

export interface UnsavedChangesDialogProps {
  isOpen: boolean;
  filename: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  isOpen,
  filename,
  onSave,
  onDiscard,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="dialog-unsaved-changes"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001
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
          <AlertCircle size={24} color="#f59e0b" />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Unsaved Changes</h3>
        </div>

        <p style={{ fontSize: 14, color: 'var(--bg-muted-foreground, #64748b)', margin: '0 0 20px 0', lineHeight: 1.5 }}>
          You have unsaved changes in <strong>{filename}</strong>. What would you like to do before leaving?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button
            data-testid="btn-unsaved-save"
            variant="primary"
            onClick={onSave}
            style={{ width: '100%' }}
          >
            Save Changes
          </Button>

          <Button
            data-testid="btn-unsaved-discard"
            variant="destructive"
            onClick={onDiscard}
            style={{ width: '100%' }}
          >
            Discard Changes
          </Button>

          <Button
            data-testid="btn-unsaved-cancel"
            variant="ghost"
            onClick={onCancel}
            style={{ width: '100%' }}
          >
            Stay on Page
          </Button>
        </div>
      </div>
    </div>
  );
};
