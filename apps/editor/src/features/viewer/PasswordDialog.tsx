import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { Dialog, Button } from '@rhypdf/ui';

export interface PasswordDialogProps {
  open: boolean;
  isWrongPassword?: boolean;
  isSubmitting?: boolean;
  errorMessage?: string;
  onSubmit: (password: string) => void | Promise<void>;
  onCancel: () => void;
}

export const PasswordDialog: React.FC<PasswordDialogProps> = ({
  open,
  isWrongPassword = false,
  isSubmitting = false,
  errorMessage,
  onSubmit,
  onCancel
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword('');
      // Auto-focus input on mount / dialog open
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Focus and select input if wrong password was entered
  useEffect(() => {
    if (isWrongPassword && open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isWrongPassword, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !password.trim()) return;
    void onSubmit(password);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onCancel();
    }
  };

  const displayError = errorMessage ?? (isWrongPassword ? t('editor.viewer.passwordRetry') : null);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={t('editor.viewer.passwordRequired')}
      description={t('editor.viewer.passwordPrompt')}
    >
      <form
        onSubmit={handleSubmit}
        onKeyDown={handleKeyDown}
        data-testid="password-dialog-form"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label
            htmlFor="pdf-password-input"
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 500,
              color: 'var(--bg-foreground)'
            }}
          >
            {t('editor.viewer.passwordPrompt')}
          </label>
          <input
            id="pdf-password-input"
            ref={inputRef}
            type="password"
            autoComplete="current-password"
            data-testid="pdf-password-input"
            disabled={isSubmitting}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              border: isWrongPassword
                ? '1px solid var(--bg-destructive)'
                : '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--bg-foreground)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              width: '100%',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {displayError && (
          <div
            role="alert"
            data-testid="password-error-message"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--bg-destructive)',
              fontWeight: 500,
              lineHeight: 1.4
            }}
          >
            {displayError}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            marginTop: '8px'
          }}
        >
          <Button
            type="button"
            variant="secondary"
            size="md"
            data-testid="password-cancel-button"
            disabled={isSubmitting}
            onClick={onCancel}
          >
            {t('editor.viewer.passwordCancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            data-testid="password-submit-button"
            disabled={isSubmitting || !password.trim()}
          >
            {isSubmitting ? '...' : t('editor.viewer.passwordSubmit')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
