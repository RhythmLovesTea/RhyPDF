import type { ColorRGBA, AnnotationObject, PathObject, PathSegment, TextRun, ImageObject } from '@rhypdf/pdf-model';
import type { StampOptions, StampPresetType } from './types';

export interface StampStyle {
  label: string;
  borderColor: ColorRGBA;
  textColor: ColorRGBA;
  backgroundColor: ColorRGBA;
}

export const STAMP_PRESETS: Record<StampPresetType, StampStyle> = {
  Approved: {
    label: 'APPROVED',
    borderColor: { r: 22, g: 163, b: 74, a: 255 },     // emerald-600
    textColor: { r: 22, g: 163, b: 74, a: 255 },
    backgroundColor: { r: 240, g: 253, b: 244, a: 200 }
  },
  Draft: {
    label: 'DRAFT',
    borderColor: { r: 100, g: 116, b: 139, a: 255 },   // slate-500
    textColor: { r: 100, g: 116, b: 139, a: 255 },
    backgroundColor: { r: 248, g: 250, b: 252, a: 200 }
  },
  Confidential: {
    label: 'CONFIDENTIAL',
    borderColor: { r: 220, g: 38, b: 38, a: 255 },     // red-600
    textColor: { r: 220, g: 38, b: 38, a: 255 },
    backgroundColor: { r: 254, g: 242, b: 242, a: 200 }
  },
  Rejected: {
    label: 'REJECTED',
    borderColor: { r: 220, g: 38, b: 38, a: 255 },
    textColor: { r: 220, g: 38, b: 38, a: 255 },
    backgroundColor: { r: 254, g: 242, b: 242, a: 200 }
  },
  Final: {
    label: 'FINAL',
    borderColor: { r: 37, g: 99, b: 235, a: 255 },     // blue-600
    textColor: { r: 37, g: 99, b: 235, a: 255 },
    backgroundColor: { r: 239, g: 246, b: 255, a: 200 }
  },
  Expired: {
    label: 'EXPIRED',
    borderColor: { r: 217, g: 119, b: 6, a: 255 },     // amber-600
    textColor: { r: 217, g: 119, b: 6, a: 255 },
    backgroundColor: { r: 255, g: 251, b: 235, a: 200 }
  },
  NotApproved: {
    label: 'NOT APPROVED',
    borderColor: { r: 220, g: 38, b: 38, a: 255 },
    textColor: { r: 220, g: 38, b: 38, a: 255 },
    backgroundColor: { r: 254, g: 242, b: 242, a: 200 }
  },
  TopSecret: {
    label: 'TOP SECRET',
    borderColor: { r: 124, g: 58, b: 237, a: 255 },    // purple-600
    textColor: { r: 124, g: 58, b: 237, a: 255 },
    backgroundColor: { r: 250, g: 245, b: 255, a: 200 }
  },
  CustomText: {
    label: 'CUSTOM',
    borderColor: { r: 15, g: 23, b: 42, a: 255 },
    textColor: { r: 15, g: 23, b: 42, a: 255 },
    backgroundColor: { r: 255, g: 255, b: 255, a: 200 }
  },
  CustomImage: {
    label: 'IMAGE',
    borderColor: { r: 0, g: 0, b: 0, a: 0 },
    textColor: { r: 0, g: 0, b: 0, a: 0 },
    backgroundColor: { r: 0, g: 0, b: 0, a: 0 }
  }
};

/**
 * Creates a Stamp annotation object.
 */
export function createStampAnnotation(options: StampOptions): AnnotationObject {
  const id = `annot-stamp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const preset = STAMP_PRESETS[options.stampType] ?? STAMP_PRESETS.Approved;
  const customColor = options.customColor ?? preset.textColor;

  return {
    id,
    type: 'annotation',
    subType: 'Stamp',
    stampType: options.stampType,
    customText: options.customText ?? preset.label,
    customColor,
    imageUri: options.imageUri,
    bounds: { ...options.bounds },
    rotation: options.rotation ?? 0,
    opacity: options.opacity ?? 0.85,
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: options.zIndex ?? 120,
    author: options.author ?? 'User',
    createdAt: new Date().toISOString()
  };
}

/**
 * Converts a Stamp annotation into page objects (vector border and text runs) for flattening.
 */
export function stampToPageObjects(annotation: AnnotationObject): (PathObject | TextRun | ImageObject)[] {
  const { left, bottom, right, top } = annotation.bounds;
  const width = right - left;
  const height = top - bottom;
  const preset = STAMP_PRESETS[(annotation.stampType as StampPresetType) ?? 'Approved'] ?? STAMP_PRESETS.Approved;
  const text = annotation.customText ?? preset.label;
  const color = annotation.customColor ?? preset.textColor;
  const opacity = annotation.opacity ?? 0.85;

  // 1. Double border rounded box
  const outerBorder: PathSegment[] = [
    { type: 'moveTo', points: [{ x: left, y: bottom }] },
    { type: 'lineTo', points: [{ x: right, y: bottom }] },
    { type: 'lineTo', points: [{ x: right, y: top }] },
    { type: 'lineTo', points: [{ x: left, y: top }] },
    { type: 'closePath', points: [] }
  ];

  const pad = 3;
  const innerBorder: PathSegment[] = [
    { type: 'moveTo', points: [{ x: left + pad, y: bottom + pad }] },
    { type: 'lineTo', points: [{ x: right - pad, y: bottom + pad }] },
    { type: 'lineTo', points: [{ x: right - pad, y: top - pad }] },
    { type: 'lineTo', points: [{ x: left + pad, y: top - pad }] },
    { type: 'closePath', points: [] }
  ];

  const borderPath: PathObject = {
    id: `${annotation.id}-border`,
    type: 'path',
    bounds: { ...annotation.bounds },
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: annotation.zIndex,
    segments: [...outerBorder, ...innerBorder],
    strokeColor: { ...color, a: Math.round(opacity * 255) },
    fillColor: { ...preset.backgroundColor, a: Math.round(opacity * 200) },
    fill: true,
    stroke: true,
    fillMode: 'winding',
    lineWidth: 2
  };

  // 2. Bold uppercase stamp text
  const fontSize = Math.min(height * 0.45, (width / (text.length * 0.65)));
  const textY = bottom + (height - fontSize) / 2 + fontSize * 0.2;
  const textX = left + (width - (text.length * fontSize * 0.55)) / 2;

  const textRun: TextRun = {
    id: `${annotation.id}-text`,
    type: 'text',
    text,
    fontName: 'Helvetica-Bold',
    fontSize,
    fillColor: { ...color, a: Math.round(opacity * 255) },
    bounds: {
      left: Math.max(left + pad, textX),
      bottom: textY - fontSize * 0.2,
      right: Math.min(right - pad, textX + text.length * fontSize * 0.55),
      top: textY + fontSize * 0.8
    },
    matrix: [1, 0, 0, 1, Math.max(left + pad, textX), textY],
    zIndex: annotation.zIndex + 1,
    isEmbeddedSubset: false
  };

  return [borderPath, textRun];
}
