import React, { useState, useEffect } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { ChevronRight, ChevronLeft, Sliders, Info } from 'lucide-react';
import { useDocStore } from '../../stores/docStore';

export interface SelectedObjectProps {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

export interface PropertiesPanelProps {
  open: boolean;
  onToggle: () => void;
  selectedObject?: SelectedObjectProps | null;
  onUpdateObject?: (updates: Partial<SelectedObjectProps>) => void;
  pageWidth?: number;
  pageHeight?: number;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  open,
  onToggle,
  selectedObject = null,
  onUpdateObject,
  pageWidth = 595.28,
  pageHeight = 841.89
}) => {
  const { t } = useTranslation();
  const { pageCount } = useDocStore();

  const [x, setX] = useState<number>(selectedObject?.x ?? 0);
  const [y, setY] = useState<number>(selectedObject?.y ?? 0);
  const [w, setW] = useState<number>(selectedObject?.width ?? 100);
  const [h, setH] = useState<number>(selectedObject?.height ?? 100);
  const [rotation, setRotation] = useState<number>(selectedObject?.rotation ?? 0);
  const [opacity, setOpacity] = useState<number>(selectedObject?.opacity ?? 100);

  useEffect(() => {
    if (selectedObject) {
      setX(selectedObject.x);
      setY(selectedObject.y);
      setW(selectedObject.width);
      setH(selectedObject.height);
      setRotation(selectedObject.rotation);
      setOpacity(selectedObject.opacity);
    }
  }, [selectedObject]);

  if (!open) {
    return (
      <button
        data-testid="btn-toggle-properties-open"
        onClick={onToggle}
        aria-label={t('editor.properties.title')}
        style={{
          position: 'absolute',
          right: 0,
          top: 60,
          zIndex: 10,
          width: 24,
          height: 48,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--bg-border)',
          borderRight: 'none',
          borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--bg-muted-foreground)'
        }}
      >
        <ChevronLeft size={16} />
      </button>
    );
  }

  return (
    <aside
      data-testid="properties-panel"
      style={{
        width: 260,
        backgroundColor: 'var(--bg-card)',
        borderLeft: '1px solid var(--bg-border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflowY: 'auto',
        flexShrink: 0
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--bg-border)'
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}
        >
          <Sliders size={16} />
          <span>{t('editor.properties.title')}</span>
        </div>
        <button
          data-testid="btn-toggle-properties-close"
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--bg-muted-foreground)'
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Object Geometry Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--bg-muted-foreground)'
            }}
          >
            {t('editor.properties.geometry')}
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>X (pt)</label>
              <input
                data-testid="input-prop-x"
                type="number"
                value={x}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setX(val);
                  onUpdateObject?.({ x: val });
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'inherit',
                  fontSize: 13
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>Y (pt)</label>
              <input
                data-testid="input-prop-y"
                type="number"
                value={y}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setY(val);
                  onUpdateObject?.({ y: val });
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'inherit',
                  fontSize: 13
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>W (pt)</label>
              <input
                data-testid="input-prop-w"
                type="number"
                value={w}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 10;
                  setW(val);
                  onUpdateObject?.({ width: val });
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'inherit',
                  fontSize: 13
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>H (pt)</label>
              <input
                data-testid="input-prop-h"
                type="number"
                value={h}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 10;
                  setH(val);
                  onUpdateObject?.({ height: val });
                }}
                style={{
                  width: '100%',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'inherit',
                  fontSize: 13
                }}
              />
            </div>
          </div>

          {/* Rotation */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>
              {t('editor.properties.rotation')}
            </label>
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  data-testid={`btn-rotate-${deg}`}
                  onClick={() => {
                    setRotation(deg);
                    onUpdateObject?.({ rotation: deg });
                  }}
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    fontSize: 11,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--bg-border)',
                    backgroundColor: rotation === deg ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                    color: rotation === deg ? '#ffffff' : 'inherit',
                    cursor: 'pointer'
                  }}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                color: 'var(--bg-muted-foreground)'
              }}
            >
              <span>{t('editor.properties.opacity')}</span>
              <span>{opacity}%</span>
            </div>
            <input
              data-testid="input-prop-opacity"
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setOpacity(val);
                onUpdateObject?.({ opacity: val });
              }}
              style={{ width: '100%', marginTop: 4 }}
            />
          </div>
        </section>

        {/* Document Info Section */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            borderTop: '1px solid var(--bg-border)',
            paddingTop: 16
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--bg-muted-foreground)'
            }}
          >
            <Info size={14} />
            <span>{t('editor.properties.docInfo')}</span>
          </div>

          <div style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--bg-muted-foreground)' }}>
                {t('editor.properties.pages')}:
              </span>
              <span style={{ fontWeight: 500 }}>{pageCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--bg-muted-foreground)' }}>
                {t('editor.properties.pageSize')}:
              </span>
              <span style={{ fontWeight: 500 }}>
                {Math.round(pageWidth)} × {Math.round(pageHeight)} pt
              </span>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
};
