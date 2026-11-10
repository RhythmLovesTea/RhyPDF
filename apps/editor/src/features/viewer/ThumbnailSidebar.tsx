import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { THEME_TOKENS } from '@rhypdf/ui';
import type { PageDimension } from './VirtualPageList';

export interface ThumbnailSidebarProps {
  pageCount: number;
  currentPage: number; // 1-indexed
  getPageDimension: (pageIndex: number) => PageDimension;
  onSelectPage: (pageIndex: number) => void;
  renderThumbnail?: (pageIndex: number) => Promise<ImageBitmap> | ImageBitmap | null;
  theme?: 'light' | 'dark';
  isOpen?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

interface ThumbnailItemProps {
  pageIndex: number;
  isActive: boolean;
  dimension: PageDimension;
  onSelect: (pageIndex: number) => void;
  renderThumbnail?: (pageIndex: number) => Promise<ImageBitmap> | ImageBitmap | null;
  theme: 'light' | 'dark';
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  pageIndex,
  isActive,
  dimension,
  onSelect,
  renderThumbnail,
  theme
}) => {
  const { t } = useTranslation();
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const itemRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isSideways = dimension.rotation === 90 || dimension.rotation === 270;
  const effW = isSideways ? dimension.height : dimension.width;
  const effH = isSideways ? dimension.width : dimension.height;
  const aspectRatio = effH / effW;

  const thumbWidth = 130;
  const thumbHeight = Math.round(thumbWidth * aspectRatio);

  // Lazy render using IntersectionObserver
  useEffect(() => {
    const el = itemRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: '100px' }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Fetch thumbnail when visible
  useEffect(() => {
    if (!isVisible || !renderThumbnail) return;

    let isCancelled = false;
    const result = renderThumbnail(pageIndex);

    if (result instanceof Promise) {
      result
        .then((bmp) => {
          if (!isCancelled && bmp) {
            setBitmap(bmp);
          }
        })
        .catch(() => {
          // ignore cancelled thumbnail
        });
    } else if (result) {
      setBitmap(result);
    }

    return () => {
      isCancelled = true;
    };
  }, [isVisible, pageIndex, renderThumbnail]);

  // Draw to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }, [bitmap]);

  const isDark = theme === 'dark';

  return (
    <div
      ref={itemRef}
      role="option"
      aria-selected={isActive}
      tabIndex={0}
      data-testid={`thumbnail-item-${pageIndex}`}
      data-is-active={isActive}
      onClick={() => onSelect(pageIndex)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(pageIndex);
        }
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 12px',
        cursor: 'pointer',
        outline: 'none',
        borderRadius: THEME_TOKENS.radius.sm
      }}
    >
      <div
        style={{
          width: thumbWidth,
          height: thumbHeight,
          backgroundColor: isDark ? '#1e293b' : '#ffffff',
          borderRadius: 3,
          border: isActive
            ? '2px solid #2563eb'
            : isDark
              ? '1px solid #334155'
              : '1px solid #cbd5e1',
          boxShadow: isActive
            ? '0 0 0 2px rgba(37, 99, 235, 0.25)'
            : '0 1px 3px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        {bitmap ? (
          <canvas
            ref={canvasRef}
            data-testid={`thumbnail-canvas-${pageIndex}`}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        ) : (
          <div
            className="page-shimmer"
            data-testid={`thumbnail-placeholder-${pageIndex}`}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isDark ? '#64748b' : '#94a3b8',
              fontSize: 11
            }}
          >
            {pageIndex + 1}
          </div>
        )}
      </div>

      <span
        style={{
          fontSize: 12,
          fontWeight: isActive ? 600 : 400,
          color: isActive ? '#2563eb' : isDark ? '#94a3b8' : '#64748b',
          marginTop: 6
        }}
      >
        {t('editor.sidebar.page', { page: pageIndex + 1, defaultValue: `Page ${pageIndex + 1}` })}
      </span>
    </div>
  );
};

export const ThumbnailSidebar: React.FC<ThumbnailSidebarProps> = ({
  pageCount,
  currentPage,
  getPageDimension,
  onSelectPage,
  renderThumbnail,
  theme = 'light',
  isOpen = true,
  className = '',
  style
}) => {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll sidebar list so active thumbnail stays visible
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.querySelector(
      `[data-testid="thumbnail-item-${currentPage - 1}"]`
    );
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentPage, isOpen]);

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <aside
      data-testid="thumbnail-sidebar"
      role="listbox"
      aria-label={t('editor.sidebar.thumbnailsTitle', { defaultValue: 'Document Thumbnails' })}
      className={`thumbnail-sidebar ${className}`}
      style={{
        width: 170,
        height: '100%',
        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
        borderRight: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
        ...style
      }}
    >
      <div
        style={{
          padding: '12px 14px',
          fontWeight: 600,
          fontSize: 13,
          borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          color: isDark ? '#f8fafc' : '#0f172a'
        }}
      >
        {t('editor.sidebar.thumbnailsTitle', { defaultValue: 'Thumbnails' })} ({pageCount})
      </div>

      <div
        ref={listRef}
        data-testid="thumbnail-list-container"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        {Array.from({ length: pageCount }, (_, i) => (
          <ThumbnailItem
            key={`thumb-${i}`}
            pageIndex={i}
            isActive={i + 1 === currentPage}
            dimension={getPageDimension(i)}
            onSelect={onSelectPage}
            renderThumbnail={renderThumbnail}
            theme={theme}
          />
        ))}
      </div>
    </aside>
  );
};
