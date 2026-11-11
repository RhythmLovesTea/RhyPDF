import React, { useRef } from 'react';
import type { ColorRGBA, RotationAngle } from '@rhypdf/pdf-model';
import { CoordinateMapper } from '@rhypdf/pdf-model';
import type { DrawingTool, DrawingStrokeObject, DrawingPoint } from '@rhypdf/edit-core';
import { createDrawingStroke, strokeIntersectsPoint } from '@rhypdf/edit-core';

export interface DrawingCanvasOverlayProps {
  pageWidthPt: number;
  pageHeightPt: number;
  rotation?: RotationAngle;
  scale?: number;
  tool: DrawingTool;
  color?: string; // hex
  strokeWidth?: number;
  opacity?: number;
  existingStrokes?: DrawingStrokeObject[];
  onCommitStroke: (stroke: DrawingStrokeObject) => void;
  onEraseStroke?: (strokeId: string) => void;
}

export const DrawingCanvasOverlay: React.FC<DrawingCanvasOverlayProps> = ({
  pageWidthPt,
  pageHeightPt,
  rotation = 0,
  scale = 1.0,
  tool,
  color = '#0f172a',
  strokeWidth = 2.5,
  opacity = 1.0,
  existingStrokes = [],
  onCommitStroke,
  onEraseStroke
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const currentPointsRef = useRef<DrawingPoint[]>([]);

  const mapper = new CoordinateMapper(pageWidthPt, pageHeightPt, rotation, scale);
  const cssWidth = mapper.effectiveWidthPt * scale;
  const cssHeight = mapper.effectiveHeightPt * scale;

  const hexToRgba = (hex: string, alpha: number = 1): ColorRGBA => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return { r, g, b, a: Math.round(alpha * 255) };
  };

  const redrawLivePath = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pts = currentPointsRef.current;
    if (pts.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth * scale;
    ctx.globalAlpha = tool === 'marker' ? 0.45 : opacity;

    ctx.beginPath();
    ctx.moveTo(pts[0]!.x, pts[0]!.y);

    for (let i = 1; i < pts.length; i++) {
      const p1 = pts[i - 1]!;
      const p2 = pts[i]!;
      const midX = (p1.x + p2.x) / 2;
      const midY = (p1.y + p2.y) / 2;
      ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
    }

    ctx.stroke();
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    isDrawingRef.current = true;

    if (tool === 'eraser') {
      checkAndEraseAtCssPoint(cssX, cssY);
    } else {
      currentPointsRef.current = [{ x: cssX, y: cssY, pressure }];
      redrawLivePath();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const cssX = e.clientX - rect.left;
    const cssY = e.clientY - rect.top;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    if (tool === 'eraser') {
      checkAndEraseAtCssPoint(cssX, cssY);
    } else {
      currentPointsRef.current.push({ x: cssX, y: cssY, pressure });
      redrawLivePath();
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (tool !== 'eraser' && currentPointsRef.current.length > 0) {
      // Map CSS points back to PDF points
      const pdfPoints: DrawingPoint[] = currentPointsRef.current.map((pt) => {
        const pdfPt = mapper.cssPointToPdf(pt.x, pt.y);
        return {
          x: pdfPt.x,
          y: pdfPt.y,
          pressure: pt.pressure
        };
      });

      const stroke = createDrawingStroke(pdfPoints, {
        tool,
        color: hexToRgba(color, opacity),
        lineWidth: strokeWidth,
        opacity: tool === 'marker' ? 0.45 : opacity
      });

      onCommitStroke(stroke);
    }

    currentPointsRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const checkAndEraseAtCssPoint = (cssX: number, cssY: number) => {
    if (!onEraseStroke || existingStrokes.length === 0) return;
    const pdfPt = mapper.cssPointToPdf(cssX, cssY);

    for (const stroke of existingStrokes) {
      if (strokeIntersectsPoint(stroke, pdfPt, 8)) {
        onEraseStroke(stroke.id);
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="drawing-canvas-overlay"
      width={cssWidth}
      height={cssHeight}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        isDrawingRef.current = false;
        currentPointsRef.current = [];
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
      }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: cssWidth,
        height: cssHeight,
        zIndex: 500,
        cursor: tool === 'eraser' ? 'crosshair' : 'crosshair',
        touchAction: 'none'
      }}
    />
  );
};
