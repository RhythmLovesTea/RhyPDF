import React, { useState } from 'react';
import { Dialog, Button } from '@rhypdf/ui';
import { PAGE_SIZE_PRESETS, type PageSizePreset, type PageOrientation } from '@rhypdf/edit-core';

export interface ResizePageDialogProps {
  open: boolean;
  onClose: () => void;
  pageIndex: number;
  currentWidth: number;
  currentHeight: number;
  onApplyResize: (pageIndex: number, width: number, height: number, scaleContent: boolean) => void;
}

export const ResizePageDialog: React.FC<ResizePageDialogProps> = ({
  open,
  onClose,
  pageIndex,
  currentWidth,
  currentHeight,
  onApplyResize
}) => {
  const [preset, setPreset] = useState<PageSizePreset>('A4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [customWidth, setCustomWidth] = useState(Math.round(currentWidth));
  const [customHeight, setCustomHeight] = useState(Math.round(currentHeight));
  const [scaleContent, setScaleContent] = useState(true);

  const handleApply = () => {
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

    onApplyResize(pageIndex, width, height, scaleContent);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Resize Page (Page ${pageIndex + 1})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 340 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            Page Size Preset
          </label>
          <select
            data-testid="resize-preset-select"
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
            <option value="A4">A4 (595 × 842 pt)</option>
            <option value="Letter">US Letter (612 × 792 pt)</option>
            <option value="Legal">US Legal (612 × 1008 pt)</option>
            <option value="Tabloid">Tabloid (792 × 1224 pt)</option>
            <option value="A3">A3 (842 × 1191 pt)</option>
            <option value="A5">A5 (420 × 595 pt)</option>
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
                data-testid="resize-custom-width"
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
                data-testid="resize-custom-height"
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
                  name="resize-orientation"
                  value="portrait"
                  checked={orientation === 'portrait'}
                  onChange={() => setOrientation('portrait')}
                />
                Portrait
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio"
                  name="resize-orientation"
                  value="landscape"
                  checked={orientation === 'landscape'}
                  onChange={() => setOrientation('landscape')}
                />
                Landscape
              </label>
            </div>
          </div>
        )}

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
          <input
            data-testid="scale-content-checkbox"
            type="checkbox"
            checked={scaleContent}
            onChange={(e) => setScaleContent(e.target.checked)}
          />
          Scale page contents proportionally to fit new dimensions
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button data-testid="apply-resize-button" variant="primary" onClick={handleApply}>
            Apply Resize
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
