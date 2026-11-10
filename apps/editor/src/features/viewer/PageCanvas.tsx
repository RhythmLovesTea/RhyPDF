import React, { useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { THEME_TOKENS } from '@rhypdf/ui';

export interface PageCanvasProps {
  pageNumber: number; // 1-indexed for display
  width: number; // PDF points width
  height: number; // PDF points height
  rotation?: 0 | 90 | 180 | 270;
  scale: number;
  dpr?: number;
  bitmap?: ImageBitmap | null;
  isLoading?: boolean;
  accessibleLabel?: string;
  theme?: 'light' | 'dark';
  placeholder?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const PageCanvas: React.FC<PageCanvasProps> = ({
  pageNumber,
  width,
  height,
  rotation = 0,
  scale,
  dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  bitmap = null,
  isLoading = false,
  accessibleLabel,
  theme = 'light',
  placeholder,
  children,
  className = '',
  style,
  onClick
}) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Take 90 / 270 rotation into account for aspect ratio and dimensions
  const isSideways = rotation === 90 || rotation === 270;
  const effWidthPt = isSideways ? height : width;
  const effHeightPt = isSideways ? width : height;

  const cssWidth = Math.max(1, Math.round(effWidthPt * scale));
  const cssHeight = Math.max(1, Math.round(effHeightPt * scale));

  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

  const label =
    accessibleLabel ||
    t('editor.viewer.pageLabel', { page: pageNumber, defaultValue: `Page ${pageNumber}` });

  // Draw bitmap whenever bitmap or dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (bitmap) {
      if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    } else {
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [bitmap, pixelWidth, pixelHeight]);

  const isDark = theme === 'dark';

  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      position: 'relative',
      width: cssWidth,
      height: cssHeight,
      backgroundColor: isDark ? '#1e293b' : '#ffffff',
      color: isDark ? '#f8fafc' : '#0f172a',
      borderRadius: THEME_TOKENS.radius.sm,
      boxShadow: isDark
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
      boxSizing: 'border-box',
      overflow: 'hidden',
      userSelect: 'none',
      ...style
    }),
    [cssWidth, cssHeight, isDark, style]
  );

  return (
    <div
      data-testid={`page-canvas-container-${pageNumber}`}
      role="img"
      aria-label={label}
      aria-busy={isLoading}
      tabIndex={0}
      className={`page-canvas-container ${className}`}
      style={containerStyle}
      onClick={onClick}
    >
      <canvas
        ref={canvasRef}
        data-testid={`page-canvas-${pageNumber}`}
        width={pixelWidth}
        height={pixelHeight}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      />

      {/* Placeholder / Shimmer when loading or bitmap not ready */}
      {(!bitmap || isLoading) && (
        <div
          data-testid={`page-canvas-placeholder-${pageNumber}`}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(248, 250, 252, 0.85)',
            pointerEvents: 'none'
          }}
        >
          {placeholder ? (
            placeholder
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                padding: 16,
                textAlign: 'center'
              }}
            >
              <div
                className="page-shimmer"
                style={{
                  width: Math.min(cssWidth * 0.7, 160),
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: isDark ? '#334155' : '#e2e8f0'
                }}
              />
              <div
                className="page-shimmer"
                style={{
                  width: Math.min(cssWidth * 0.5, 110),
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: isDark ? '#334155' : '#e2e8f0'
                }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: isDark ? '#94a3b8' : '#64748b',
                  fontWeight: 500,
                  marginTop: 4
                }}
              >
                {t('editor.viewer.loadingPage', {
                  page: pageNumber,
                  defaultValue: `Loading page ${pageNumber}...`
                })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Overlay slot (for text selection, highlight, editor objects) */}
      {children && (
        <div
          data-testid={`page-overlay-${pageNumber}`}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'auto'
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};
