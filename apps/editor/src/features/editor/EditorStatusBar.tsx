import React from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { PanelLeftOpen, PanelLeftClose, Minus, Plus } from 'lucide-react';
import { FitModeSelector } from '../viewer/FitModeSelector';
import { FitMode } from '../viewer/fit-mode';

export interface EditorStatusBarProps {
  currentPage: number;
  pageCount: number;
  scale: number;
  fitMode: FitMode;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitModeChange: (mode: FitMode) => void;
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  currentPage,
  pageCount,
  scale,
  fitMode,
  sidebarOpen,
  onToggleSidebar,
  onPrevPage,
  onNextPage,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onFitModeChange
}) => {
  const { t } = useTranslation();
  const zoomPercent = Math.round(scale * 100);

  return (
    <footer
      data-testid="editor-status-bar"
      style={{
        height: 38,
        backgroundColor: 'var(--bg-card)',
        borderTop: '1px solid var(--bg-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        fontSize: 12,
        color: 'var(--bg-foreground)',
        flexShrink: 0
      }}
    >
      {/* Left: Sidebar toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          data-testid="btn-statusbar-thumbnails"
          onClick={onToggleSidebar}
          title={t('editor.sidebar.thumbnailsTitle')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            padding: '4px 6px',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          {sidebarOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          <span>{t('editor.sidebar.thumbnailsTitle')}</span>
        </button>
      </div>

      {/* Center: Page indicator and pagination */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          data-testid="btn-statusbar-prev-page"
          disabled={currentPage <= 1}
          onClick={onPrevPage}
          style={{
            background: 'none',
            border: 'none',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage <= 1 ? 0.4 : 1,
            color: 'inherit',
            padding: '2px 6px'
          }}
        >
          ◀
        </button>

        <span
          data-testid="statusbar-page-indicator"
          style={{ fontWeight: 500 }}
          onClick={() => {
            const res = window.prompt(
              t('editor.viewer.pageJumpPrompt', { total: pageCount }),
              String(currentPage)
            );
            if (res) {
              const p = parseInt(res, 10);
              if (p >= 1 && p <= pageCount) onPageChange(p);
            }
          }}
          title={t('editor.viewer.goToPage')}
        >
          {t('editor.viewer.pageOf', { page: currentPage, total: Math.max(1, pageCount) })}
        </span>

        <button
          data-testid="btn-statusbar-next-page"
          disabled={currentPage >= pageCount}
          onClick={onNextPage}
          style={{
            background: 'none',
            border: 'none',
            cursor: currentPage >= pageCount ? 'not-allowed' : 'pointer',
            opacity: currentPage >= pageCount ? 0.4 : 1,
            color: 'inherit',
            padding: '2px 6px'
          }}
        >
          ▶
        </button>
      </div>

      {/* Right: Zoom & Fit mode */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            data-testid="btn-statusbar-zoom-out"
            onClick={onZoomOut}
            title={t('editor.viewer.zoomOut')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '2px 4px'
            }}
          >
            <Minus size={14} />
          </button>
          <span data-testid="statusbar-zoom-level" style={{ minWidth: 42, textAlign: 'center' }}>
            {zoomPercent}%
          </span>
          <button
            data-testid="btn-statusbar-zoom-in"
            onClick={onZoomIn}
            title={t('editor.viewer.zoomIn')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              padding: '2px 4px'
            }}
          >
            <Plus size={14} />
          </button>
        </div>

        <FitModeSelector currentMode={fitMode} onModeChange={onFitModeChange} />
      </div>
    </footer>
  );
};
