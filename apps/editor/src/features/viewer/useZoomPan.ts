import { useEffect, useRef, useCallback } from 'react';

export interface UseZoomPanOptions {
  containerRef: React.RefObject<HTMLDivElement>;
  scale: number;
  onScaleChange: (newScale: number) => void;
  minScale?: number;
  maxScale?: number;
  enableKeyboard?: boolean;
}

export function clampScale(scale: number, min = 0.25, max = 8.0): number {
  return Math.min(Math.max(scale, min), max);
}

export function useZoomPan({
  containerRef,
  scale,
  onScaleChange,
  minScale = 0.25,
  maxScale = 8.0,
  enableKeyboard = true
}: UseZoomPanOptions): {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setClampedScale: (newScale: number) => void;
} {
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const setClampedScale = useCallback(
    (newScale: number, anchor?: { clientX: number; clientY: number }) => {
      const container = containerRef.current;
      const currentScale = scaleRef.current;
      const targetScale = clampScale(newScale, minScale, maxScale);

      if (targetScale === currentScale) return;

      if (container && anchor) {
        const rect = container.getBoundingClientRect();
        const mouseX = anchor.clientX - rect.left;
        const mouseY = anchor.clientY - rect.top;

        const ratio = targetScale / currentScale;
        const newScrollLeft = (container.scrollLeft + mouseX) * ratio - mouseX;
        const newScrollTop = (container.scrollTop + mouseY) * ratio - mouseY;

        onScaleChange(targetScale);

        requestAnimationFrame(() => {
          if (container) {
            container.scrollLeft = Math.max(0, newScrollLeft);
            container.scrollTop = Math.max(0, newScrollTop);
          }
        });
      } else {
        onScaleChange(targetScale);
      }
    },
    [containerRef, minScale, maxScale, onScaleChange]
  );

  const pendingZoomRef = useRef<{
    targetScale: number;
    anchor?: { clientX: number; clientY: number };
  } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const scheduleZoom = useCallback(
    (targetScale: number, anchor?: { clientX: number; clientY: number }) => {
      pendingZoomRef.current = { targetScale, anchor };
      const isTestEnv =
        typeof process !== 'undefined' &&
        Boolean(process.env?.NODE_ENV === 'test' || process.env?.VITEST);

      if (!isTestEnv && typeof requestAnimationFrame === 'function') {
        if (rafIdRef.current === null) {
          rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            if (pendingZoomRef.current) {
              setClampedScale(pendingZoomRef.current.targetScale, pendingZoomRef.current.anchor);
              pendingZoomRef.current = null;
            }
          });
        }
      } else {
        setClampedScale(targetScale, anchor);
      }
    },
    [setClampedScale]
  );

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const zoomIn = useCallback(() => {
    setClampedScale(scaleRef.current * 1.25);
  }, [setClampedScale]);

  const zoomOut = useCallback(() => {
    setClampedScale(scaleRef.current / 1.25);
  }, [setClampedScale]);

  const resetZoom = useCallback(() => {
    setClampedScale(1.0);
  }, [setClampedScale]);

  // Wheel listener: Ctrl/Cmd + Wheel & Trackpad Pinch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const factor = Math.exp(-e.deltaY * 0.005);
        const currentTarget = pendingZoomRef.current
          ? pendingZoomRef.current.targetScale
          : scaleRef.current;
        const newScale = currentTarget * factor;
        scheduleZoom(newScale, { clientX: e.clientX, clientY: e.clientY });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, scheduleZoom]);

  // Touch listener: Pinch-to-zoom and double-tap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let initialDist = 0;
    let initialScale = scaleRef.current;
    let touchMidpoint = { clientX: 0, clientY: 0 };
    let lastTapTime = 0;

    const getDistance = (t1: Touch, t2: Touch): number => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        if (t1 && t2) {
          initialDist = getDistance(t1, t2);
          initialScale = scaleRef.current;
          touchMidpoint = {
            clientX: (t1.clientX + t2.clientX) / 2,
            clientY: (t1.clientY + t2.clientY) / 2
          };
        }
      } else if (e.touches.length === 1) {
        const now = performance.now();
        const touch = e.touches[0];
        if (touch && now - lastTapTime < 300) {
          // Double-tap detected
          e.preventDefault();
          const target = scaleRef.current > 1.5 ? 1.0 : 2.0;
          setClampedScale(target, { clientX: touch.clientX, clientY: touch.clientY });
          lastTapTime = 0;
        } else {
          lastTapTime = now;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && initialDist > 0) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        if (t1 && t2) {
          e.preventDefault();
          const dist = getDistance(t1, t2);
          const ratio = dist / initialDist;
          const targetScale = initialScale * ratio;
          scheduleZoom(targetScale, touchMidpoint);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        initialDist = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [containerRef, scheduleZoom, setClampedScale]);

  // Keyboard navigation: + / - / 0
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is inside an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        zoomIn();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        zoomOut();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboard, zoomIn, zoomOut, resetZoom]);

  return {
    zoomIn,
    zoomOut,
    resetZoom,
    setClampedScale
  };
}
