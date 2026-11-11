import React, { useState } from 'react';
import { Button } from '@rhypdf/ui';
import { EyeOff, X, AlertTriangle } from 'lucide-react';
import type { RedactionArea } from '@rhypdf/edit-core';

export interface RedactionDialogProps {
  isOpen: boolean;
  pageIndex: number;
  initialBounds?: { left: number; bottom: number; width: number; height: number };
  onClose: () => void;
  onApplyRedaction: (redaction: RedactionArea) => void;
}

export const RedactionDialog: React.FC<RedactionDialogProps> = ({
  isOpen,
  pageIndex,
  initialBounds = { left: 50, bottom: 500, width: 250, height: 40 },
  onClose,
  onApplyRedaction
}) => {
  const [left, setLeft] = useState(initialBounds.left);
  const [bottom, setBottom] = useState(initialBounds.bottom);
  const [width, setWidth] = useState(initialBounds.width);
  const [height, setHeight] = useState(initialBounds.height);
  const [overlayText, setOverlayText] = useState('[REDACTED]');
  const [fillColorHex, setFillColorHex] = useState('#000000');

  if (!isOpen) return null;

  const hexToRgba = (hex: string) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return { r, g, b, a: 255 };
  };

  const handleApply = () => {
    const redaction: RedactionArea = {
      id: `redaction-${Date.now()}`,
      pageIndex,
      bounds: {
        left,
        bottom,
        right: left + width,
        top: bottom + height
      },
      overlayText: overlayText.trim(),
      fillColor: hexToRgba(fillColorHex),
      textColor: { r: 255, g: 255, b: 255, a: 255 }
    };
    onApplyRedaction(redaction);
  };

  return (
    <div
      data-testid="dialog-redaction"
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
            <EyeOff size={20} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>True Redaction</h3>
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

        {/* Warning Banner */}
        <div
          data-testid="redaction-warning-banner"
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 14px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            color: '#92400e',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            lineHeight: 1.4
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <span>
            <strong>Warning:</strong> True Redaction permanently deletes the underlying text and
            image data from the document file. Once saved, this data cannot be recovered.
          </span>
        </div>

        {/* Area Bounds */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label
              htmlFor="input-redact-x"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              X (Left px)
            </label>
            <input
              id="input-redact-x"
              data-testid="input-redact-x"
              type="number"
              value={left}
              onChange={(e) => setLeft(parseFloat(e.target.value) || 0)}
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
              htmlFor="input-redact-y"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Y (Bottom px)
            </label>
            <input
              id="input-redact-y"
              data-testid="input-redact-y"
              type="number"
              value={bottom}
              onChange={(e) => setBottom(parseFloat(e.target.value) || 0)}
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
              htmlFor="input-redact-width"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Width (px)
            </label>
            <input
              id="input-redact-width"
              data-testid="input-redact-width"
              type="number"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value) || 10)}
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
              htmlFor="input-redact-height"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Height (px)
            </label>
            <input
              id="input-redact-height"
              data-testid="input-redact-height"
              type="number"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value) || 10)}
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

        {/* Overlay Label & Color */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1 }}>
            <label
              htmlFor="input-redact-overlay-text"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Redaction Label Text
            </label>
            <input
              id="input-redact-overlay-text"
              data-testid="input-redact-overlay-text"
              type="text"
              placeholder="e.g. [REDACTED]"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
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
              htmlFor="input-redact-color"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Fill Color
            </label>
            <input
              id="input-redact-color"
              data-testid="input-redact-color"
              type="color"
              value={fillColorHex}
              onChange={(e) => setFillColorHex(e.target.value)}
              style={{
                width: 44,
                height: 32,
                padding: 0,
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="btn-confirm-redaction"
            variant="destructive"
            onClick={handleApply}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <EyeOff size={15} />
            <span>Apply Redaction</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
