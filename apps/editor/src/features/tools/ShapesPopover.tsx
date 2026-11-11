import React, { useState } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import {
  Square,
  Circle,
  Triangle,
  Star,
  Minus,
  MoveRight,
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import type { ShapeType, ShapeOptions, ShapeObject } from '@rhypdf/edit-core';
import { createShape, createWhiteoutCover } from '@rhypdf/edit-core';

export interface ShapesPopoverProps {
  onInsertShape: (shape: ShapeObject) => void;
  pageWidthPt?: number;
  pageHeightPt?: number;
}

export const ShapesPopover: React.FC<ShapesPopoverProps> = ({
  onInsertShape,
  pageWidthPt = 612,
  pageHeightPt = 792
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ShapeType>('rectangle');
  const [fillColor, setFillColor] = useState('#3b82f6');
  const [strokeColor, setStrokeColor] = useState('#1d4ed8');
  const [lineWidth, setLineWidth] = useState(2);
  const [opacity] = useState(1);
  const [hasFill, setHasFill] = useState(true);
  const [hasStroke, setHasStroke] = useState(true);
  const [isDashed, setIsDashed] = useState(false);

  const shapes: { type: ShapeType; label: string; icon: React.ReactNode }[] = [
    { type: 'rectangle', label: 'Rectangle', icon: <Square size={16} /> },
    {
      type: 'roundedRectangle',
      label: 'Rounded Rect',
      icon: <Square size={16} style={{ borderRadius: 4 }} />
    },
    { type: 'ellipse', label: 'Ellipse', icon: <Circle size={16} /> },
    { type: 'line', label: 'Line', icon: <Minus size={16} /> },
    { type: 'arrow', label: 'Arrow', icon: <MoveRight size={16} /> },
    { type: 'triangle', label: 'Triangle', icon: <Triangle size={16} /> },
    { type: 'star', label: 'Star', icon: <Star size={16} /> }
  ];

  const hexToRgba = (hex: string, alpha: number = 1) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return { r, g, b, a: Math.round(alpha * 255) };
  };

  const handleInsert = () => {
    // Center shape on the page with default 120x80 size
    const width = selectedType === 'line' || selectedType === 'arrow' ? 140 : 120;
    const height = selectedType === 'line' || selectedType === 'arrow' ? 2 : 80;
    const cx = pageWidthPt / 2;
    const cy = pageHeightPt / 2;

    const bounds = {
      left: cx - width / 2,
      bottom: cy - height / 2,
      right: cx + width / 2,
      top: cy + height / 2
    };

    const options: ShapeOptions = {
      fill: hasFill,
      fillColor: hexToRgba(fillColor, opacity),
      stroke: hasStroke,
      strokeColor: hexToRgba(strokeColor, opacity),
      lineWidth,
      lineDash: isDashed ? [6, 4] : [],
      opacity
    };

    const shape = createShape(selectedType, bounds, options);
    onInsertShape(shape);
    setIsOpen(false);
  };

  const handleInsertWhiteout = () => {
    const width = 150;
    const height = 40;
    const cx = pageWidthPt / 2;
    const cy = pageHeightPt / 2;

    const bounds = {
      left: cx - width / 2,
      bottom: cy - height / 2,
      right: cx + width / 2,
      top: cy + height / 2
    };

    const cover = createWhiteoutCover(bounds);
    onInsertShape(cover);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        data-testid="btn-shapes-menu"
        onClick={() => setIsOpen(!isOpen)}
        title={t('editor.tools.shapes', 'Shapes')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--bg-border)',
          backgroundColor: isOpen ? 'var(--bg-secondary)' : 'var(--bg-card)',
          color: 'var(--bg-foreground)',
          cursor: 'pointer',
          fontSize: 13
        }}
      >
        <Square size={16} />
        <span>{t('editor.tools.shapes', 'Shapes')}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div
          data-testid="popover-shapes"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            zIndex: 1000,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: 12,
            width: 260,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--bg-muted-foreground)' }}>
            {t('editor.tools.selectShape', 'Select Shape')}
          </div>

          {/* Shape Types Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {shapes.map((s) => (
              <button
                key={s.type}
                data-testid={`shape-option-${s.type}`}
                onClick={() => setSelectedType(s.type)}
                title={s.label}
                style={{
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  border:
                    selectedType === s.type
                      ? '2px solid var(--bg-primary)'
                      : '1px solid var(--bg-border)',
                  backgroundColor: selectedType === s.type ? 'var(--bg-secondary)' : 'transparent',
                  color: 'inherit',
                  cursor: 'pointer'
                }}
              >
                {s.icon}
              </button>
            ))}
          </div>

          {/* Stroke & Fill Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  data-testid="shape-has-fill"
                  checked={hasFill}
                  onChange={(e) => setHasFill(e.target.checked)}
                />
                Fill
              </label>
              {hasFill && (
                <input
                  type="color"
                  data-testid="shape-fill-color"
                  value={fillColor}
                  onChange={(e) => setFillColor(e.target.value)}
                  style={{
                    width: 24,
                    height: 24,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'transparent'
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  data-testid="shape-has-stroke"
                  checked={hasStroke}
                  onChange={(e) => setHasStroke(e.target.checked)}
                />
                Stroke
              </label>
              {hasStroke && (
                <input
                  type="color"
                  data-testid="shape-stroke-color"
                  value={strokeColor}
                  onChange={(e) => setStrokeColor(e.target.value)}
                  style={{
                    width: 24,
                    height: 24,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'transparent'
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Width</span>
              <input
                type="range"
                min="1"
                max="12"
                data-testid="shape-stroke-width"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                style={{ width: 100 }}
              />
              <span>{lineWidth}pt</span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="checkbox"
                data-testid="shape-is-dashed"
                checked={isDashed}
                onChange={(e) => setIsDashed(e.target.checked)}
              />
              Dashed border
            </label>
          </div>

          <button
            data-testid="btn-insert-shape-confirm"
            onClick={handleInsert}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--bg-primary)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: 13
            }}
          >
            Insert Shape
          </button>

          <hr
            style={{ border: 'none', borderTop: '1px solid var(--bg-border)', margin: '4px 0' }}
          />

          {/* Whiteout / Cover Tool (Task 11.3) */}
          <button
            data-testid="btn-insert-whiteout"
            onClick={handleInsertWhiteout}
            title="Opaque white cover box (Visual overlay - not permanent redaction)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--bg-foreground)',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            <ShieldAlert size={14} color="#f59e0b" />
            <span>Whiteout / Cover</span>
          </button>
        </div>
      )}
    </div>
  );
};
