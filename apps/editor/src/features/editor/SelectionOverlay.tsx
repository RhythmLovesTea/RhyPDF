import React, { useState, useRef } from 'react';
import { CoordinateMapper, PageObject, Rect, RotationAngle, BoundingBox } from '@rhypdf/pdf-model';
import { computeSelectionBounds, calculateSnap, marqueeSelect, SnapGuide } from '@rhypdf/edit-core';

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
  onSelectIds?: (ids: string[]) => void;
  onMove?: (deltaXPt: number, deltaYPt: number) => void;
  onResize?: (newBoundsPdf: Rect) => void;
  onRotate?: (newAngleDeg: number) => void;
  onClearSelection?: () => void;
  onCropChange?: (newCropPdf: Rect) => void;
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
  onSelectIds,
  onMove,
  onResize,
  onRotate,
  onClearSelection,
  onCropChange: _onCropChange
}) => {
  const mapper = new CoordinateMapper(pageWidthPt, pageHeightPt, rotation, scale, dpr);
  const cssSize = mapper.getCssSize();

  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [marqueeBox, setMarqueeBox] = useState<BoundingBox | null>(null);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Filter selectable objects if in mode-specific views
  const eligibleObjects =
    activeMode === 'edit-images' ? pageObjects.filter((o) => o.type === 'image') : pageObjects;

  // Compute union selection bounds
  const boundsPdf = computeSelectionBounds(eligibleObjects, selectedIds);
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
    // Click on empty canvas space -> start marquee or clear selection
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

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStart) return;

    // Handle marquee dragging
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

    const dxScreen = e.clientX - dragStart.x;
    const dyScreen = e.clientY - dragStart.y;

    if (activeHandle === 'body') {
      // Drag to move
      const dxPt = dxScreen / scale;
      const dyPt = -dyScreen / scale; // PDF Y is inverted from screen

      let finalDxPt = dxPt;
      let finalDyPt = dyPt;

      if (snappingEnabled) {
        const testBounds: Rect = {
          left: boundsPdf.left + dxPt,
          right: boundsPdf.right + dxPt,
          bottom: boundsPdf.bottom + dyPt,
          top: boundsPdf.top + dyPt
        };
        const snap = calculateSnap(
          testBounds,
          { width: pageWidthPt, height: pageHeightPt },
          siblingObjects
        );
        finalDxPt = snap.x - boundsPdf.left;
        finalDyPt = snap.y - boundsPdf.bottom;
        setActiveGuides(snap.guides);
      }

      onMove?.(finalDxPt, finalDyPt);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (activeHandle && activeHandle !== 'rotate') {
      // Resize handles (Task 6.4: keep aspect ratio by default on corner handles; Shift toggles)
      const newBoxCss = { ...boxCss };
      const isCorner = ['nw', 'ne', 'se', 'sw'].includes(activeHandle);
      const keepRatio = isCorner ? !e.shiftKey : e.shiftKey;

      if (activeHandle.includes('w')) {
        newBoxCss.x += dxScreen;
        newBoxCss.width -= dxScreen;
      }
      if (activeHandle.includes('e')) {
        newBoxCss.width += dxScreen;
      }
      if (activeHandle.includes('n')) {
        newBoxCss.y += dyScreen;
        newBoxCss.height -= dyScreen;
      }
      if (activeHandle.includes('s')) {
        newBoxCss.height += dyScreen;
      }

      if (keepRatio && boxCss.height > 0 && boxCss.width > 0) {
        const origRatio = boxCss.width / boxCss.height;
        if (Math.abs(dxScreen) >= Math.abs(dyScreen)) {
          newBoxCss.height = newBoxCss.width / origRatio;
        } else {
          newBoxCss.width = newBoxCss.height * origRatio;
        }
      }

      if (newBoxCss.width > 5 && newBoxCss.height > 5) {
        const newBoundsPdf = mapper.cssRectToPdf(newBoxCss);
        onResize?.(newBoundsPdf);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    } else if (activeHandle === 'rotate') {
      // Rotate handle
      const centerX = boxCss.x + boxCss.width / 2;
      const centerY = boxCss.y + boxCss.height / 2;
      const angleRad = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const angleDeg = (angleRad * 180) / Math.PI + 90; // Align with top handle
      onRotate?.(Math.round(angleDeg));
    }
  };

  const handlePointerUp = () => {
    if (marqueeBox && marqueeBox.width > 3 && marqueeBox.height > 3) {
      const marqueePdf = mapper.cssRectToPdf(marqueeBox);
      const selected = marqueeSelect(eligibleObjects, marqueePdf, 'intersect');
      if (selected.length > 0) {
        onSelectIds?.(selected);
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
          {/* E */}
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
          {/* W */}
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
    </svg>
  );
};
