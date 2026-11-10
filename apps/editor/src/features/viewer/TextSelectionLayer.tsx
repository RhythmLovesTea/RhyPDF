import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import type { TextRun, Rect } from '@rhypdf/pdf-model';
import { CoordinateMapper } from '@rhypdf/pdf-model';

export interface TextSelectionLayerProps {
  pageIndex: number;
  textRuns: TextRun[];
  pageWidthPt: number;
  pageHeightPt: number;
  rotation?: 0 | 90 | 180 | 270;
  scale: number;
  onSelectionChange?: (selectedText: string, pageIndex: number) => void;
  className?: string;
}

interface FlatChar {
  char: string;
  runIndex: number;
  charIndex: number;
  globalIndex: number;
  pdfBox: Rect;
}

export const TextSelectionLayer: React.FC<TextSelectionLayerProps> = ({
  pageIndex,
  textRuns,
  pageWidthPt,
  pageHeightPt,
  rotation = 0,
  scale,
  onSelectionChange,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isSelectingRef = useRef<boolean>(false);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);

  const mapper = useMemo(
    () => new CoordinateMapper(pageWidthPt, pageHeightPt, rotation, scale, 1.0),
    [pageWidthPt, pageHeightPt, rotation, scale]
  );

  // Flatten characters from runs into linear sequence with PDF bounds
  const flatChars = useMemo<FlatChar[]>(() => {
    const chars: FlatChar[] = [];
    let gIdx = 0;

    for (let r = 0; r < textRuns.length; r++) {
      const run = textRuns[r];
      if (!run || !run.text) continue;

      const text = run.text;
      const charBoxes = run.charBoxes;

      for (let c = 0; c < text.length; c++) {
        let pdfBox: Rect;
        if (charBoxes && charBoxes[c]) {
          const cb = charBoxes[c];
          pdfBox = cb ? cb.box : run.bounds;
        } else {
          // Fallback: estimate proportional sub-box
          const runW = run.bounds.right - run.bounds.left;
          const charW = runW / (text.length || 1);
          pdfBox = {
            left: run.bounds.left + c * charW,
            bottom: run.bounds.bottom,
            right: run.bounds.left + (c + 1) * charW,
            top: run.bounds.top
          };
        }

        chars.push({
          char: text[c] || '',
          runIndex: r,
          charIndex: c,
          globalIndex: gIdx++,
          pdfBox
        });
      }
    }

    return chars;
  }, [textRuns]);

  // Find character closest to point (in PDF coordinates)
  const findClosestCharIndex = useCallback(
    (pdfX: number, pdfY: number): number => {
      if (flatChars.length === 0) return -1;

      // 1. Check if point is inside any char box
      for (let i = 0; i < flatChars.length; i++) {
        const fc = flatChars[i];
        if (fc) {
          const b = fc.pdfBox;
          if (pdfX >= b.left && pdfX <= b.right && pdfY >= b.bottom && pdfY <= b.top) {
            return i;
          }
        }
      }

      // 2. Otherwise find nearest char by center distance
      let nearestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < flatChars.length; i++) {
        const fc = flatChars[i];
        if (!fc) continue;
        const cx = (fc.pdfBox.left + fc.pdfBox.right) / 2;
        const cy = (fc.pdfBox.bottom + fc.pdfBox.top) / 2;
        const dist = Math.hypot(pdfX - cx, pdfY - cy);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIdx = i;
        }
      }

      return nearestIdx;
    },
    [flatChars]
  );

  const getPdfPointFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    return mapper.cssPointToPdf(cssX, cssY);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Left-click only
    if (e.button !== 0) return;
    const pt = getPdfPointFromEvent(e);
    const idx = findClosestCharIndex(pt.x, pt.y);
    if (idx !== -1) {
      isSelectingRef.current = true;
      setStartIndex(idx);
      setEndIndex(idx);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelectingRef.current) return;
    const pt = getPdfPointFromEvent(e);
    const idx = findClosestCharIndex(pt.x, pt.y);
    if (idx !== -1) {
      setEndIndex(idx);
    }
  };

  const handleMouseUp = () => {
    isSelectingRef.current = false;
  };

  // Compute selected text substring
  const selectedText = useMemo(() => {
    if (startIndex === null || endIndex === null || flatChars.length === 0) return '';
    const min = Math.min(startIndex, endIndex);
    const max = Math.max(startIndex, endIndex);

    return flatChars
      .slice(min, max + 1)
      .map((c) => c.char)
      .join('');
  }, [startIndex, endIndex, flatChars]);

  // Report selection to parent
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedText, pageIndex);
    }
  }, [selectedText, pageIndex, onSelectionChange]);

  // Listen for copy (Ctrl+C / Cmd+C)
  useEffect(() => {
    if (!selectedText) return;

    const handleCopy = (e: ClipboardEvent) => {
      if (e.clipboardData) {
        e.clipboardData.setData('text/plain', selectedText);
        e.preventDefault();
      } else if (navigator?.clipboard?.writeText) {
        void navigator.clipboard.writeText(selectedText);
      }
    };

    window.addEventListener('copy', handleCopy);
    return () => {
      window.removeEventListener('copy', handleCopy);
    };
  }, [selectedText]);

  // Compute highlighted boxes in CSS coordinates for selected range
  const selectionBoxes = useMemo(() => {
    if (startIndex === null || endIndex === null || flatChars.length === 0) return [];
    const min = Math.min(startIndex, endIndex);
    const max = Math.max(startIndex, endIndex);

    return flatChars.slice(min, max + 1).map((fc) => mapper.pdfRectToCss(fc.pdfBox));
  }, [startIndex, endIndex, flatChars, mapper]);

  const cssSize = mapper.getCssSize();

  return (
    <div
      ref={containerRef}
      data-testid={`text-selection-layer-${pageIndex}`}
      data-selected-text={selectedText}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`text-selection-layer ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: cssSize.width,
        height: cssSize.height,
        cursor: 'text',
        userSelect: 'none',
        zIndex: 20
      }}
    >
      {/* Selected character highlight boxes */}
      {selectionBoxes.map((box, idx) => (
        <div
          key={`selection-box-${idx}`}
          data-testid="selection-highlight-box"
          style={{
            position: 'absolute',
            left: box.x,
            top: box.y,
            width: box.width,
            height: box.height,
            backgroundColor: 'rgba(59, 130, 246, 0.35)',
            pointerEvents: 'none'
          }}
        />
      ))}
    </div>
  );
};
