/**
 * @rhypdf/edit-core
 * Task 11.1: Shape Path Generator.
 * Generates vector PathSegments for rectangle, rounded rectangle, ellipse, line, arrow, triangle, and star.
 */

import type { Rect, PathSegment, Point } from '@rhypdf/pdf-model';
import type { ShapeType, ShapeOptions, ShapeObject } from './types';

const KAPPA = 0.5522847498307935; // Cubic Bezier constant for circle/ellipse approximation

export function createShape(
  type: ShapeType,
  bounds: Rect,
  options: ShapeOptions = {}
): ShapeObject {
  const {
    fill = true,
    fillColor = { r: 59, g: 130, b: 246, a: 255 }, // #3b82f6 (blue)
    stroke = true,
    strokeColor = { r: 29, g: 78, b: 216, a: 255 }, // #1d4ed8
    lineWidth = 2,
    lineDash = [],
    opacity = 1.0,
    rotation = 0,
    cornerRadius = 8,
    arrowHeadLength = 14,
    arrowHeadWidth = 10,
    starPoints = 5,
    innerRadiusRatio = 0.5
  } = options;

  let segments: PathSegment[] = [];

  const left = Math.min(bounds.left, bounds.right);
  const right = Math.max(bounds.left, bounds.right);
  const bottom = Math.min(bounds.bottom, bounds.top);
  const top = Math.max(bounds.bottom, bounds.top);
  const width = Math.max(1, right - left);
  const height = Math.max(1, top - bottom);

  switch (type) {
    case 'rectangle': {
      segments = [
        { type: 'moveTo', points: [{ x: left, y: bottom }] },
        { type: 'lineTo', points: [{ x: right, y: bottom }] },
        { type: 'lineTo', points: [{ x: right, y: top }] },
        { type: 'lineTo', points: [{ x: left, y: top }] },
        { type: 'closePath', points: [], close: true }
      ];
      break;
    }

    case 'roundedRectangle': {
      const r = Math.min(cornerRadius, width / 2, height / 2);
      const k = r * KAPPA;

      segments = [
        { type: 'moveTo', points: [{ x: left + r, y: bottom }] },
        // Bottom edge to bottom-right corner
        { type: 'lineTo', points: [{ x: right - r, y: bottom }] },
        {
          type: 'bezierCurveTo',
          points: [
            { x: right - r + k, y: bottom },
            { x: right, y: bottom + r - k },
            { x: right, y: bottom + r }
          ]
        },
        // Right edge to top-right corner
        { type: 'lineTo', points: [{ x: right, y: top - r }] },
        {
          type: 'bezierCurveTo',
          points: [
            { x: right, y: top - r + k },
            { x: right - r + k, y: top },
            { x: right - r, y: top }
          ]
        },
        // Top edge to top-left corner
        { type: 'lineTo', points: [{ x: left + r, y: top }] },
        {
          type: 'bezierCurveTo',
          points: [
            { x: left + r - k, y: top },
            { x: left, y: top - r + k },
            { x: left, y: top - r }
          ]
        },
        // Left edge to bottom-left corner
        { type: 'lineTo', points: [{ x: left, y: bottom + r }] },
        {
          type: 'bezierCurveTo',
          points: [
            { x: left, y: bottom + r - k },
            { x: left + r - k, y: bottom },
            { x: left + r, y: bottom }
          ]
        },
        { type: 'closePath', points: [], close: true }
      ];
      break;
    }

    case 'ellipse': {
      const rx = width / 2;
      const ry = height / 2;
      const cx = left + rx;
      const cy = bottom + ry;
      const kx = rx * KAPPA;
      const ky = ry * KAPPA;

      segments = [
        { type: 'moveTo', points: [{ x: cx + rx, y: cy }] },
        {
          type: 'bezierCurveTo',
          points: [
            { x: cx + rx, y: cy + ky },
            { x: cx + kx, y: cy + ry },
            { x: cx, y: cy + ry }
          ]
        },
        {
          type: 'bezierCurveTo',
          points: [
            { x: cx - kx, y: cy + ry },
            { x: cx - rx, y: cy + ky },
            { x: cx - rx, y: cy }
          ]
        },
        {
          type: 'bezierCurveTo',
          points: [
            { x: cx - rx, y: cy - ky },
            { x: cx - kx, y: cy - ry },
            { x: cx, y: cy - ry }
          ]
        },
        {
          type: 'bezierCurveTo',
          points: [
            { x: cx + kx, y: cy - ry },
            { x: cx + rx, y: cy - ky },
            { x: cx + rx, y: cy }
          ]
        },
        { type: 'closePath', points: [], close: true }
      ];
      break;
    }

    case 'line': {
      segments = [
        { type: 'moveTo', points: [{ x: bounds.left, y: bounds.bottom }] },
        { type: 'lineTo', points: [{ x: bounds.right, y: bounds.top }] }
      ];
      break;
    }

    case 'arrow': {
      const x0 = bounds.left;
      const y0 = bounds.bottom;
      const x1 = bounds.right;
      const y1 = bounds.top;

      const angle = Math.atan2(y1 - y0, x1 - x0);
      const headLen = Math.min(arrowHeadLength, Math.hypot(x1 - x0, y1 - y0) * 0.4);
      const headWidth = arrowHeadWidth;

      // Stem endpoint slightly set back so arrowhead sits on tip
      const stemEndX = x1 - headLen * Math.cos(angle);
      const stemEndY = y1 - headLen * Math.sin(angle);

      // Arrow head corners
      const arrowLeftX = x1 - headLen * Math.cos(angle) + (headWidth / 2) * Math.sin(angle);
      const arrowLeftY = y1 - headLen * Math.sin(angle) - (headWidth / 2) * Math.cos(angle);
      const arrowRightX = x1 - headLen * Math.cos(angle) - (headWidth / 2) * Math.sin(angle);
      const arrowRightY = y1 - headLen * Math.sin(angle) + (headWidth / 2) * Math.cos(angle);

      segments = [
        // Main stem
        { type: 'moveTo', points: [{ x: x0, y: y0 }] },
        { type: 'lineTo', points: [{ x: stemEndX, y: stemEndY }] },
        // Arrow head triangle
        { type: 'moveTo', points: [{ x: x1, y: y1 }] },
        { type: 'lineTo', points: [{ x: arrowLeftX, y: arrowLeftY }] },
        { type: 'lineTo', points: [{ x: arrowRightX, y: arrowRightY }] },
        { type: 'closePath', points: [], close: true }
      ];
      break;
    }

    case 'triangle': {
      segments = [
        { type: 'moveTo', points: [{ x: left + width / 2, y: top }] }, // Apex
        { type: 'lineTo', points: [{ x: right, y: bottom }] }, // Bottom right
        { type: 'lineTo', points: [{ x: left, y: bottom }] }, // Bottom left
        { type: 'closePath', points: [], close: true }
      ];
      break;
    }

    case 'star': {
      const cx = left + width / 2;
      const cy = bottom + height / 2;
      const outerR = Math.min(width, height) / 2;
      const innerR = outerR * innerRadiusRatio;
      const numPoints = starPoints;
      const step = Math.PI / numPoints;

      const pts: Point[] = [];
      let currentAngle = -Math.PI / 2; // Start at top point

      for (let i = 0; i < numPoints * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        pts.push({
          x: cx + r * Math.cos(currentAngle),
          y: cy + r * Math.sin(currentAngle)
        });
        currentAngle += step;
      }

      segments = [{ type: 'moveTo', points: [pts[0]!] }];
      for (let i = 1; i < pts.length; i++) {
        segments.push({ type: 'lineTo', points: [pts[i]!] });
      }
      segments.push({ type: 'closePath', points: [], close: true });
      break;
    }
  }

  const id = `shape-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    id,
    type: 'path',
    shapeType: type,
    shapeOptions: options,
    bounds: { left, bottom, right, top },
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: 50,
    segments,
    fill,
    fillColor: fill ? fillColor : undefined,
    stroke,
    strokeColor: stroke ? strokeColor : undefined,
    lineWidth,
    dashArray: lineDash.length > 0 ? lineDash : undefined,
    rotation,
    opacity
  };
}
