import React, { useState } from 'react';
import { Dialog, Button } from '@rhypdf/ui';
import { PAGE_SIZE_PRESETS, type PageSizePreset, type PageOrientation } from '@rhypdf/edit-core';

export interface InsertBlankPageDialogProps {
  open: boolean;
  onClose: () => void;
  currentPageIndex: number;
  totalPages: number;
  onInsert: (params: { targetIndex: number; width: number; height: number; preset: string }) => void;
}

export const InsertBlankPageDialog: React.FC<InsertBlankPageDialogProps> = ({
  open,
  onClose,
  currentPageIndex,
  totalPages,
  onInsert
}) => {
  const [preset, setPreset] = useState<PageSizePreset>('A4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [customWidth, setCustomWidth] = useState(595);
  const [customHeight, setCustomHeight] = useState(842);
  const [position, setPosition] = useState<'after' | 'before' | 'start' | 'end'>('after');

  const handleConfirm = () => {
    let width: number;
    let height: number;

    if (preset === 'Custom') {
      width = customWidth;
      height = customHeight;
    } else {
      const dimensions = PAGE_SIZE_PRESETS[preset];
      if (orientation === 'landscape') {
        width = Math.max(dimensions.width, dimensions.height);
        height = Math.min(dimensions.width, dimensions.height);
      } else {
        width = Math.min(dimensions.width, dimensions.height);
        height = Math.max(dimensions.width, dimensions.height);
      }
    }

    let targetIndex = currentPageIndex + 1;
    if (position === 'before') {
      targetIndex = currentPageIndex;
    } else if (position === 'start') {
      targetIndex = 0;
    } else if (position === 'end') {
      targetIndex = totalPages;
    }

    onInsert({ targetIndex, width, height, preset });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Insert Blank Page">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 320 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            Page Size Preset
          </label>
          <select
            data-testid="page-size-preset-select"
            value={preset}
            onChange={(e) => setPreset(e.target.value as PageSizePreset)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)'
            }}
          >
            <option value="A4">A4 (210 × 297 mm)</option>
            <option value="Letter">US Letter (8.5 × 11 in)</option>
            <option value="Legal">US Legal (8.5 × 14 in)</option>
            <option value="Tabloid">Tabloid (11 × 17 in)</option>
            <option value="A3">A3 (297 × 420 mm)</option>
            <option value="A5">A5 (148 × 210 mm)</option>
            <option value="Custom">Custom Size</option>
          </select>
        </div>

        {preset === 'Custom' ? (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', display: 'block', marginBottom: 4 }}>
                Width (pt)
              </label>
              <input
                data-testid="custom-width-input"
                type="number"
                value={customWidth}
                onChange={(e) => setCustomWidth(Math.max(50, parseInt(e.target.value, 10) || 50))}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', display: 'block', marginBottom: 4 }}>
                Height (pt)
              </label>
              <input
                data-testid="custom-height-input"
                type="number"
                value={customHeight}
                onChange={(e) => setCustomHeight(Math.max(50, parseInt(e.target.value, 10) || 50))}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)'
                }}
              />
            </div>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Orientation
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio"
                  name="orientation"
                  value="portrait"
                  checked={orientation === 'portrait'}
                  onChange={() => setOrientation('portrait')}
                />
                Portrait
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio"
                  name="orientation"
                  value="landscape"
                  checked={orientation === 'landscape'}
                  onChange={() => setOrientation('landscape')}
                />
                Landscape
              </label>
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            Insert Position
          </label>
          <select
            data-testid="insert-position-select"
            value={position}
            onChange={(e) => setPosition(e.target.value as 'after' | 'before' | 'start' | 'end')}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)'
            }}
          >
            <option value="after">After Page {currentPageIndex + 1}</option>
            <option value="before">Before Page {currentPageIndex + 1}</option>
            <option value="start">At Document Beginning (Page 1)</option>
            <option value="end">At Document End (Page {totalPages + 1})</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button data-testid="insert-blank-page-confirm" variant="primary" onClick={handleConfirm}>
            Insert Page
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
