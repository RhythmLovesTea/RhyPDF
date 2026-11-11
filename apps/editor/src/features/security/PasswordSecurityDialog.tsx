import React, { useState } from 'react';
import { Button } from '@rhypdf/ui';
import { Lock, Unlock, X, ShieldAlert } from 'lucide-react';
import { PDF_PERMISSIONS, type PdfSecurityOptions } from '@rhypdf/edit-core';

export interface PasswordSecurityDialogProps {
  isOpen: boolean;
  isCurrentlyEncrypted?: boolean;
  onClose: () => void;
  onApplyPassword: (options: PdfSecurityOptions) => void;
  onRemovePassword: () => void;
}

export const PasswordSecurityDialog: React.FC<PasswordSecurityDialogProps> = ({
  isOpen,
  isCurrentlyEncrypted = false,
  onClose,
  onApplyPassword,
  onRemovePassword
}) => {
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [allowPrint, setAllowPrint] = useState(true);
  const [allowCopy, setAllowCopy] = useState(true);
  const [allowModify, setAllowModify] = useState(false);
  const [allowAnnotate, setAllowAnnotate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = () => {
    if (!userPassword && !ownerPassword) {
      setError('Please provide at least a user or owner password.');
      return;
    }
    setError(null);

    let perms = 0;
    if (allowPrint) perms |= PDF_PERMISSIONS.PRINT | PDF_PERMISSIONS.PRINT_HIGH_QUALITY;
    if (allowCopy) perms |= PDF_PERMISSIONS.COPY | PDF_PERMISSIONS.EXTRACT_ACCESS;
    if (allowModify) perms |= PDF_PERMISSIONS.MODIFY | PDF_PERMISSIONS.ASSEMBLE;
    if (allowAnnotate) perms |= PDF_PERMISSIONS.ANNOT_FORMS | PDF_PERMISSIONS.FILL_FORMS;

    onApplyPassword({
      userPassword,
      ownerPassword: ownerPassword || userPassword,
      permissions: perms
    });
  };

  return (
    <div
      data-testid="dialog-password-security"
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
          maxWidth: 460,
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
            <Lock size={20} color="var(--bg-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Document Security</h3>
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

        {error && (
          <div
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

        {/* Existing Security state */}
        {isCurrentlyEncrypted && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              backgroundColor: 'var(--bg-secondary, #f1f5f9)',
              borderRadius: 8,
              marginBottom: 16
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>Password Protection Active</div>
              <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground, #64748b)' }}>
                This file currently requires a password to open or edit.
              </div>
            </div>
            <Button
              data-testid="btn-remove-security"
              variant="destructive"
              size="sm"
              onClick={onRemovePassword}
              style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Unlock size={14} />
              <span>Remove Password</span>
            </Button>
          </div>
        )}

        {/* Password Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          <div>
            <label
              htmlFor="input-user-password"
              style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              User Password (Required to open PDF)
            </label>
            <input
              id="input-user-password"
              data-testid="input-user-password"
              type="password"
              placeholder="Enter open password"
              value={userPassword}
              onChange={(e) => setUserPassword(e.target.value)}
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

          <div>
            <label
              htmlFor="input-owner-password"
              style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Owner Password (Required to change permissions)
            </label>
            <input
              id="input-owner-password"
              data-testid="input-owner-password"
              type="password"
              placeholder="Leave blank to match user password"
              value={ownerPassword}
              onChange={(e) => setOwnerPassword(e.target.value)}
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
        </div>

        {/* Permissions */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Allowed Permissions</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <input
                data-testid="perm-allow-print"
                type="checkbox"
                checked={allowPrint}
                onChange={(e) => setAllowPrint(e.target.checked)}
              />
              <span>Allow Printing</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <input
                data-testid="perm-allow-copy"
                type="checkbox"
                checked={allowCopy}
                onChange={(e) => setAllowCopy(e.target.checked)}
              />
              <span>Allow Copying Text</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <input
                data-testid="perm-allow-modify"
                type="checkbox"
                checked={allowModify}
                onChange={(e) => setAllowModify(e.target.checked)}
              />
              <span>Allow Modifying</span>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              <input
                data-testid="perm-allow-annotate"
                type="checkbox"
                checked={allowAnnotate}
                onChange={(e) => setAllowAnnotate(e.target.checked)}
              />
              <span>Allow Annotations</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="btn-apply-password"
            variant="primary"
            onClick={handleApply}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Lock size={15} />
            <span>Apply Password</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
