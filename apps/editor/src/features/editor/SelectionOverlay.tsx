import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CoordinateMapper, PageObject, Rect, RotationAngle, BoundingBox } from '@rhypdf/pdf-model';
import {
  computeSelectionBounds,
  calculateSnap,
  marqueeSelect,
  SnapGuide,
  type TextBlock
} from '@rhypdf/edit-core';
import { triggerHaptic } from '../../lib/haptics';

export type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate' | 'body';

export interface SelectionOverlayProps {
  pageWidthPt: number;
  pageHeightPt: number;
  rotation?: RotationAngle;
  scale?: number;
  dpr?: number;
  pageObjects: PageObject[];
  selectedIds: string[];
  activeMode?: string;
  isCropping?: boolean;
  cropBoxPdf?: Rect | null;
  snappingEnabled?: boolean;
  textBlocks?: TextBlock[];
  activeBlockId?: string | null;
  isRegionSelectMode?: boolean;
  onSelectIds?: (ids: string[]) => void;
  onSelectBlock?: (blockId: string) => void;
  onDoubleClickBlock?: (blockId: string) => void;
  onRegionSelected?: (regionPdf: Rect) => void;
  onMove?: (deltaXPt: number, deltaYPt: number) => void;
  onResize?: (newBoundsPdf: Rect) => void;
  onRotate?: (newAngleDeg: number) => void;
  onClearSelection?: () => void;
  onCropChange?: (newCropPdf: Rect) => void;
  onOcrDetectRequested?: () => void;
}

export const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
  pageWidthPt,
  pageHeightPt,
  rotation = 0,
  scale = 1.0,
  dpr = 1.0,
  pageObjects,
  selectedIds,
  activeMode = 'view',
  isCropping = false,
  cropBoxPdf = null,
  snappingEnabled = true,
  textBlocks = [],
  activeBlockId = null,
  isRegionSelectMode = false,
  onSelectIds,
  onSelectBlock,
  onDoubleClickBlock,
  onRegionSelected,
  onMove,
  onResize,
  onRotate,
  onClearSelection,
  onCropChange: _onCropChange,
  onOcrDetectRequested
}) => {
  const mapper = new CoordinateMapper(pageWidthPt, pageHeightPt, rotation, scale, dpr);
  const cssSize = mapper.getCssSize();

  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<BoundingBox | null>(null);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [showOcrHint, setShowOcrHint] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const pendingPointerRef = useRef<{ clientX: number; clientY: number; shiftKey: boolean } | null>(
    null
  );
  const pointerRafRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pointerRafRef.current !== null) {
        cancelAnimationFrame(pointerRafRef.current);
      }
    };
  }, []);

  // Filter selectable objects if in mode-specific views
  const eligibleObjects =
    activeMode === 'edit-images'
      ? pageObjects.filter((o) => o.type === 'image')
      : activeMode === 'edit-text'
        ? pageObjects.filter((o) => o.type === 'text')
        : pageObjects;

  // Selected text block if in edit-text mode
  const currentTextBlock =
    activeMode === 'edit-text' && activeBlockId
      ? textBlocks.find((b) => b.id === activeBlockId)
      : null;

  // Compute union selection bounds
  const boundsPdf = currentTextBlock
    ? currentTextBlock.bounds
    : computeSelectionBounds(eligibleObjects, selectedIds);

  const boxCss = boundsPdf ? mapper.pdfRectToCss(boundsPdf) : null;
  const cropBoxCss = cropBoxPdf ? mapper.pdfRectToCss(cropBoxPdf) : null;

  // Sibling objects for snapping (non-selected objects)
  const selectedSet = new Set(selectedIds);
  const siblingObjects = eligibleObjects.filter((o) => !selectedSet.has(o.id));

  const handlePointerDown = (e: React.PointerEvent, handle: HandleType) => {
    e.stopPropagation();
    e.preventDefault();
    if (typeof (e.target as Element).setPointerCapture === 'function') {
      (e.target as Element).setPointerCapture(e.pointerId);
    }
    setActiveHandle(handle);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleSvgPointerDown = (e: React.PointerEvent) => {
    // If clicking on SVG canvas
    if (e.target === svgRef.current) {
      if (!e.shiftKey && selectedIds.length > 0) {
        onClearSelection?.();
      }
      const rect = svgRef.current.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top;
      setDragStart({ x: e.clientX, y: e.clientY });
      setMarqueeBox({ x: startX, y: startY, width: 0, height: 0 });
      if (typeof (e.target as Element).setPointerCapture === 'function') {
        (e.target as Element).setPointerCapture(e.pointerId);
      }
    }
  };

  const processPointerDelta = useCallback(
    (clientX: number, clientY: number, shiftKey: boolean) => {
      if (!dragStart || !boundsPdf || !boxCss) return;

      const dxScreen = clientX - dragStart.x;
      const dyScreen = clientY - dragStart.y;

      if (activeHandle === 'body') {
        const dxPt = dxScreen / scale;
        const dyPt = -dyScreen / scale; // PDF Y is inverted from screen

        let finalDxPt = dxPt;
        let finalDyPt = dyPt;

        if (snappingEnabled) {
          const testBounds: Rect = {
            left: boundsPdf.left + dxPt,
            bottom: boundsPdf.bottom + dyPt,
            right: boundsPdf.right + dxPt,
            top: boundsPdf.top + dyPt
          };
          const snap = calculateSnap(
            testBounds,
            { width: pageWidthPt, height: pageHeightPt },
            siblingObjects
          );
          if (snap.snappedX) finalDxPt = snap.x - boundsPdf.left;
          if (snap.snappedY) finalDyPt = snap.y - boundsPdf.bottom;
          if (snap.guides.length > 0 && activeGuides.length === 0) {
            triggerHaptic('snap');
          }
          setActiveGuides(snap.guides);
        } else {
          setActiveGuides([]);
        }

        onMove?.(finalDxPt, finalDyPt);
        setDragStart({ x: clientX, y: clientY });
      } else if (activeHandle === 'rotate') {
        const centerScreenX = boxCss.x + boxCss.width / 2;
        const centerScreenY = boxCss.y + boxCss.height / 2;
        const curAngleRad = Math.atan2(clientY - centerScreenY, clientX - centerScreenX);
        const startAngleRad = Math.atan2(dragStart.y - centerScreenY, dragStart.x - centerScreenX);
        let angleDeltaDeg = ((curAngleRad - startAngleRad) * 180) / Math.PI;

        if (shiftKey) {
          angleDeltaDeg = Math.round(angleDeltaDeg / 15) * 15;
        }
        onRotate?.(angleDeltaDeg);
      } else if (activeHandle) {
        // Resize handle
        const dxPt = dxScreen / scale;
        const dyPt = -dyScreen / scale;

        let newLeft = boundsPdf.left;
        let newRight = boundsPdf.right;
        let newBottom = boundsPdf.bottom;
        let newTop = boundsPdf.top;

        if (activeHandle.includes('w')) newLeft += dxPt;
        if (activeHandle.includes('e')) newRight += dxPt;
        if (activeHandle.includes('s')) newBottom += dyPt;
        if (activeHandle.includes('n')) newTop += dyPt;

        if (newRight > newLeft + 10 && newTop > newBottom + 10) {
          onResize?.({
            left: newLeft,
            bottom: newBottom,
            right: newRight,
            top: newTop
          });
          setDragStart({ x: clientX, y: clientY });
        }
      }
    },
    [
      dragStart,
      boundsPdf,
      boxCss,
      activeHandle,
      scale,
      snappingEnabled,
      pageWidthPt,
      pageHeightPt,
      siblingObjects,
      onMove,
      onRotate,
      onResize
    ]
  );

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart) return;

    // Handle marquee / region dragging
    if (marqueeBox && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const startX = dragStart.x - rect.left;
      const startY = dragStart.y - rect.top;

      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      setMarqueeBox({ x, y, width, height });
      return;
    }

    if (!boundsPdf || !boxCss) return;

    pendingPointerRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      shiftKey: e.shiftKey
    };

    const isTestEnv =
      typeof process !== 'undefined' &&
      Boolean(process.env?.NODE_ENV === 'test' || process.env?.VITEST);

    if (!isTestEnv && typeof requestAnimationFrame === 'function') {
      if (pointerRafRef.current === null) {
        pointerRafRef.current = requestAnimationFrame(() => {
          pointerRafRef.current = null;
          if (pendingPointerRef.current) {
            processPointerDelta(
              pendingPointerRef.current.clientX,
              pendingPointerRef.current.clientY,
              pendingPointerRef.current.shiftKey
            );
            pendingPointerRef.current = null;
          }
        });
      }
    } else {
      processPointerDelta(e.clientX, e.clientY, e.shiftKey);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (pointerRafRef.current !== null) {
      cancelAnimationFrame(pointerRafRef.current);
      pointerRafRef.current = null;
    }
    if (pendingPointerRef.current) {
      processPointerDelta(
        pendingPointerRef.current.clientX,
        pendingPointerRef.current.clientY,
        pendingPointerRef.current.shiftKey
      );
      pendingPointerRef.current = null;
    }
    if (typeof (e.target as Element).releasePointerCapture === 'function') {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // Ignore
      }
    }

    if (marqueeBox) {
      if (marqueeBox.width > 5 && marqueeBox.height > 5) {
        const regionPdf = mapper.cssRectToPdf(marqueeBox);
        if (isRegionSelectMode) {
          onRegionSelected?.(regionPdf);
        } else {
          const selected = marqueeSelect(eligibleObjects, regionPdf);
          onSelectIds?.(selected);
        }
      }
    }
    setActiveHandle(null);
    setDragStart(null);
    setMarqueeBox(null);
    setActiveGuides([]);
  };

  const HANDLE_SIZE = 8;
  const HALF_HANDLE = HANDLE_SIZE / 2;

  return (
    <svg
      ref={svgRef}
      data-testid="selection-overlay"
      onPointerDown={handleSvgPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: cssSize.width,
        height: cssSize.height,
        pointerEvents: 'auto',
        overflow: 'visible',
        zIndex: 20
      }}
    >
      {/* Active Snapping Guidelines */}
      {activeGuides.map((guide, idx) => {
        if (guide.type === 'vertical') {
          const p = mapper.pdfPointToCss(guide.position, 0);
          return (
            <line
              key={`guide-v-${idx}`}
              data-testid="snap-guide-vertical"
              x1={p.x}
              y1={0}
              x2={p.x}
              y2={cssSize.height}
              stroke="#06b6d4"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          );
        } else {
          const p = mapper.pdfPointToCss(0, guide.position);
          return (
            <line
              key={`guide-h-${idx}`}
              data-testid="snap-guide-horizontal"
              x1={0}
              y1={p.y}
              x2={cssSize.width}
              y2={p.y}
              stroke="#06b6d4"
              strokeWidth={1}
              strokeDasharray="4 2"
            />
          );
        }
      })}

      {/* Marquee Selection Rectangle */}
      {marqueeBox && (
        <rect
          data-testid="marquee-selection-box"
          x={marqueeBox.x}
          y={marqueeBox.y}
          width={marqueeBox.width}
          height={marqueeBox.height}
          fill="rgba(59, 130, 246, 0.15)"
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}

      {/* Task 7.5: Edit Text Mode: Hover Outlines and Click Selection */}
      {activeMode === 'edit-text' &&
        textBlocks.map((block) => {
          const blockBox = mapper.pdfRectToCss(block.bounds);
          const isSelected =
            activeBlockId === block.id || block.runs.some((r) => selectedIds.includes(r.id));
          const isHovered = hoveredBlockId === block.id;

          return (
            <rect
              key={block.id}
              data-testid={isHovered ? 'text-block-hover-outline' : `text-block-rect-${block.id}`}
              x={blockBox.x}
              y={blockBox.y}
              width={blockBox.width}
              height={blockBox.height}
              fill={
                isSelected
                  ? 'rgba(37, 99, 235, 0.08)'
                  : isHovered
                    ? 'rgba(59, 130, 246, 0.05)'
                    : 'transparent'
              }
              stroke={isSelected ? '#2563eb' : isHovered ? '#60a5fa' : 'transparent'}
              strokeWidth={1}
              strokeDasharray={isSelected ? 'none' : '3 3'}
              style={{ cursor: 'pointer' }}
              onPointerEnter={() => setHoveredBlockId(block.id)}
              onPointerLeave={() => setHoveredBlockId(null)}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelectBlock?.(block.id);
                onSelectIds?.(block.runs.map((r) => r.id));
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                onDoubleClickBlock?.(block.id);
              }}
            />
          );
        })}

      {/* Task 7.5: Non-editable element click handler in edit-text mode */}
      {activeMode === 'edit-text' &&
        pageObjects
          .filter((o) => o.type === 'image' || o.type === 'path')
          .map((obj) => {
            const b = mapper.pdfRectToCss(obj.bounds);
            return (
              <rect
                key={`non-edit-${obj.id}`}
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                fill="transparent"
                style={{ cursor: 'not-allowed' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setShowOcrHint(true);
                }}
              />
            );
          })}

      {/* Selection Bounding Box & Handles */}
      {boxCss && (
        <g data-testid="selection-box-group">
          {/* Crop Rectangle Overlay (Task 6.6) */}
          {isCropping && cropBoxCss && (
            <rect
              data-testid="crop-overlay-rect"
              x={cropBoxCss.x}
              y={cropBoxCss.y}
              width={cropBoxCss.width}
              height={cropBoxCss.height}
              fill="rgba(16, 185, 129, 0.12)"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          )}

          {/* Bounding box drag-to-move body */}
          <rect
            data-testid="selection-bounds-rect"
            x={boxCss.x}
            y={boxCss.y}
            width={boxCss.width}
            height={boxCss.height}
            fill="rgba(59, 130, 246, 0.08)"
            stroke="#2563eb"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            style={{ cursor: 'move' }}
            onPointerDown={(e) => handlePointerDown(e, 'body')}
            onDoubleClick={(e) => {
              if (activeMode === 'edit-text' && activeBlockId) {
                e.stopPropagation();
                onDoubleClickBlock?.(activeBlockId);
              }
            }}
          />

          {/* Rotate handle connector stem */}
          <line
            x1={boxCss.x + boxCss.width / 2}
            y1={boxCss.y}
            x2={boxCss.x + boxCss.width / 2}
            y2={boxCss.y - 20}
            stroke="#2563eb"
            strokeWidth={1.5}
          />

          {/* Rotate handle */}
          <circle
            data-testid="handle-rotate"
            cx={boxCss.x + boxCss.width / 2}
            cy={boxCss.y - 20}
            r={5}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={2}
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => handlePointerDown(e, 'rotate')}
          />

          {/* 8 Resize Handles (constant on-screen size at any scale) */}
          {/* NW */}
          <rect
            data-testid="handle-nw"
            x={boxCss.x - HALF_HANDLE}
            y={boxCss.y - HALF_HANDLE}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.5}
            style={{ cursor: 'nwse-resize' }}
            onPointerDown={(e) => handlePointerDown(e, 'nw')}
          />
          {/* N */}
          <rect
            data-testid="handle-n"
            x={boxCss.x + boxCss.width / 2 - HALF_HANDLE}
            y={boxCss.y - HALF_HANDLE}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.5}
            style={{ cursor: 'ns-resize' }}
            onPointerDown={(e) => handlePointerDown(e, 'n')}
          />
          {/* NE */}
          <rect
            data-testid="handle-ne"
            x={boxCss.x + boxCss.width - HALF_HANDLE}
            y={boxCss.y - HALF_HANDLE}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.5}
            style={{ cursor: 'nesw-resize' }}
            onPointerDown={(e) => handlePointerDown(e, 'ne')}
          />
          {/* E (width resize - rewrap) */}
          <rect
            data-testid="handle-e"
            x={boxCss.x + boxCss.width - HALF_HANDLE}
            y={boxCss.y + boxCss.height / 2 - HALF_HANDLE}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.5}
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => handlePointerDown(e, 'e')}
          />
          {/* SE */}
          <rect
            data-testid="handle-se"
            x={boxCss.x + boxCss.width - HALF_HANDLE}
            y={boxCss.y + boxCss.height - HALF_HANDLE}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.5}
            style={{ cursor: 'nwse-resize' }}
            onPointerDown={(e) => handlePointerDown(e, 'se')}
          />
          {/* S */}
          <rect
            data-testid="handle-s"
            x={boxCss.x + boxCss.width / 2 - HALF_HANDLE}
            y={boxCss.y + boxCss.height - HALF_HANDLE}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.5}
            style={{ cursor: 'ns-resize' }}
            onPointerDown={(e) => handlePointerDown(e, 's')}
          />
          {/* SW */}
          <rect
            data-testid="handle-sw"
            x={boxCss.x - HALF_HANDLE}
            y={boxCss.y + boxCss.height - HALF_HANDLE}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.5}
            style={{ cursor: 'nesw-resize' }}
            onPointerDown={(e) => handlePointerDown(e, 'sw')}
          />
          {/* W (width resize - rewrap) */}
          <rect
            data-testid="handle-w"
            x={boxCss.x - HALF_HANDLE}
            y={boxCss.y + boxCss.height / 2 - HALF_HANDLE}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={1.5}
            style={{ cursor: 'ew-resize' }}
            onPointerDown={(e) => handlePointerDown(e, 'w')}
          />
        </g>
      )}

      {/* Task 7.5: Non-editable raster text OCR Hint popup */}
      {showOcrHint && (
        <foreignObject x={20} y={20} width={320} height={70}>
          <div
            data-testid="ocr-hint-badge"
            style={{
              backgroundColor: 'rgba(30, 41, 59, 0.95)',
              color: '#ffffff',
              padding: '8px 12px',
              borderRadius: 6,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
            <span>Text in scanned image cannot be edited directly.</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                data-testid="btn-ocr-detect"
                onClick={() => {
                  setShowOcrHint(false);
                  onOcrDetectRequested?.();
                }}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 4,
                  padding: '3px 8px',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                Detect text (OCR)
              </button>
              <button
                onClick={() => setShowOcrHint(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                ✕
              </button>
            </div>
          </div>
        </foreignObject>
      )}
    </svg>
  );
};
