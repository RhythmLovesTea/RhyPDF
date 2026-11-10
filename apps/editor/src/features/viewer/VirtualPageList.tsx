import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef
} from 'react';

export interface PageDimension {
  width: number; // points
  height: number; // points
  rotation?: 0 | 90 | 180 | 270;
}

export interface VirtualPageListProps {
  pageCount: number;
  getPageDimension: (pageIndex: number) => PageDimension;
  scale: number;
  lookahead?: number; // default: 1 page lookahead
  gap?: number; // px gap between pages, default 16
  renderPage: (pageIndex: number, isVisible: boolean) => React.ReactNode;
  onVisibleRangeChange?: (
    startIndex: number,
    endIndex: number,
    primaryVisibleIndex: number
  ) => void;
  className?: string;
  style?: React.CSSProperties;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

export interface VirtualPageListHandle {
  scrollToPage: (pageIndex: number, align?: 'start' | 'center') => void;
  getScrollContainer: () => HTMLDivElement | null;
  getVisibleRange: () => { start: number; end: number; primary: number };
}

interface PageLayoutMetrics {
  tops: number[];
  bottoms: number[];
  heights: number[];
  widths: number[];
  totalHeight: number;
  maxWidth: number;
}

export const VirtualPageList = forwardRef<VirtualPageListHandle, VirtualPageListProps>(
  (
    {
      pageCount,
      getPageDimension,
      scale,
      lookahead = 1,
      gap = 16,
      renderPage,
      onVisibleRangeChange,
      className = '',
      style,
      scrollRef: externalScrollRef
    },
    ref
  ) => {
    const internalScrollRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = externalScrollRef || internalScrollRef;

    const [viewportHeight, setViewportHeight] = useState<number>(800);
    const [scrollTop, setScrollTop] = useState<number>(0);

    // Compute cumulative layout metrics for all pages based on scale and gap
    const layout = useMemo<PageLayoutMetrics>(() => {
      const tops: number[] = new Array(pageCount);
      const bottoms: number[] = new Array(pageCount);
      const heights: number[] = new Array(pageCount);
      const widths: number[] = new Array(pageCount);

      let currentTop = gap;
      let maxWidth = 0;

      for (let i = 0; i < pageCount; i++) {
        const dim = getPageDimension(i);
        const isSideways = dim.rotation === 90 || dim.rotation === 270;
        const effW = isSideways ? dim.height : dim.width;
        const effH = isSideways ? dim.width : dim.height;

        const w = Math.max(1, Math.round(effW * scale));
        const h = Math.max(1, Math.round(effH * scale));

        widths[i] = w;
        heights[i] = h;
        tops[i] = currentTop;
        bottoms[i] = currentTop + h;

        if (w > maxWidth) maxWidth = w;
        currentTop += h + gap;
      }

      return {
        tops,
        bottoms,
        heights,
        widths,
        totalHeight: Math.max(0, currentTop),
        maxWidth
      };
    }, [pageCount, getPageDimension, scale, gap]);

    // Handle scroll container resize
    useEffect(() => {
      const el = scrollContainerRef.current;
      if (!el) return;

      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const h = entry.contentRect.height;
          if (h > 0) {
            setViewportHeight(h);
          }
        }
      });

      ro.observe(el);
      setViewportHeight(el.clientHeight || 800);

      return () => {
        ro.disconnect();
      };
    }, [scrollContainerRef]);

    // Listen to scroll events on container
    const handleScroll = useCallback(() => {
      const el = scrollContainerRef.current;
      if (!el) return;
      setScrollTop(el.scrollTop);
    }, [scrollContainerRef]);

    // Binary search to find page index at a given vertical offset
    const findPageIndexAt = useCallback(
      (offset: number): number => {
        if (pageCount <= 0) return 0;
        let low = 0;
        let high = pageCount - 1;

        while (low <= high) {
          const mid = (low + high) >> 1;
          const top = layout.tops[mid] ?? 0;
          const bottom = layout.bottoms[mid] ?? 0;

          if (offset < top) {
            high = mid - 1;
          } else if (offset > bottom) {
            low = mid + 1;
          } else {
            return mid;
          }
        }

        return Math.min(Math.max(0, low), pageCount - 1);
      },
      [pageCount, layout]
    );

    // Compute visible pages and lookahead range
    const { renderStart, renderEnd, visibleStart, visibleEnd, primaryVisible } = useMemo(() => {
      if (pageCount <= 0) {
        return {
          renderStart: 0,
          renderEnd: -1,
          visibleStart: 0,
          visibleEnd: -1,
          primaryVisible: 0
        };
      }

      const viewportTop = scrollTop;
      const viewportBottom = scrollTop + viewportHeight;

      // Find visible range
      const vStart = findPageIndexAt(viewportTop);
      let vEnd = findPageIndexAt(viewportBottom);

      if (vEnd < vStart) {
        vEnd = vStart;
      }

      // Add 1 page lookahead above and below
      const rStart = Math.max(0, vStart - lookahead);
      const rEnd = Math.min(pageCount - 1, vEnd + lookahead);

      // Primary visible page: the page closest to center of viewport
      const viewportMid = viewportTop + viewportHeight / 2;
      const primary = findPageIndexAt(viewportMid);

      return {
        renderStart: rStart,
        renderEnd: rEnd,
        visibleStart: vStart,
        visibleEnd: vEnd,
        primaryVisible: primary
      };
    }, [pageCount, scrollTop, viewportHeight, findPageIndexAt, lookahead]);

    // Fire callback when visible range changes
    useEffect(() => {
      if (pageCount > 0 && onVisibleRangeChange) {
        onVisibleRangeChange(visibleStart, visibleEnd, primaryVisible);
      }
    }, [visibleStart, visibleEnd, primaryVisible, pageCount, onVisibleRangeChange]);

    // Imperative handle for parent (scrollToPage, container ref, getVisibleRange)
    useImperativeHandle(
      ref,
      () => ({
        scrollToPage: (pageIndex: number, align: 'start' | 'center' = 'start') => {
          const el = scrollContainerRef.current;
          if (!el || pageIndex < 0 || pageIndex >= pageCount) return;

          const top = layout.tops[pageIndex] ?? 0;
          const h = layout.heights[pageIndex] ?? 0;

          let targetScroll = top - gap / 2;
          if (align === 'center') {
            targetScroll = top - (viewportHeight - h) / 2;
          }

          el.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
        },
        getScrollContainer: () => scrollContainerRef.current,
        getVisibleRange: () => ({
          start: visibleStart,
          end: visibleEnd,
          primary: primaryVisible
        })
      }),
      [
        pageCount,
        layout,
        viewportHeight,
        gap,
        scrollContainerRef,
        visibleStart,
        visibleEnd,
        primaryVisible
      ]
    );

    // Build array of indices to render
    const renderedIndices = useMemo(() => {
      if (renderEnd < renderStart || pageCount === 0) return [];
      const indices: number[] = [];
      for (let i = renderStart; i <= renderEnd; i++) {
        indices.push(i);
      }
      return indices;
    }, [renderStart, renderEnd, pageCount]);

    return (
      <div
        ref={scrollContainerRef}
        data-testid="virtual-page-scroll-container"
        onScroll={handleScroll}
        className={`virtual-page-scroll-container ${className}`}
        style={{
          position: 'relative',
          overflowY: 'auto',
          overflowX: 'auto',
          width: '100%',
          height: '100%',
          WebkitOverflowScrolling: 'touch',
          ...style
        }}
      >
        <div
          data-testid="virtual-page-inner-content"
          style={{
            position: 'relative',
            width: '100%',
            minWidth: layout.maxWidth + gap * 2,
            height: layout.totalHeight,
            minHeight: '100%'
          }}
        >
          {renderedIndices.map((pageIndex) => {
            const top = layout.tops[pageIndex] ?? 0;
            const height = layout.heights[pageIndex] ?? 0;
            const width = layout.widths[pageIndex] ?? 0;
            const isVisible = pageIndex >= visibleStart && pageIndex <= visibleEnd;

            return (
              <div
                key={`page-item-${pageIndex}`}
                data-testid={`virtual-page-item-${pageIndex}`}
                data-page-index={pageIndex}
                data-is-visible={isVisible}
                style={{
                  position: 'absolute',
                  top,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width,
                  height,
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                {renderPage(pageIndex, isVisible)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

VirtualPageList.displayName = 'VirtualPageList';
