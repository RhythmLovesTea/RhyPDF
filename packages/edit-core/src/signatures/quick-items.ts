import type { Rect, ColorRGBA, AnnotationObject } from '@rhypdf/pdf-model';

export const DEFAULT_SIGNATURE_COLOR: ColorRGBA = {
  r: 15,
  g: 23,
  b: 42,
  a: 255
};

/**
 * Creates an Initials quick-insert annotation object.
 */
export function createInitialsAnnotation(
  initials: string,
  position: { x: number; y: number },
  author: string = 'User',
  color: ColorRGBA = DEFAULT_SIGNATURE_COLOR
): AnnotationObject {
  const id = `annot-initials-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const width = Math.max(initials.length * 20, 50);
  const height = 30;

  const bounds: Rect = {
    left: position.x,
    bottom: position.y,
    right: position.x + width,
    top: position.y + height
  };

  return {
    id,
    type: 'annotation',
    subType: 'Signature',
    signatureType: 'type',
    signerName: initials.toUpperCase(),
    bounds,
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: 110,
    color,
    author,
    createdAt: new Date().toISOString()
  };
}

/**
 * Creates a Date quick-insert stamp annotation object.
 */
export function createDateStampAnnotation(
  dateText: string,
  position: { x: number; y: number },
  author: string = 'User',
  color: ColorRGBA = DEFAULT_SIGNATURE_COLOR
): AnnotationObject {
  const id = `annot-date-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const width = Math.max(dateText.length * 8.5, 90);
  const height = 24;

  const bounds: Rect = {
    left: position.x,
    bottom: position.y,
    right: position.x + width,
    top: position.y + height
  };

  return {
    id,
    type: 'annotation',
    subType: 'Stamp',
    stampType: 'CustomText',
    customText: dateText,
    customColor: color,
    bounds,
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: 110,
    author,
    createdAt: new Date().toISOString()
  };
}
