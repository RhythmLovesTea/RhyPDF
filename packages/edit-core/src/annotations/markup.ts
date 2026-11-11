import type { Rect, ColorRGBA, AnnotationObject, PathObject, PathSegment } from '@rhypdf/pdf-model';
import type { MarkupAnnotationOptions, TextMarkupType } from './types';

export const DEFAULT_MARKUP_COLORS: Record<TextMarkupType, ColorRGBA> = {
  Highlight: { r: 254, g: 240, b: 138, a: 128 }, // semi-transparent yellow
  Underline: { r: 37, g: 99, b: 235, a: 255 }, // blue
  StrikeOut: { r: 239, g: 68, b: 68, a: 255 }, // red
  Squiggly: { r: 22, g: 163, b: 74, a: 255 } // green
};

/**
 * Computes standard PDF QuadPoints (§12.5.6.10) for a bounding box:
 * 8 numbers representing [x1, y1, x2, y2, x3, y3, x4, y4]
 * (x1, y1) = upper-left, (x2, y2) = upper-right, (x3, y3) = lower-left, (x4, y4) = lower-right
 * in PDF coordinate space (origin at bottom-left, Y points up).
 */
export function computeQuadPointsFromBounds(bounds: Rect): number[] {
  return [
    bounds.left,
    bounds.top,
    bounds.right,
    bounds.top,
    bounds.left,
    bounds.bottom,
    bounds.right,
    bounds.bottom
  ];
}

/**
 * Computes multi-line QuadPoints concatenating 8 numbers per line bounding box.
 */
export function computeMultiLineQuadPoints(lineBoxes: Rect[]): number[] {
  const result: number[] = [];
  for (const box of lineBoxes) {
    result.push(box.left, box.top, box.right, box.top, box.left, box.bottom, box.right, box.bottom);
  }
  return result;
}

/**
 * Creates a text markup annotation object.
 */
export function createMarkupAnnotation(options: MarkupAnnotationOptions): AnnotationObject {
  const id = `annot-markup-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const quadPoints =
    options.quadPoints && options.quadPoints.length > 0
      ? options.quadPoints
      : computeQuadPointsFromBounds(options.bounds);

  const defaultColor = DEFAULT_MARKUP_COLORS[options.subType];
  const color = options.color ?? defaultColor;
  const opacity = options.opacity ?? (options.subType === 'Highlight' ? 0.5 : 1.0);

  return {
    id,
    type: 'annotation',
    subType: options.subType,
    bounds: { ...options.bounds },
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: options.zIndex ?? (options.subType === 'Highlight' ? 10 : 80),
    quadPoints,
    color,
    opacity,
    author: options.author ?? 'User',
    createdAt: new Date().toISOString(),
    contents: options.contents,
    customText: options.text
  };
}

/**
 * Converts a text markup annotation into vector PathObjects for rendering and flattening.
 */
export function markupToVectorPaths(annotation: AnnotationObject): PathObject[] {
  const paths: PathObject[] = [];
  const quads = annotation.quadPoints ?? computeQuadPointsFromBounds(annotation.bounds);
  const color = annotation.color ??
    DEFAULT_MARKUP_COLORS[annotation.subType as TextMarkupType] ?? {
      r: 254,
      g: 240,
      b: 138,
      a: 128
    };
  const opacity = annotation.opacity ?? 1.0;

  // Each quad is 8 coordinates: [x1, y1, x2, y2, x3, y3, x4, y4]
  for (let i = 0; i < quads.length; i += 8) {
    if (i + 7 >= quads.length) break;
    const x1 = quads[i]!;
    const y1 = quads[i + 1]!;
    const x2 = quads[i + 2]!;
    const y2 = quads[i + 3]!;
    const x3 = quads[i + 4]!;
    const y3 = quads[i + 5]!;
    const x4 = quads[i + 6]!;
    const y4 = quads[i + 7]!;

    const left = Math.min(x1, x2, x3, x4);
    const right = Math.max(x1, x2, x3, x4);
    const bottom = Math.min(y1, y2, y3, y4);
    const top = Math.max(y1, y2, y3, y4);

    if (annotation.subType === 'Highlight') {
      const segments: PathSegment[] = [
        { type: 'moveTo', points: [{ x: x1, y: y1 }] },
        { type: 'lineTo', points: [{ x: x2, y: y2 }] },
        { type: 'lineTo', points: [{ x: x4, y: y4 }] },
        { type: 'lineTo', points: [{ x: x3, y: y3 }] },
        { type: 'closePath', points: [] }
      ];

      paths.push({
        id: `${annotation.id}-path-${i / 8}`,
        type: 'path',
        bounds: { left, bottom, right, top },
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: annotation.zIndex,
        segments,
        fillColor: { ...color, a: Math.round(opacity * 255) },
        fill: true,
        fillMode: 'winding',
        lineWidth: 0,
        stroke: false
      });
    } else if (annotation.subType === 'Underline') {
      const lineY = bottom + 1;
      const segments: PathSegment[] = [
        { type: 'moveTo', points: [{ x: left, y: lineY }] },
        { type: 'lineTo', points: [{ x: right, y: lineY }] }
      ];

      paths.push({
        id: `${annotation.id}-path-${i / 8}`,
        type: 'path',
        bounds: { left, bottom: lineY - 1, right, top: lineY + 1 },
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: annotation.zIndex,
        segments,
        strokeColor: { ...color, a: Math.round(opacity * 255) },
        lineWidth: 1.5,
        stroke: true,
        fill: false
      });
    } else if (annotation.subType === 'StrikeOut') {
      const lineY = (top + bottom) / 2;
      const segments: PathSegment[] = [
        { type: 'moveTo', points: [{ x: left, y: lineY }] },
        { type: 'lineTo', points: [{ x: right, y: lineY }] }
      ];

      paths.push({
        id: `${annotation.id}-path-${i / 8}`,
        type: 'path',
        bounds: { left, bottom: lineY - 1, right, top: lineY + 1 },
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: annotation.zIndex,
        segments,
        strokeColor: { ...color, a: Math.round(opacity * 255) },
        lineWidth: 1.5,
        stroke: true,
        fill: false
      });
    } else if (annotation.subType === 'Squiggly') {
      // Draw wavy / sinusoidal wave at bottom
      const lineY = bottom + 1;
      const waveHeight = 1.5;
      const waveLength = 4;
      const segments: PathSegment[] = [{ type: 'moveTo', points: [{ x: left, y: lineY }] }];

      let currX = left;
      let up = true;
      while (currX < right) {
        const nextX = Math.min(currX + waveLength, right);
        const targetY = up ? lineY + waveHeight : lineY - waveHeight;
        segments.push({
          type: 'lineTo',
          points: [{ x: nextX, y: targetY }]
        });
        currX = nextX;
        up = !up;
      }

      paths.push({
        id: `${annotation.id}-path-${i / 8}`,
        type: 'path',
        bounds: { left, bottom: lineY - waveHeight, right, top: lineY + waveHeight },
        matrix: [1, 0, 0, 1, 0, 0],
        zIndex: annotation.zIndex,
        segments,
        strokeColor: { ...color, a: Math.round(opacity * 255) },
        lineWidth: 1.2,
        stroke: true,
        fill: false
      });
    }
  }

  return paths;
}
