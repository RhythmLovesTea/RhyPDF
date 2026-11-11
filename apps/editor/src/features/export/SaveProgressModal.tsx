import React from 'react';
import { Button } from '@rhypdf/ui';
import { Loader2 } from 'lucide-react';

export interface SaveProgressModalProps {
  isOpen: boolean;
  progress: number;
  statusMessage: string;
  onCancel?: () => void;
}

export const SaveProgressModal: React.FC<SaveProgressModalProps> = ({
  isOpen,
  progress,
  statusMessage,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="modal-save-progress"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--bg-foreground, #0f172a)',
          borderRadius: 12,
          padding: 24,
          width: '90%',
          maxWidth: 400,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          textAlign: 'center'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Loader2 size={36} color="var(--bg-primary, #2563eb)" className="animate-spin" />
        </div>

        <h4 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>
          Saving Document...
        </h4>

        <p
          data-testid="text-save-progress-status"
          style={{
            margin: '0 0 16px 0',
            fontSize: 13,
            color: 'var(--bg-muted-foreground, #64748b)'
          }}
        >
          {statusMessage || 'Processing...'} ({Math.round(progress)}%)
        </p>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: 8,
            backgroundColor: 'var(--bg-secondary, #e2e8f0)',
            borderRadius: 4,
            overflow: 'hidden',
            marginBottom: 20
          }}
        >
          <div
            data-testid="save-progress-bar"
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
              height: '100%',
              backgroundColor: 'var(--bg-primary, #2563eb)',
              transition: 'width 200ms ease'
            }}
          />
        </div>

        {onCancel && (
          <Button
            data-testid="btn-cancel-save-progress"
            variant="ghost"
            size="sm"
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};
