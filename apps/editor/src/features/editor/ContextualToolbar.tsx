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
  ArrowDown,
  FlipHorizontal,
  FlipVertical,
  Image as ImageIcon,
  Check,
  X,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useDocStore } from '../../stores/docStore';
import type { CropPreset } from '@rhypdf/edit-core';

export interface ContextualToolbarProps {
  onRotateCw?: () => void;
  onRotateCcw?: () => void;
  onFlipHorizontal?: () => void;
  onFlipVertical?: () => void;
  onCrop?: (preset: CropPreset) => void;
  onApplyCrop?: () => void;
  onCancelCrop?: () => void;
  isCropping?: boolean;
  onReplaceImage?: () => void;
  onInsertImage?: () => void;
  onDeleteImage?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onOpacityChange?: (opacity: number) => void;
  effectiveDpi?: number | null;
  isLowRes?: boolean;
  hasSelectedImage?: boolean;
}

export const ContextualToolbar: React.FC<ContextualToolbarProps> = ({
  onRotateCw,
  onRotateCcw,
  onFlipHorizontal,
  onFlipVertical,
  onCrop,
  onApplyCrop,
  onCancelCrop,
  isCropping = false,
  onReplaceImage,
  onInsertImage,
  onDeleteImage,
  onBringForward,
  onSendBackward,
  onOpacityChange,
  effectiveDpi = null,
  isLowRes = false,
  hasSelectedImage = false
}) => {
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
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {/* Add Image */}
          <button
            data-testid="btn-insert-image"
            onClick={onInsertImage}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500
            }}
          >
            <ImageIcon size={15} />
            <span>Add Image</span>
          </button>

          {/* Crop Controls (Task 6.6) */}
          {!isCropping ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button
                data-testid="btn-image-crop"
                disabled={!hasSelectedImage}
                onClick={() => onCrop?.('free')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: hasSelectedImage ? 'pointer' : 'not-allowed',
                  opacity: hasSelectedImage ? 1 : 0.5,
                  fontSize: 12
                }}
              >
                <Crop size={14} />
                <span>{t('editor.toolbar.cropImage')}</span>
              </button>
              {hasSelectedImage && (
                <select
                  data-testid="select-crop-preset"
                  onChange={(e) => onCrop?.(e.target.value as CropPreset)}
                  defaultValue="free"
                  style={{
                    padding: '4px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--bg-border)',
                    backgroundColor: 'var(--bg-card)',
                    fontSize: 11
                  }}
                >
                  <option value="free">Free</option>
                  <option value="1:1">1:1</option>
                  <option value="4:3">4:3</option>
                  <option value="16:9">16:9</option>
                </select>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                data-testid="btn-apply-crop"
                onClick={onApplyCrop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Check size={14} />
                <span>Apply</span>
              </button>
              <button
                data-testid="btn-cancel-crop"
                onClick={onCancelCrop}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {hasSelectedImage && (
            <>
              {/* Replace Image (Task 6.8) */}
              <button
                data-testid="btn-replace-image"
                onClick={onReplaceImage}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                <RefreshCw size={14} />
                <span>Replace</span>
              </button>

              {/* 90° Rotate Buttons (Task 6.5) */}
              <button
                data-testid="btn-image-rotate-ccw"
                onClick={onRotateCcw}
                title="Rotate 90° CCW"
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer'
                }}
              >
                <RotateCcw size={14} />
              </button>
              <button
                data-testid="btn-image-rotate-cw"
                onClick={onRotateCw}
                title="Rotate 90° CW"
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer'
                }}
              >
                <RotateCw size={14} />
              </button>

              {/* Flip Buttons (Task 6.5) */}
              <button
                data-testid="btn-image-flip-h"
                onClick={onFlipHorizontal}
                title="Flip Horizontal"
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer'
                }}
              >
                <FlipHorizontal size={14} />
              </button>
              <button
                data-testid="btn-image-flip-v"
                onClick={onFlipVertical}
                title="Flip Vertical"
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer'
                }}
              >
                <FlipVertical size={14} />
              </button>

              {/* Layer Order (Task 6.11) */}
              <button
                data-testid="btn-image-forward"
                onClick={onBringForward}
                title="Bring Forward"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                <ArrowUp size={14} />
              </button>
              <button
                data-testid="btn-image-backward"
                onClick={onSendBackward}
                title="Send Backward"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  cursor: 'pointer',
                  fontSize: 12
                }}
              >
                <ArrowDown size={14} />
              </button>

              {/* Opacity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span>{t('editor.toolbar.opacity')}:</span>
                <input
                  data-testid="input-image-opacity"
                  type="range"
                  min="0"
                  max="100"
                  value={imageOpacity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setImageOpacity(val);
                    onOpacityChange?.(val);
                  }}
                  style={{ width: 70 }}
                />
                <span>{imageOpacity}%</span>
              </div>

              {/* Low Resolution Warning Badge (Task 6.4) */}
              {isLowRes && effectiveDpi && (
                <div
                  data-testid="toolbar-low-dpi-warning"
                  title="Low resolution: image may appear pixelated when printed"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#b45309',
                    fontSize: 11,
                    fontWeight: 600
                  }}
                >
                  <AlertTriangle size={13} color="#f59e0b" />
                  <span>{effectiveDpi} DPI</span>
                </div>
              )}

              {/* Delete Image (Task 6.7) */}
              <button
                data-testid="btn-image-delete"
                onClick={onDeleteImage}
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
                  fontSize: 12
                }}
              >
                <Trash2 size={14} />
                <span>{t('editor.toolbar.deleteImage')}</span>
              </button>
            </>
          )}
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
