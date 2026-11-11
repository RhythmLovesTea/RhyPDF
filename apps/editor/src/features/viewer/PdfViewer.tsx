import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { IconButton } from '@rhypdf/ui';
import { PanelLeftClose, PanelLeftOpen, ZoomIn, ZoomOut, Search } from 'lucide-react';
import type { PdfEngine, DocumentHandle } from '@rhypdf/pdf-engine';
import type { TextRun } from '@rhypdf/pdf-model';

import { PageCanvas } from './PageCanvas';
import { TiledPageCanvas } from './TiledPageCanvas';
import { VirtualPageList, VirtualPageListHandle, PageDimension } from './VirtualPageList';
import { ThumbnailSidebar } from './ThumbnailSidebar';
import { PageNavigation } from './PageNavigation';
import { FindBar } from './FindBar';
import { SearchHighlightLayer } from './SearchHighlightLayer';
import { TextSelectionLayer } from './TextSelectionLayer';
import { FitModeSelector } from './FitModeSelector';
import { LayoutModeSelector } from './LayoutModeSelector';
import { PasswordDialog } from './PasswordDialog';
import { ViewerErrorScreen } from './ViewerErrorScreen';
import { useZoomPan } from './useZoomPan';
import { BitmapLruCache } from './BitmapLruCache';
import { RenderScheduler, RenderPriority } from './RenderScheduler';
import { useViewerResilience } from './useViewerResilience';
import { searchPageText, SearchMatch, SearchOptions } from './text-search';
import { getTwoPageSpread } from './layout-modes';

export interface PageMetric {
  width: number;
  height: number;
  rotation?: 0 | 90 | 180 | 270;
}

export interface PdfViewerProps {
  engine?: PdfEngine;
  docHandle?: DocumentHandle | null;
  docId: string;
  pageCount: number;
  getPageMetric?: (pageIndex: number) => PageMetric;
  theme?: 'light' | 'dark';
  renderThumbnail?: (pageIndex: number) => Promise<ImageBitmap | null> | ImageBitmap | null;
  renderPageBitmap?: (
    pageIndex: number,
    scale: number,
    dpr: number,
    signal?: AbortSignal
  ) => Promise<ImageBitmap>;
  getPageTextRuns?: (pageIndex: number) => Promise<TextRun[]> | TextRun[];
  isPasswordRequired?: boolean;
  isWrongPassword?: boolean;
  onPasswordSubmit?: (password: string) => void | Promise<void>;
  onPasswordCancel?: () => void;
  error?: { code: string; message?: string } | null;
  onBackToHome?: () => void;
  onRetry?: () => void;
  renderOverlay?: (pageIndex: number, metric: PageMetric) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface ViewerPageCanvasProps {
  pageIndex: number;
  dim: PageDimension;
  scale: number;
  dpr: number;
  theme?: 'light' | 'dark';
  isVisible: boolean;
  docId: string;
  scheduler: RenderScheduler;
  renderPageBitmap?: (
    pageIndex: number,
    scale: number,
    dpr: number,
    signal?: AbortSignal
  ) => Promise<ImageBitmap>;
  children?: React.ReactNode;
}

const ViewerPageCanvas: React.FC<ViewerPageCanvasProps> = ({
  pageIndex,
  dim,
  scale,
  dpr,
  theme = 'light',
  isVisible,
  docId,
  scheduler,
  renderPageBitmap,
  children
}) => {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);

  useEffect(() => {
    if (!renderPageBitmap) return;
    let cancelled = false;
    const jobId = `${docId}:page:${pageIndex}:scale:${scale}:dpr:${dpr}`;

    void scheduler
      .schedule({
        id: jobId,
        pageIndex,
        priority: isVisible ? RenderPriority.VISIBLE : RenderPriority.NEAR,
        render: (signal) => renderPageBitmap(pageIndex, scale, dpr, signal)
      })
      .then((bmp) => {
        if (!cancelled) {
          setBitmap(bmp);
        }
      })
      .catch(() => {
        // Ignored or cancelled
      });

    return () => {
      cancelled = true;
      scheduler.cancelJob(jobId);
    };
  }, [renderPageBitmap, pageIndex, docId, scale, dpr, scheduler, isVisible]);

  if (scale > 2.0) {
    return (
      <TiledPageCanvas
        pageNumber={pageIndex + 1}
        width={dim.width}
        height={dim.height}
        rotation={dim.rotation}
        scale={scale}
        dpr={dpr}
        baseBitmap={bitmap}
        theme={theme}
      >
        {children}
      </TiledPageCanvas>
    );
  }

  return (
    <PageCanvas
      pageNumber={pageIndex + 1}
      width={dim.width}
      height={dim.height}
      rotation={dim.rotation}
      scale={scale}
      dpr={dpr}
      bitmap={bitmap}
      theme={theme}
      isLoading={!isVisible || !bitmap}
    >
      {children}
    </PageCanvas>
  );
};

export const PdfViewer: React.FC<PdfViewerProps> = ({
  docId,
  pageCount,
  getPageMetric = () => ({ width: 595.28, height: 841.89, rotation: 0 }),
  theme = 'light',
  renderThumbnail,
  renderPageBitmap,
  getPageTextRuns,
  isPasswordRequired = false,
  isWrongPassword = false,
  onPasswordSubmit = () => {},
  onPasswordCancel = () => {},
  error = null,
  onBackToHome,
  onRetry,
  renderOverlay,
  className = '',
  style
}) => {
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [findBarOpen, setFindBarOpen] = useState<boolean>(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<Map<number, SearchMatch[]>>(new Map());
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);

  // Cached text runs per page
  const [cachedRuns, setCachedRuns] = useState<Map<number, TextRun[]>>(new Map());

  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const virtualListRef = useRef<VirtualPageListHandle | null>(null);

  // LRU cache and scheduler
  const bitmapCache = useMemo(() => new BitmapLruCache(), []);
  const scheduler = useMemo(() => new RenderScheduler({ cache: bitmapCache }), [bitmapCache]);

  // Page dimension helper
  const getPageDimension = useCallback(
    (index: number): PageDimension => {
      const metric = getPageMetric(index);
      return {
        width: metric.width,
        height: metric.height,
        rotation: metric.rotation ?? 0
      };
    },
    [getPageMetric]
  );

  // Resilience & persistence hook
  const activeMetric = getPageMetric(0);
  const {
    dpr,
    fitMode,
    layoutMode,
    scale,
    currentPage,
    setFitMode,
    setLayoutMode,
    setScale,
    setCurrentPage,
    handleScroll
  } = useViewerResilience({
    docId,
    containerRef,
    activePageDimension: activeMetric,
    initialFitMode: 'fitWidth',
    initialLayoutMode: 'continuous',
    defaultScale: 1.0
  });

  // Zoom & Pan hook
  const { zoomIn, zoomOut } = useZoomPan({
    containerRef,
    scale,
    onScaleChange: setScale,
    minScale: 0.25,
    maxScale: 8.0,
    enableKeyboard: true
  });

  // Handle keyboard shortcut for search (Ctrl+F / Cmd+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindBarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Jump to specific page
  const handlePageJump = useCallback(
    (pageIdx: number) => {
      const targetPage = Math.max(1, Math.min(pageCount, pageIdx + 1));
      setCurrentPage(targetPage);
      virtualListRef.current?.scrollToPage(targetPage - 1, 'start');
    },
    [pageCount, setCurrentPage]
  );

  // Visible range change callback from VirtualPageList
  const handleVisibleRangeChange = useCallback(
    (_start: number, _end: number, primary: number) => {
      setCurrentPage(primary + 1);
    },
    [setCurrentPage]
  );

  // Search execution
  const handleSearch = useCallback(
    async (query: string, options: SearchOptions) => {
      setSearchQuery(query);

      if (!query.trim() || !getPageTextRuns) {
        setSearchResults(new Map());
        setCurrentMatchIndex(-1);
        return;
      }

      const newResults = new Map<number, SearchMatch[]>();
      for (let i = 0; i < pageCount; i++) {
        let runs = cachedRuns.get(i);
        if (!runs) {
          const fetched = await getPageTextRuns(i);
          runs = Array.isArray(fetched) ? fetched : [];
          setCachedRuns((prev) => new Map(prev).set(i, runs!));
        }
        const matches = searchPageText(i, runs, query, options);
        if (matches.length > 0) {
          newResults.set(i, matches);
        }
      }
      setSearchResults(newResults);
      setCurrentMatchIndex(newResults.size > 0 ? 0 : -1);
    },
    [cachedRuns, getPageTextRuns, pageCount]
  );

  // Flattened search matches for next/prev cycling
  const flattenedMatches = useMemo(() => {
    const list: { pageIndex: number; matchIndex: number; match: SearchMatch }[] = [];
    searchResults.forEach((matches, pageIndex) => {
      matches.forEach((match, matchIndex) => {
        list.push({ pageIndex, matchIndex, match });
      });
    });
    return list;
  }, [searchResults]);

  const handleNextMatch = useCallback(() => {
    if (flattenedMatches.length === 0) return;
    const nextIdx = (currentMatchIndex + 1) % flattenedMatches.length;
    setCurrentMatchIndex(nextIdx);
    const item = flattenedMatches[nextIdx];
    if (item) {
      handlePageJump(item.pageIndex);
    }
  }, [flattenedMatches, currentMatchIndex, handlePageJump]);

  const handlePrevMatch = useCallback(() => {
    if (flattenedMatches.length === 0) return;
    const prevIdx = (currentMatchIndex - 1 + flattenedMatches.length) % flattenedMatches.length;
    setCurrentMatchIndex(prevIdx);
    const item = flattenedMatches[prevIdx];
    if (item) {
      handlePageJump(item.pageIndex);
    }
  }, [flattenedMatches, currentMatchIndex, handlePageJump]);

  // Page rendering helper
  const renderSinglePage = (pageIdx: number, isVisible: boolean) => {
    const dim = getPageDimension(pageIdx);
    const pageMatches = searchResults.get(pageIdx) ?? [];
    const pageRuns = cachedRuns.get(pageIdx) ?? [];

    const activeItem =
      currentMatchIndex >= 0 && currentMatchIndex < flattenedMatches.length
        ? flattenedMatches[currentMatchIndex]
        : null;
    const activeMatchId =
      activeItem && activeItem.pageIndex === pageIdx ? activeItem.match.id : undefined;

    return (
      <ViewerPageCanvas
        key={`page-canvas-${pageIdx}`}
        pageIndex={pageIdx}
        dim={dim}
        scale={scale}
        dpr={dpr}
        theme={theme}
        isVisible={isVisible}
        docId={docId}
        scheduler={scheduler}
        renderPageBitmap={renderPageBitmap}
      >
        <SearchHighlightLayer
          pageIndex={pageIdx}
          matches={pageMatches}
          currentMatchId={activeMatchId}
          pageWidthPt={dim.width}
          pageHeightPt={dim.height}
          rotation={dim.rotation}
          scale={scale}
        />
        {pageRuns.length > 0 && (
          <TextSelectionLayer
            pageIndex={pageIdx}
            textRuns={pageRuns}
            pageWidthPt={dim.width}
            pageHeightPt={dim.height}
            rotation={dim.rotation}
            scale={scale}
          />
        )}
        {renderOverlay?.(pageIdx, dim)}
      </ViewerPageCanvas>
    );
  };

  // If error occurred (corrupt/unsupported/OOM)
  if (error) {
    return (
      <ViewerErrorScreen
        code={error.code}
        message={error.message}
        onBackToHome={onBackToHome}
        onRetry={onRetry}
      />
    );
  }

  // Two-page spread helper
  const spread = layoutMode === 'twoPage' ? getTwoPageSpread(currentPage, pageCount) : null;

  return (
    <div
      data-testid="pdf-viewer"
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: isDark ? 'var(--bg-canvas)' : '#f1f5f9',
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      {/* Viewer Control Bar */}
      <header
        data-testid="viewer-top-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          borderBottom: '1px solid var(--bg-border)',
          backgroundColor: isDark ? 'var(--bg-card)' : '#ffffff',
          color: 'var(--bg-foreground)',
          zIndex: 20
        }}
      >
        {/* Left Section: Sidebar Toggle & Page Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconButton
            data-testid="toggle-sidebar-button"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </IconButton>

          <PageNavigation
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={handlePageJump}
            theme={theme}
          />
        </div>

        {/* Center Section: Fit & Layout Mode Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FitModeSelector currentMode={fitMode} onModeChange={setFitMode} theme={theme} />
          <LayoutModeSelector currentMode={layoutMode} onModeChange={setLayoutMode} theme={theme} />
        </div>

        {/* Right Section: Zoom & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <IconButton
            data-testid="viewer-zoom-out"
            aria-label={t('editor.viewer.zoomOut')}
            onClick={zoomOut}
          >
            <ZoomOut size={16} />
          </IconButton>
          <span
            data-testid="viewer-zoom-percentage"
            style={{ fontSize: '13px', fontWeight: 500, minWidth: '42px', textAlign: 'center' }}
          >
            {Math.round(scale * 100)}%
          </span>
          <IconButton
            data-testid="viewer-zoom-in"
            aria-label={t('editor.viewer.zoomIn')}
            onClick={zoomIn}
          >
            <ZoomIn size={16} />
          </IconButton>

          <IconButton
            data-testid="viewer-search-button"
            aria-label={t('editor.viewer.findPlaceholder')}
            onClick={() => setFindBarOpen((prev) => !prev)}
          >
            <Search size={16} />
          </IconButton>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Thumbnail Sidebar */}
        <ThumbnailSidebar
          pageCount={pageCount}
          currentPage={currentPage}
          getPageDimension={getPageDimension}
          onSelectPage={handlePageJump}
          renderThumbnail={renderThumbnail}
          isOpen={sidebarOpen}
          theme={theme}
        />

        {/* Viewport Area */}
        <div
          ref={containerRef}
          data-testid="viewer-viewport-container"
          onScroll={handleScroll}
          style={{
            flex: 1,
            height: '100%',
            overflow: 'auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {layoutMode === 'continuous' ? (
            <VirtualPageList
              ref={virtualListRef}
              pageCount={pageCount}
              getPageDimension={getPageDimension}
              scale={scale}
              lookahead={1}
              gap={16}
              onVisibleRangeChange={handleVisibleRangeChange}
              renderPage={renderSinglePage}
              style={{ width: '100%', minHeight: '100%' }}
            />
          ) : layoutMode === 'single' ? (
            <div
              data-testid="single-page-layout-container"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100%',
                padding: '24px'
              }}
            >
              {renderSinglePage(currentPage - 1, true)}
            </div>
          ) : (
            <div
              data-testid="two-page-layout-container"
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100%',
                gap: '16px',
                padding: '24px'
              }}
            >
              {spread && spread.leftPageIndex !== null && (
                <div>{renderSinglePage(spread.leftPageIndex, true)}</div>
              )}
              {spread && spread.rightPageIndex !== null && (
                <div>{renderSinglePage(spread.rightPageIndex, true)}</div>
              )}
            </div>
          )}
        </div>

        {/* Find Bar (Float overlay) */}
        <FindBar
          isOpen={findBarOpen}
          initialQuery={searchQuery}
          totalMatches={flattenedMatches.length}
          currentMatchIndex={currentMatchIndex}
          onSearch={handleSearch}
          onNextMatch={handleNextMatch}
          onPrevMatch={handlePrevMatch}
          onClose={() => setFindBarOpen(false)}
          theme={theme}
        />
      </div>

      {/* Password Dialog */}
      <PasswordDialog
        open={isPasswordRequired}
        isWrongPassword={isWrongPassword}
        onSubmit={onPasswordSubmit}
        onCancel={onPasswordCancel}
      />
    </div>
  );
};
