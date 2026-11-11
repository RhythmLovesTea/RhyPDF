/**
 * @rhypdf/edit-core
 * Task 11.11: Page background color generator.
 */

import type { Rect, PathObject, ColorRGBA } from '@rhypdf/pdf-model';

export function createPageBackground(
  pageWidth: number,
  pageHeight: number,
  color: ColorRGBA
): PathObject {
  const bounds: Rect = {
    left: 0,
    bottom: 0,
    right: pageWidth,
    top: pageHeight
  };

  const id = `bg-page-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    id,
    type: 'path',
    bounds,
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: -100, // Bottom-most layer
    segments: [
      { type: 'moveTo', points: [{ x: 0, y: 0 }] },
      { type: 'lineTo', points: [{ x: pageWidth, y: 0 }] },
      { type: 'lineTo', points: [{ x: pageWidth, y: pageHeight }] },
      { type: 'lineTo', points: [{ x: 0, y: pageHeight }] },
      { type: 'closePath', points: [], close: true }
    ],
    fill: true,
    fillColor: color,
    stroke: false,
    lineWidth: 0
  };
}
