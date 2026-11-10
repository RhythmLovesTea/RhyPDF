import React, { useState } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Pen,
  Highlighter,
  Eraser,
  RotateCw,
  RotateCcw,
  Trash2,
  Crop,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { useDocStore } from '../../stores/docStore';

export const ContextualToolbar: React.FC = () => {
  const { t } = useTranslation();
  const { activeMode } = useDocStore();

  // Text formatting state
  const [fontFamily, setFontFamily] = useState('Roboto');
  const [fontSize, setFontSize] = useState(14);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [align, setAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [textColor, setTextColor] = useState('#000000');

  // Annotation state
  const [annotateTool, setAnnotateTool] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [drawColor, setDrawColor] = useState('#ef4444');

  // Image state
  const [imageOpacity, setImageOpacity] = useState(100);

  return (
    <div
      data-testid="contextual-toolbar"
      style={{
        height: 44,
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--bg-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        overflowX: 'auto',
        flexShrink: 0
      }}
    >
      {/* TEXT EDITING CONTROLS */}
      {activeMode === 'edit-text' && (
        <div
          data-testid="contextual-text-tools"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <select
            data-testid="select-font-family"
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              color: 'inherit',
              fontSize: 13
            }}
          >
            <option value="Roboto">Roboto</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Inter">Inter</option>
            <option value="Liberation Sans">Liberation Sans</option>
            <option value="Merriweather">Merriweather</option>
          </select>

          {/* Font size stepper */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              border: '1px solid var(--bg-border)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <button
              data-testid="btn-font-size-dec"
              onClick={() => setFontSize((s) => Math.max(6, s - 1))}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer'
              }}
            >
              −
            </button>
            <span
              data-testid="text-font-size"
              style={{ fontSize: 13, minWidth: 24, textAlign: 'center' }}
            >
              {fontSize}
            </span>
            <button
              data-testid="btn-font-size-inc"
              onClick={() => setFontSize((s) => Math.min(144, s + 1))}
              style={{
                padding: '4px 8px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer'
              }}
            >
              +
            </button>
          </div>

          <div
            style={{ width: 1, height: 20, backgroundColor: 'var(--bg-border)', margin: '0 4px' }}
          />

          {/* Style toggles */}
          <button
            data-testid="btn-style-bold"
            onClick={() => setIsBold((b) => !b)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: isBold ? 'var(--bg-secondary)' : 'transparent',
              color: isBold ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <Bold size={16} />
          </button>
          <button
            data-testid="btn-style-italic"
            onClick={() => setIsItalic((i) => !i)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: isItalic ? 'var(--bg-secondary)' : 'transparent',
              color: isItalic ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <Italic size={16} />
          </button>
          <button
            data-testid="btn-style-underline"
            onClick={() => setIsUnderline((u) => !u)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: isUnderline ? 'var(--bg-secondary)' : 'transparent',
              color: isUnderline ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <Underline size={16} />
          </button>
          <button
            data-testid="btn-style-strike"
            onClick={() => setIsStrike((s) => !s)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: isStrike ? 'var(--bg-secondary)' : 'transparent',
              color: isStrike ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <Strikethrough size={16} />
          </button>

          {/* Color input */}
          <input
            data-testid="input-text-color"
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            style={{
              width: 28,
              height: 28,
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          />

          <div
            style={{ width: 1, height: 20, backgroundColor: 'var(--bg-border)', margin: '0 4px' }}
          />

          {/* Alignment */}
          <button
            data-testid="btn-align-left"
            onClick={() => setAlign('left')}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: align === 'left' ? 'var(--bg-secondary)' : 'transparent',
              color: align === 'left' ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <AlignLeft size={16} />
          </button>
          <button
            data-testid="btn-align-center"
            onClick={() => setAlign('center')}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: align === 'center' ? 'var(--bg-secondary)' : 'transparent',
              color: align === 'center' ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <AlignCenter size={16} />
          </button>
          <button
            data-testid="btn-align-right"
            onClick={() => setAlign('right')}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: align === 'right' ? 'var(--bg-secondary)' : 'transparent',
              color: align === 'right' ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <AlignRight size={16} />
          </button>
          <button
            data-testid="btn-align-justify"
            onClick={() => setAlign('justify')}
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: align === 'justify' ? 'var(--bg-secondary)' : 'transparent',
              color: align === 'justify' ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <AlignJustify size={16} />
          </button>
        </div>
      )}

      {/* IMAGE EDITING CONTROLS */}
      {activeMode === 'edit-images' && (
        <div
          data-testid="contextual-image-tools"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <button
            data-testid="btn-image-crop"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Crop size={16} />
            <span>{t('editor.toolbar.cropImage')}</span>
          </button>

          <button
            data-testid="btn-image-forward"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <ArrowUp size={16} />
            <span>{t('editor.toolbar.bringForward')}</span>
          </button>

          <button
            data-testid="btn-image-backward"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <ArrowDown size={16} />
            <span>{t('editor.toolbar.sendBackward')}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span>{t('editor.toolbar.opacity')}:</span>
            <input
              data-testid="input-image-opacity"
              type="range"
              min="10"
              max="100"
              value={imageOpacity}
              onChange={(e) => setImageOpacity(parseInt(e.target.value))}
              style={{ width: 80 }}
            />
            <span>{imageOpacity}%</span>
          </div>

          <button
            data-testid="btn-image-delete"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #fee2e2',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Trash2 size={16} />
            <span>{t('editor.toolbar.deleteImage')}</span>
          </button>
        </div>
      )}

      {/* ANNOTATION CONTROLS */}
      {activeMode === 'annotate' && (
        <div
          data-testid="contextual-annotate-tools"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <button
            data-testid="btn-annotate-pen"
            onClick={() => setAnnotateTool('pen')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: annotateTool === 'pen' ? 'var(--bg-primary)' : 'var(--bg-secondary)',
              color: annotateTool === 'pen' ? '#ffffff' : 'inherit',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Pen size={16} />
            <span>{t('editor.toolbar.pen')}</span>
          </button>

          <button
            data-testid="btn-annotate-highlighter"
            onClick={() => setAnnotateTool('highlighter')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor:
                annotateTool === 'highlighter' ? 'var(--bg-primary)' : 'var(--bg-secondary)',
              color: annotateTool === 'highlighter' ? '#ffffff' : 'inherit',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Highlighter size={16} />
            <span>{t('editor.toolbar.highlighter')}</span>
          </button>

          <button
            data-testid="btn-annotate-eraser"
            onClick={() => setAnnotateTool('eraser')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor:
                annotateTool === 'eraser' ? 'var(--bg-primary)' : 'var(--bg-secondary)',
              color: annotateTool === 'eraser' ? '#ffffff' : 'inherit',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Eraser size={16} />
            <span>{t('editor.toolbar.eraser')}</span>
          </button>

          <div
            style={{ width: 1, height: 20, backgroundColor: 'var(--bg-border)', margin: '0 4px' }}
          />

          <input
            data-testid="input-draw-color"
            type="color"
            value={drawColor}
            onChange={(e) => setDrawColor(e.target.value)}
            style={{
              width: 28,
              height: 28,
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
          />

          <select
            data-testid="select-stroke-width"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            style={{
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              color: 'inherit',
              fontSize: 13
            }}
          >
            <option value="1">1 px</option>
            <option value="2">2 px</option>
            <option value="4">4 px</option>
            <option value="8">8 px</option>
          </select>
        </div>
      )}

      {/* VIEW CONTROLS */}
      {activeMode === 'view' && (
        <div
          data-testid="contextual-view-tools"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--bg-muted-foreground)'
          }}
        >
          <span>{t('editor.viewer.renderSurface')}</span>
        </div>
      )}

      {/* PAGES CONTROLS */}
      {activeMode === 'pages' && (
        <div
          data-testid="contextual-pages-tools"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <button
            data-testid="btn-pages-rotate-cw"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <RotateCw size={16} />
            <span>{t('pages.rotateCw')}</span>
          </button>
          <button
            data-testid="btn-pages-rotate-ccw"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <RotateCcw size={16} />
            <span>{t('pages.rotateCcw')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
