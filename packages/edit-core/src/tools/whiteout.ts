/**
 * @rhypdf/edit-core
 * Task 11.3: Whiteout / Cover tool.
 * Creates a visual opaque cover rectangle over page content.
 * Clearly marked as a visual cover and NOT cryptographic/permanent redaction.
 */

import type { Rect, ColorRGBA } from '@rhypdf/pdf-model';
import type { ShapeObject } from '../shapes/types';
import { createShape } from '../shapes/generator';

export interface WhiteoutCoverOptions {
  color?: ColorRGBA; // default: pure opaque white
  opacity?: number; // default: 1.0
}

export const WHITEOUT_DISCLAIMER =
  'Whiteout is a visual overlay only. Underlying content is covered from view, but this is not permanent redaction.';

export function createWhiteoutCover(bounds: Rect, options?: WhiteoutCoverOptions): ShapeObject {
  const fillColor = options?.color ?? { r: 255, g: 255, b: 255, a: 255 };
  const opacity = options?.opacity ?? 1.0;

  const shape = createShape('rectangle', bounds, {
    fill: true,
    fillColor,
    stroke: false,
    lineWidth: 0,
    opacity
  });

  shape.isWhiteout = true;
  shape.zIndex = 75; // Sits above normal page contents and drawings

  return shape;
}

export function isWhiteoutCover(obj: unknown): obj is ShapeObject & { isWhiteout: true } {
  return typeof obj === 'object' && obj !== null && (obj as ShapeObject).isWhiteout === true;
}
