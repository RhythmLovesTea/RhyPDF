/**
 * @rhypdf/edit-core
 * Task 11.2: Free-hand drawing smoother and stroke generator.
 * Uses Catmull-Rom spline to cubic Bezier segment conversion.
 */

import type { Rect, PathSegment, Point, ColorRGBA } from '@rhypdf/pdf-model';
import type { DrawingPoint, DrawingStrokeOptions, DrawingStrokeObject, DrawingTool } from './types';

/**
 * Converts a sequence of raw pointer points into smooth cubic Bezier path segments.
 */
export function smoothPointsToSegments(points: DrawingPoint[]): PathSegment[] {
  if (points.length === 0) {
    return [];
  }

  if (points.length === 1) {
    const p = points[0]!;
    return [
      { type: 'moveTo', points: [{ x: p.x, y: p.y }] },
      { type: 'lineTo', points: [{ x: p.x + 0.1, y: p.y + 0.1 }] }
    ];
  }

  if (points.length === 2) {
    const p0 = points[0]!;
    const p1 = points[1]!;
    return [
      { type: 'moveTo', points: [{ x: p0.x, y: p0.y }] },
      { type: 'lineTo', points: [{ x: p1.x, y: p1.y }] }
    ];
  }

  const segments: PathSegment[] = [];
  segments.push({ type: 'moveTo', points: [{ x: points[0]!.x, y: points[0]!.y }] });

  // For 3 or more points: Catmull-Rom spline converted to cubic Bezier curves
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0]! : points[i - 1]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = i + 2 < points.length ? points[i + 2]! : p2;

    // Catmull-Rom to Cubic Bezier control points (tension = 0.5):
    // cp1 = p1 + (p2 - p0) / 6
    // cp2 = p2 - (p3 - p1) / 6
    const cp1: Point = {
      x: p1.x + (p2.x - p0.x) / 6,
      y: p1.y + (p2.y - p0.y) / 6
    };
    const cp2: Point = {
      x: p2.x - (p3.x - p1.x) / 6,
      y: p2.y - (p3.y - p1.y) / 6
    };

    segments.push({
      type: 'bezierCurveTo',
      points: [cp1, cp2, { x: p2.x, y: p2.y }]
    });
  }

  return segments;
}

/**
 * Computes bounding rectangle enclosing all points with padding for line width.
 */
export function computeStrokeBounds(points: DrawingPoint[], lineWidth: number): Rect {
  if (points.length === 0) {
    return { left: 0, bottom: 0, right: 0, top: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  const halfWidth = Math.max(1, lineWidth / 2);

  return {
    left: minX - halfWidth,
    bottom: minY - halfWidth,
    right: maxX + halfWidth,
    top: maxY + halfWidth
  };
}

/**
 * Creates a vector DrawingStrokeObject from recorded points and options.
 */
export function createDrawingStroke(
  points: DrawingPoint[],
  options: DrawingStrokeOptions = { tool: 'pen' }
): DrawingStrokeObject {
  const tool: DrawingTool = options.tool || 'pen';

  // Marker default: yellow-amber, 18pt width, 0.4 opacity
  // Pen default: dark slate/black, 2.5pt width, 1.0 opacity
  let color: ColorRGBA;
  let lineWidth: number;
  let opacity: number;

  if (tool === 'marker') {
    color = options.color ?? { r: 250, g: 204, b: 21, a: 102 }; // #facc15 with 40% alpha
    lineWidth = options.lineWidth ?? 18;
    opacity = options.opacity ?? 0.45;
  } else {
    color = options.color ?? { r: 15, g: 23, b: 42, a: 255 }; // #0f172a
    lineWidth = options.lineWidth ?? 2.5;
    opacity = options.opacity ?? 1.0;
  }

  const segments = smoothPointsToSegments(points);
  const bounds = computeStrokeBounds(points, lineWidth);
  const id = `stroke-${tool}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    id,
    type: 'path',
    isDrawingStroke: true,
    tool,
    rawPoints: [...points],
    bounds,
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: tool === 'marker' ? 25 : 60,
    segments,
    stroke: true,
    strokeColor: color,
    lineWidth,
    opacity,
    fill: false
  };
}

/**
 * Hit test helper for eraser: returns true if point is within threshold of any segment in the stroke.
 */
export function strokeIntersectsPoint(
  stroke: DrawingStrokeObject,
  point: Point,
  threshold: number = 8
): boolean {
  // First check bounding box + threshold
  const b = stroke.bounds;
  if (
    point.x < b.left - threshold ||
    point.x > b.right + threshold ||
    point.y < b.bottom - threshold ||
    point.y > b.top + threshold
  ) {
    return false;
  }

  const pts = stroke.rawPoints;
  if (pts.length === 0) return false;

  const totalThreshold = threshold + stroke.lineWidth / 2;
  const threshSq = totalThreshold * totalThreshold;

  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i]!;
    if (i < pts.length - 1) {
      const p2 = pts[i + 1]!;
      // Distance from point to line segment (p1, p2)
      const distSq = distanceSqToSegment(point, p1, p2);
      if (distSq <= threshSq) {
        return true;
      }
    } else {
      const dx = point.x - p1.x;
      const dy = point.y - p1.y;
      if (dx * dx + dy * dy <= threshSq) {
        return true;
      }
    }
  }

  return false;
}

function distanceSqToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
  if (l2 === 0) {
    const dx = p.x - v.x;
    const dy = p.y - v.y;
    return dx * dx + dy * dy;
  }
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  const dx = p.x - projX;
  const dy = p.y - projY;
  return dx * dx + dy * dy;
}
