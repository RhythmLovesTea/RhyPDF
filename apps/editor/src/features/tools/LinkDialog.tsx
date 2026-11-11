import React, { useState, useEffect } from 'react';
import { Link as LinkIcon, Trash2, AlertCircle } from 'lucide-react';
import { Dialog } from '@rhypdf/ui';
import type { ObjectLink } from '@rhypdf/edit-core';
import { validateLinkTarget } from '@rhypdf/edit-core';

export interface LinkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLink: (link: ObjectLink) => void;
  onRemoveLink?: () => void;
  initialLink?: ObjectLink;
  totalPages?: number;
}

export const LinkDialog: React.FC<LinkDialogProps> = ({
  isOpen,
  onClose,
  onSaveLink,
  onRemoveLink,
  initialLink,
  totalPages = 100
}) => {
  const [targetType, setTargetType] = useState<'url' | 'email' | 'phone' | 'page'>('url');
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialLink?.target) {
      setTargetType(initialLink.target.type);
      if (initialLink.target.type === 'url') setInputValue(initialLink.target.url);
      else if (initialLink.target.type === 'email') setInputValue(initialLink.target.email);
      else if (initialLink.target.type === 'phone') setInputValue(initialLink.target.phone);
      else if (initialLink.target.type === 'page')
        setInputValue(String(initialLink.target.pageIndex + 1));
    } else {
      setInputValue('');
    }
    setErrorMsg(null);
  }, [initialLink, isOpen]);

  const handleSave = () => {
    let raw = inputValue.trim();
    if (targetType === 'page') {
      raw = `page:${raw}`;
    }

    const validation = validateLinkTarget(raw, totalPages);
    if (!validation.valid || !validation.destination) {
      setErrorMsg(validation.error || 'Invalid link target');
      return;
    }

    onSaveLink({ target: validation.destination });
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={initialLink ? 'Edit Hyperlink' : 'Add Hyperlink'}
    >
      <div
        data-testid="dialog-link"
        style={{
          padding: 20,
          minWidth: 350,
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600 }}
        >
          <LinkIcon size={18} />
          <span>{initialLink ? 'Edit Hyperlink' : 'Add Hyperlink'}</span>
        </div>

        {/* Destination Type */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['url', 'email', 'phone', 'page'] as const).map((type) => (
            <button
              key={type}
              data-testid={`link-type-${type}`}
              onClick={() => {
                setTargetType(type);
                setErrorMsg(null);
              }}
              style={{
                flex: 1,
                padding: '5px 0',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid var(--bg-border)',
                backgroundColor: targetType === type ? 'var(--bg-secondary)' : 'transparent',
                fontWeight: targetType === type ? 600 : 400,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {type === 'url' ? 'Web URL' : type}
            </button>
          ))}
        </div>

        {/* Input Target */}
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
            {targetType === 'url' && 'Website address (https://...):'}
            {targetType === 'email' && 'Email address:'}
            {targetType === 'phone' && 'Phone number:'}
            {targetType === 'page' && 'Target page number (1-based):'}
          </label>
          <input
            data-testid="input-link-destination"
            type={targetType === 'page' ? 'number' : 'text'}
            min={targetType === 'page' ? 1 : undefined}
            max={targetType === 'page' ? totalPages : undefined}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setErrorMsg(null);
            }}
            placeholder={
              targetType === 'url'
                ? 'https://example.com'
                : targetType === 'email'
                  ? 'user@example.com'
                  : targetType === 'phone'
                    ? '+1-555-123-4567'
                    : '1'
            }
            style={{
              width: '100%',
              padding: '6px 8px',
              fontSize: 13,
              border: '1px solid var(--bg-border)',
              borderRadius: 4
            }}
          />
        </div>

        {errorMsg && (
          <div
            data-testid="link-error-msg"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#ef4444',
              fontSize: 12
            }}
          >
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8
          }}
        >
          {initialLink && onRemoveLink ? (
            <button
              data-testid="btn-remove-link"
              onClick={() => {
                onRemoveLink();
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '6px 10px',
                borderRadius: 4,
                border: '1px solid #ef4444',
                color: '#ef4444',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              <Trash2 size={13} />
              Remove Link
            </button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              data-testid="btn-cancel-link"
              onClick={onClose}
              style={{
                padding: '6px 12px',
                borderRadius: 4,
                border: '1px solid var(--bg-border)',
                background: 'transparent',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              data-testid="btn-apply-link"
              onClick={handleSave}
              style={{
                padding: '6px 14px',
                borderRadius: 4,
                border: 'none',
                backgroundColor: 'var(--bg-primary)',
                color: '#ffffff',
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Save Link
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
