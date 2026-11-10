import React, { useState, useEffect } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import {
  ChevronRight,
  ChevronLeft,
  Sliders,
  Info,
  FlipHorizontal,
  FlipVertical,
  ArrowUp,
  ArrowDown,
  Download,
  AlertTriangle,
  RotateCw,
  RotateCcw
} from 'lucide-react';
import { useDocStore } from '../../stores/docStore';
import { convertPtToUnit, UnitType } from '@rhypdf/edit-core';

export interface SelectedObjectProps {
  id?: string;
  type?: 'text' | 'image' | 'path' | 'form' | 'annotation';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  pixelWidth?: number;
  pixelHeight?: number;
  effectiveDpi?: number;
  isLowRes?: boolean;
  brightness?: number;
  contrast?: number;
  grayscale?: boolean;
}

export interface PropertiesPanelProps {
  open: boolean;
  onToggle: () => void;
  selectedObject?: SelectedObjectProps | null;
  onUpdateObject?: (updates: Partial<SelectedObjectProps>) => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  onRotateCw?: () => void;
  onRotateCcw?: () => void;
  onDownloadImage?: () => void;
  pageWidth?: number;
  pageHeight?: number;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  open,
  onToggle,
  selectedObject = null,
  onUpdateObject,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onFlipHorizontal,
  onFlipVertical,
  onRotateCw,
  onRotateCcw,
  onDownloadImage,
  pageWidth = 595.28,
  pageHeight = 841.89
}) => {
  const { t } = useTranslation();
  const { pageCount } = useDocStore();

  const [unit, setUnit] = useState<UnitType>('pt');
  const [x, setX] = useState<number>(selectedObject?.x ?? 0);
  const [y, setY] = useState<number>(selectedObject?.y ?? 0);
  const [w, setW] = useState<number>(selectedObject?.width ?? 100);
  const [h, setH] = useState<number>(selectedObject?.height ?? 100);
  const [rotation, setRotation] = useState<number>(selectedObject?.rotation ?? 0);
  const [opacity, setOpacity] = useState<number>(selectedObject?.opacity ?? 100);
  const [brightness, setBrightness] = useState<number>(selectedObject?.brightness ?? 0);
  const [contrast, setContrast] = useState<number>(selectedObject?.contrast ?? 0);
  const [grayscale, setGrayscale] = useState<boolean>(selectedObject?.grayscale ?? false);

  useEffect(() => {
    if (selectedObject) {
      setX(selectedObject.x);
      setY(selectedObject.y);
      setW(selectedObject.width);
      setH(selectedObject.height);
      setRotation(selectedObject.rotation);
      setOpacity(selectedObject.opacity);
      setBrightness(selectedObject.brightness ?? 0);
      setContrast(selectedObject.contrast ?? 0);
      setGrayscale(selectedObject.grayscale ?? false);
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

  const isImage = selectedObject?.type === 'image';
  const effectiveDpi =
    selectedObject?.effectiveDpi ??
    (isImage ? Math.round(((selectedObject?.pixelWidth || 100) * 72) / (w || 1)) : null);
  const isLowRes = effectiveDpi !== null && effectiveDpi < 150;

  return (
    <aside
      data-testid="properties-panel"
      style={{
        width: 280,
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

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Unit Selector & Geometry Section */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            {/* Unit selector (pt / px / mm / in) */}
            <select
              data-testid="select-prop-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value as UnitType)}
              style={{
                fontSize: 11,
                padding: '2px 4px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'inherit'
              }}
            >
              <option value="pt">pt</option>
              <option value="px">px</option>
              <option value="mm">mm</option>
              <option value="in">in</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>
                X ({unit}): {convertPtToUnit(x, unit)}
              </label>
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
              <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>
                Y ({unit}): {convertPtToUnit(y, unit)}
              </label>
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
              <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>
                W ({unit}): {convertPtToUnit(w, unit)}
              </label>
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
              <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>
                H ({unit}): {convertPtToUnit(h, unit)}
              </label>
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

          {/* Low DPI Warning Banner (Task 6.4) */}
          {isImage && isLowRes && (
            <div
              data-testid="low-dpi-warning"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #f59e0b',
                color: '#b45309',
                fontSize: 11,
                fontWeight: 500
              }}
            >
              <AlertTriangle size={14} color="#f59e0b" />
              <span>Low resolution: {effectiveDpi} DPI (ideal &ge; 150 DPI)</span>
            </div>
          )}

          {/* Pixel Size & DPI summary for images */}
          {isImage && selectedObject?.pixelWidth && selectedObject?.pixelHeight && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--bg-muted-foreground)',
                display: 'flex',
                justifyContent: 'space-between'
              }}
            >
              <span>
                Pixels: {selectedObject.pixelWidth} × {selectedObject.pixelHeight} px
              </span>
              <span>{effectiveDpi} DPI</span>
            </div>
          )}

          {/* Rotation & Flip Controls (Task 6.5) */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>
              {t('editor.properties.rotation')} &amp; Flip
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
              <button
                data-testid="btn-prop-rotate-ccw"
                onClick={onRotateCcw}
                title="Rotate 90° CCW"
                style={{
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={12} />
              </button>
              <button
                data-testid="btn-prop-rotate-cw"
                onClick={onRotateCw}
                title="Rotate 90° CW"
                style={{
                  padding: '4px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  cursor: 'pointer'
                }}
              >
                <RotateCw size={12} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <button
                data-testid="btn-flip-horizontal"
                onClick={onFlipHorizontal}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'inherit',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                <FlipHorizontal size={14} />
                <span>Flip H</span>
              </button>
              <button
                data-testid="btn-flip-vertical"
                onClick={onFlipVertical}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'inherit',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                <FlipVertical size={14} />
                <span>Flip V</span>
              </button>
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

        {/* Image Adjustments Section (Task 6.10: brightness, contrast, grayscale) */}
        {isImage && (
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              borderTop: '1px solid var(--bg-border)',
              paddingTop: 14
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--bg-muted-foreground)'
              }}
            >
              Image Adjustments
            </span>

            {/* Brightness */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--bg-muted-foreground)'
                }}
              >
                <span>Brightness</span>
                <span>{brightness}%</span>
              </div>
              <input
                data-testid="input-prop-brightness"
                type="range"
                min="-100"
                max="100"
                value={brightness}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setBrightness(val);
                  onUpdateObject?.({ brightness: val });
                }}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            {/* Contrast */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'var(--bg-muted-foreground)'
                }}
              >
                <span>Contrast</span>
                <span>{contrast}%</span>
              </div>
              <input
                data-testid="input-prop-contrast"
                type="range"
                min="-100"
                max="100"
                value={contrast}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setContrast(val);
                  onUpdateObject?.({ contrast: val });
                }}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            {/* Grayscale Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 12
              }}
            >
              <span>Grayscale (B&amp;W)</span>
              <input
                data-testid="checkbox-prop-grayscale"
                type="checkbox"
                checked={grayscale}
                onChange={(e) => {
                  setGrayscale(e.target.checked);
                  onUpdateObject?.({ grayscale: e.target.checked });
                }}
              />
            </div>
          </section>
        )}

        {/* Layer Order (Task 6.11) */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            borderTop: '1px solid var(--bg-border)',
            paddingTop: 14
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: 'uppercase',
              color: 'var(--bg-muted-foreground)'
            }}
          >
            Layer Order
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <button
              data-testid="btn-bring-forward"
              onClick={onBringForward}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 8px',
                fontSize: 11,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer'
              }}
            >
              <ArrowUp size={14} />
              <span>Bring Forward</span>
            </button>
            <button
              data-testid="btn-send-backward"
              onClick={onSendBackward}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                padding: '6px 8px',
                fontSize: 11,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer'
              }}
            >
              <ArrowDown size={14} />
              <span>Send Backward</span>
            </button>
            <button
              data-testid="btn-bring-to-front"
              onClick={onBringToFront}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 8px',
                fontSize: 11,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer'
              }}
            >
              Bring to Front
            </button>
            <button
              data-testid="btn-send-to-back"
              onClick={onSendToBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px 8px',
                fontSize: 11,
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer'
              }}
            >
              Send to Back
            </button>
          </div>

          <p style={{ fontSize: 10, color: 'var(--bg-muted-foreground)', marginTop: 2 }}>
            ℹ️ PDF has a fixed layout; text does not wrap around images.
          </p>
        </section>

        {/* Extract / Download Image Action (Task 6.12) */}
        {isImage && (
          <section
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              borderTop: '1px solid var(--bg-border)',
              paddingTop: 14
            }}
          >
            <button
              data-testid="btn-download-image"
              onClick={onDownloadImage}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'inherit',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              <Download size={14} />
              <span>Extract / Download Image</span>
            </button>
          </section>
        )}

        {/* Document Info Section */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            borderTop: '1px solid var(--bg-border)',
            paddingTop: 14
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
