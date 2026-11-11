import React, { useState } from 'react';
import { Button } from '@rhypdf/ui';
import { KeyRound, X, Check, ShieldAlert } from 'lucide-react';
import {
  isLocalDataLockEnabled,
  setLocalDataLockPassphrase,
  removeLocalDataLock,
  verifyPassphrase
} from '../../lib/localDataLock';

export interface LocalDataLockDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalDataLockDialog: React.FC<LocalDataLockDialogProps> = ({ isOpen, onClose }) => {
  const [isEnabled, setIsEnabled] = useState(isLocalDataLockEnabled());
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSetLock = async () => {
    setError(null);
    setSuccess(null);

    if (passphrase.length < 4) {
      setError('Passphrase must be at least 4 characters long.');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }

    try {
      await setLocalDataLockPassphrase(passphrase);
      setIsEnabled(true);
      setSuccess('Local data lock enabled successfully with 256-bit AES-GCM encryption.');
      setPassphrase('');
      setConfirmPassphrase('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRemoveLock = async () => {
    setError(null);
    setSuccess(null);

    const valid = await verifyPassphrase(passphrase);
    if (!valid) {
      setError('Incorrect current passphrase.');
      return;
    }

    const removed = await removeLocalDataLock(passphrase);
    if (removed) {
      setIsEnabled(false);
      setSuccess('Local data lock removed.');
      setPassphrase('');
    }
  };

  return (
    <div
      data-testid="dialog-local-data-lock"
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
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <KeyRound size={20} color="var(--bg-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Local Data Encryption Lock</h3>
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
            margin: '0 0 16px 0',
            lineHeight: 1.4
          }}
        >
          Protects your locally saved signatures, recent document history, and local recovery state
          with hardware-backed WebCrypto AES-GCM 256-bit encryption.
        </p>

        {error && (
          <div
            data-testid="lock-error-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: 6,
              marginBottom: 14,
              fontSize: 13
            }}
          >
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div
            data-testid="lock-success-banner"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: 6,
              marginBottom: 14,
              fontSize: 13
            }}
          >
            <Check size={16} />
            <span>{success}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <label
              htmlFor="input-lock-passphrase"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              {isEnabled ? 'Current Passphrase (to unlock / remove)' : 'Master Passphrase'}
            </label>
            <input
              id="input-lock-passphrase"
              data-testid="input-lock-passphrase"
              type="password"
              placeholder="Enter passphrase"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'inherit',
                fontSize: 13
              }}
            />
          </div>

          {!isEnabled && (
            <div>
              <label
                htmlFor="input-lock-confirm-passphrase"
                style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
              >
                Confirm Master Passphrase
              </label>
              <input
                id="input-lock-confirm-passphrase"
                data-testid="input-lock-confirm-passphrase"
                type="password"
                placeholder="Confirm passphrase"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--bg-border, #cbd5e1)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  color: 'inherit',
                  fontSize: 13
                }}
              />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>

          {isEnabled ? (
            <Button data-testid="btn-remove-lock" variant="destructive" onClick={handleRemoveLock}>
              Remove Lock
            </Button>
          ) : (
            <Button data-testid="btn-enable-lock" variant="primary" onClick={handleSetLock}>
              Enable Encryption Lock
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
