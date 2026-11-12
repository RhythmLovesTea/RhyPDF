import { useState, useEffect, useRef, useCallback } from 'react';
import type { FitMode } from './fit-mode';
import { calculateFitScale } from './fit-mode';
import type { PageLayoutMode } from './layout-modes';

export interface ViewerDocumentState {
  currentPage: number;
  scrollRatio?: number;
  scale: number;
  fitMode: FitMode;
  layoutMode: PageLayoutMode;
  timestamp?: number;
}

const STORAGE_PREFIX = 'rhypdf:viewer-state:';

export function getStorageKey(docId: string): string {
  return `${STORAGE_PREFIX}${docId}`;
}

export function saveViewerState(docId: string, state: ViewerDocumentState): void {
  if (typeof window === 'undefined' || !window.localStorage || !docId) return;
  try {
    const payload = JSON.stringify({
      ...state,
      timestamp: Date.now()
    });
    window.localStorage.setItem(getStorageKey(docId), payload);
  } catch {
    // Sandboxed or private browsing fallback
  }
}

export function loadViewerState(docId: string): ViewerDocumentState | null {
  if (typeof window === 'undefined' || !window.localStorage || !docId) return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey(docId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const currentPage =
      typeof parsed.currentPage === 'number' && parsed.currentPage >= 1 ? parsed.currentPage : 1;
    const scale = typeof parsed.scale === 'number' && parsed.scale > 0 ? parsed.scale : 1.0;
    const fitMode = ['fitWidth', 'fitPage', 'actualSize', 'custom'].includes(parsed.fitMode)
      ? (parsed.fitMode as FitMode)
      : 'custom';
    const layoutMode = ['continuous', 'single', 'twoPage'].includes(parsed.layoutMode)
      ? (parsed.layoutMode as PageLayoutMode)
      : 'continuous';
    const scrollRatio =
      typeof parsed.scrollRatio === 'number' && parsed.scrollRatio >= 0 && parsed.scrollRatio <= 1
        ? parsed.scrollRatio
        : undefined;

    return {
      currentPage,
      scale,
      fitMode,
      layoutMode,
      scrollRatio,
      timestamp: parsed.timestamp
    };
  } catch {
    return null;
  }
}

export function clearViewerState(docId: string): void {
  if (typeof window === 'undefined' || !window.localStorage || !docId) return;
  try {
    window.localStorage.removeItem(getStorageKey(docId));
  } catch {
    // Ignore
  }
}

export interface UseViewerResilienceOptions {
  docId: string;
  containerRef: React.RefObject<HTMLDivElement>;
  activePageDimension?: { width: number; height: number; rotation?: 0 | 90 | 180 | 270 };
  initialFitMode?: FitMode;
  initialLayoutMode?: PageLayoutMode;
  defaultScale?: number;
  onScaleRecalculate?: (newScale: number) => void;
}

export interface UseViewerResilienceResult {
  dpr: number;
  viewportWidth: number;
  viewportHeight: number;
  fitMode: FitMode;
  layoutMode: PageLayoutMode;
  scale: number;
  currentPage: number;
  setFitMode: (mode: FitMode) => void;
  setLayoutMode: (mode: PageLayoutMode) => void;
  setScale: (scale: number) => void;
  setCurrentPage: (page: number) => void;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  restoreState: () => ViewerDocumentState | null;
}

export function useViewerResilience({
  docId,
  containerRef,
  activePageDimension,
  initialFitMode = 'custom',
  initialLayoutMode = 'continuous',
  defaultScale = 1.0,
  onScaleRecalculate
}: UseViewerResilienceOptions): UseViewerResilienceResult {
  // Device Pixel Ratio with dynamic change detection
  const [dpr, setDpr] = useState<number>(() => {
    return typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  });

  // Viewport dimensions
  const [viewportWidth, setViewportWidth] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(0);

  // Viewer state
  const [fitMode, setFitModeState] = useState<FitMode>(initialFitMode);
  const [layoutMode, setLayoutModeState] = useState<PageLayoutMode>(initialLayoutMode);
  const [scale, setScaleState] = useState<number>(defaultScale);
  const [currentPage, setCurrentPageState] = useState<number>(1);
  const scrollRatioRef = useRef<number>(0);

  // Save debounce timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevFitModeRef = useRef<FitMode>(initialFitMode);

  // Restore saved state on mount or docId change
  const restoreState = useCallback((): ViewerDocumentState | null => {
    if (!docId) return null;
    const saved = loadViewerState(docId);
    if (saved) {
      setCurrentPageState(saved.currentPage);
      setFitModeState(saved.fitMode);
      setLayoutModeState(saved.layoutMode);
      setScaleState(saved.scale);
      if (saved.scrollRatio !== undefined) {
        scrollRatioRef.current = saved.scrollRatio;
      }
    }
    return saved;
  }, [docId]);

  useEffect(() => {
    restoreState();
  }, [restoreState]);

  // Debounced state persistence
  const scheduleSave = useCallback(
    (overrides?: Partial<ViewerDocumentState>) => {
      if (!docId) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        saveViewerState(docId, {
          currentPage,
          scale,
          fitMode,
          layoutMode,
          scrollRatio: scrollRatioRef.current,
          ...overrides
        });
      }, 250);
    },
    [docId, currentPage, scale, fitMode, layoutMode]
  );

  // Flush save on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (docId) {
        saveViewerState(docId, {
          currentPage,
          scale,
          fitMode,
          layoutMode,
          scrollRatio: scrollRatioRef.current
        });
      }
    };
  }, [docId, currentPage, scale, fitMode, layoutMode]);

  // DPR change listener (e.g. cross-monitor drag, display settings change)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mediaQueryList: MediaQueryList | null = null;

    const updateDpr = () => {
      const newDpr = window.devicePixelRatio || 1;
      setDpr(newDpr);

      // Re-bind media query to the new resolution
      if (mediaQueryList) {
        mediaQueryList.removeEventListener('change', updateDpr);
      }
      mediaQueryList = window.matchMedia(`(resolution: ${newDpr}dppx)`);
      mediaQueryList.addEventListener('change', updateDpr);
    };

    updateDpr();

    return () => {
      if (mediaQueryList) {
        mediaQueryList.removeEventListener('change', updateDpr);
      }
    };
  }, []);

  // Viewport resize and orientation change listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      // Use client dimensions if available to reflect the actual content-bearing viewport excluding scrollbars
      const w = container.clientWidth || container.getBoundingClientRect().width;
      const h = container.clientHeight || container.getBoundingClientRect().height;
      setViewportWidth((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
      setViewportHeight((prev) => (Math.abs(prev - h) > 0.5 ? h : prev));
    };

    updateDimensions();

    let lastW = 0;
    let lastH = 0;
    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth || container.getBoundingClientRect().width;
      const h = container.clientHeight || container.getBoundingClientRect().height;
      if (Math.abs(w - lastW) > 1 || Math.abs(h - lastH) > 1) {
        lastW = w;
        lastH = h;
        setViewportWidth(w);
        setViewportHeight(h);
      }
    });

    resizeObserver.observe(container);
    window.addEventListener('resize', updateDimensions);
    window.addEventListener('orientationchange', updateDimensions);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, [containerRef]);

  // Dynamic scale recalculation for fit modes when viewport or page dimensions change
  useEffect(() => {
    if (fitMode === 'actualSize') {
      setScaleState(1.0);
      onScaleRecalculate?.(1.0);
      prevFitModeRef.current = 'actualSize';
      return;
    }

    if (
      (fitMode === 'fitWidth' || fitMode === 'fitPage') &&
      viewportWidth > 0 &&
      viewportHeight > 0 &&
      activePageDimension
    ) {
      const newScale = calculateFitScale(fitMode, {
        viewportWidth,
        viewportHeight,
        pageWidthPt: activePageDimension.width,
        pageHeightPt: activePageDimension.height,
        rotation: activePageDimension.rotation ?? 0
      });

      const fitModeChanged = prevFitModeRef.current !== fitMode;
      prevFitModeRef.current = fitMode;

      setScaleState((currentScale) => {
        // If mode changed or initial scale, always apply new scale
        if (fitModeChanged || currentScale <= 0) {
          onScaleRecalculate?.(newScale);
          return newScale;
        }
        // Suppress micro-oscillations caused by scrollbar toggling (scrollbar width ~17px is ~0.028 scale delta)
        if (Math.abs(newScale - currentScale) < 0.04) {
          return currentScale;
        }
        onScaleRecalculate?.(newScale);
        return newScale;
      });
    }
  }, [
    fitMode,
    viewportWidth,
    viewportHeight,
    activePageDimension?.width,
    activePageDimension?.height,
    activePageDimension?.rotation,
    onScaleRecalculate
  ]);

  const setFitMode = useCallback(
    (mode: FitMode) => {
      setFitModeState(mode);
      scheduleSave({ fitMode: mode });
    },
    [scheduleSave]
  );

  const setLayoutMode = useCallback(
    (mode: PageLayoutMode) => {
      setLayoutModeState(mode);
      scheduleSave({ layoutMode: mode });
    },
    [scheduleSave]
  );

  const setScale = useCallback(
    (newScale: number) => {
      setScaleState(newScale);
      setFitModeState('custom');
      scheduleSave({ scale: newScale, fitMode: 'custom' });
    },
    [scheduleSave]
  );

  const setCurrentPage = useCallback(
    (page: number) => {
      setCurrentPageState(page);
      scheduleSave({ currentPage: page });
    },
    [scheduleSave]
  );

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      const maxScroll = target.scrollHeight - target.clientHeight;
      if (maxScroll > 0) {
        scrollRatioRef.current = target.scrollTop / maxScroll;
      }
      scheduleSave();
    },
    [scheduleSave]
  );

  return {
    dpr,
    viewportWidth,
    viewportHeight,
    fitMode,
    layoutMode,
    scale,
    currentPage,
    setFitMode,
    setLayoutMode,
    setScale,
    setCurrentPage,
    handleScroll,
    restoreState
  };
}
