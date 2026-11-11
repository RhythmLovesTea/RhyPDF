import React, { useState } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { Dialog } from '@rhypdf/ui';
import type { WatermarkConfig, PageRangeMode, WatermarkObject } from '@rhypdf/edit-core';
import { generateWatermarkForPage, resolvePageIndices } from '@rhypdf/edit-core';

export interface WatermarkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWatermark: (objects: WatermarkObject[]) => void;
  totalPages: number;
  pageWidthPt?: number;
  pageHeightPt?: number;
}

export const WatermarkDialog: React.FC<WatermarkDialogProps> = ({
  isOpen,
  onClose,
  onApplyWatermark,
  totalPages,
  pageWidthPt = 612,
  pageHeightPt = 792
}) => {
  const { t } = useTranslation();
  const [wmType] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.25);
  const [rotation, setRotation] = useState(45);
  const [tile, setTile] = useState(false);
  const [rangeMode, setRangeMode] = useState<PageRangeMode>('all');
  const [customRange, setCustomRange] = useState('');

  const handleApply = () => {
    const config: WatermarkConfig = {
      type: wmType,
      text: wmType === 'text' ? text : undefined,
      opacity,
      rotation,
      tile,
      pageRangeMode: rangeMode,
      customPageRange: customRange
    };

    const targetIndices = resolvePageIndices(rangeMode, totalPages, customRange);
    const allObjects: WatermarkObject[] = [];

    for (const pIdx of targetIndices) {
      const pageObjs = generateWatermarkForPage(config, pIdx, pageWidthPt, pageHeightPt);
      allObjects.push(...pageObjs);
    }

    onApplyWatermark(allObjects);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title={t('editor.watermark.title', 'Add Watermark')}>
      <div
        data-testid="dialog-watermark"
        style={{
          padding: 24,
          minWidth: 360,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600 }}>
          {t('editor.watermark.title', 'Add Watermark')}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
          {/* Preset Buttons */}
          <div style={{ display: 'flex', gap: 6 }}>
            {['CONFIDENTIAL', 'DRAFT', 'SAMPLE', 'COPY'].map((preset) => (
              <button
                key={preset}
                type="button"
                data-testid={`wm-preset-${preset.toLowerCase()}`}
                onClick={() => setText(preset)}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  fontSize: 11,
                  borderRadius: 4,
                  border: '1px solid var(--bg-border)',
                  background: text === preset ? 'var(--bg-secondary)' : 'transparent',
                  cursor: 'pointer'
                }}
              >
                {preset}
              </button>
            ))}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 4 }}>Watermark Text:</label>
            <input
              data-testid="input-watermark-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter watermark text..."
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: 13,
                border: '1px solid var(--bg-border)',
                borderRadius: 4
              }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Opacity:</span>
              <span>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.8"
              step="0.05"
              data-testid="input-watermark-opacity"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span>Rotation:</span>
              <span>{rotation}°</span>
            </div>
            <input
              type="range"
              min="-90"
              max="90"
              step="15"
              data-testid="input-watermark-rotation"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input
              type="checkbox"
              data-testid="checkbox-watermark-tile"
              checked={tile}
              onChange={(e) => setTile(e.target.checked)}
            />
            Tile repeatedly across the page (3x3 grid)
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Pages:</span>
            <select
              data-testid="select-watermark-range"
              value={rangeMode}
              onChange={(e) => setRangeMode(e.target.value as PageRangeMode)}
              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--bg-border)' }}
            >
              <option value="all">All Pages</option>
              <option value="firstPageOnly">First Page Only</option>
              <option value="excludeFirstPage">Exclude First Page</option>
              <option value="range">Custom Range</option>
            </select>
            {rangeMode === 'range' && (
              <input
                data-testid="input-watermark-custom-range"
                placeholder="e.g. 1-3"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                style={{
                  width: 80,
                  padding: '4px 6px',
                  fontSize: 12,
                  border: '1px solid var(--bg-border)',
                  borderRadius: 4
                }}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button
            data-testid="btn-watermark-cancel"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: 4,
              border: '1px solid var(--bg-border)',
              background: 'transparent',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            data-testid="btn-watermark-apply"
            onClick={handleApply}
            style={{
              padding: '6px 16px',
              borderRadius: 4,
              border: 'none',
              background: 'var(--bg-primary)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Apply Watermark
          </button>
        </div>
      </div>
    </Dialog>
  );
};
