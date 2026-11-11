import type {
  Rect,
  ColorRGBA,
  AnnotationObject,
  PathObject,
  PathSegment,
  TextRun
} from '@rhypdf/pdf-model';
import type { StickyNoteOptions } from './types';

export const DEFAULT_STICKY_NOTE_COLOR: ColorRGBA = {
  r: 253,
  g: 224,
  b: 71,
  a: 255 // yellow
};

export const STICKY_NOTE_SIZE = 24; // 24x24 pt icon

/**
 * Creates a sticky note / comment annotation object.
 */
export function createStickyNote(options: StickyNoteOptions): AnnotationObject {
  const id = `annot-note-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const bounds: Rect = {
    left: options.position.x,
    bottom: options.position.y,
    right: options.position.x + STICKY_NOTE_SIZE,
    top: options.position.y + STICKY_NOTE_SIZE
  };

  return {
    id,
    type: 'annotation',
    subType: 'Text',
    icon: options.icon ?? 'Comment',
    bounds,
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: options.zIndex ?? 150,
    contents: options.contents,
    author: options.author ?? 'User',
    createdAt: new Date().toISOString(),
    color: options.color ?? DEFAULT_STICKY_NOTE_COLOR,
    isOpen: false
  };
}

/**
 * Converts a sticky note annotation into page objects (yellow chat icon vector) for flattening.
 */
export function stickyNoteToPageObjects(annotation: AnnotationObject): (PathObject | TextRun)[] {
  const { left, bottom, right, top } = annotation.bounds;
  const width = right - left;
  const color = annotation.color ?? DEFAULT_STICKY_NOTE_COLOR;

  // Yellow speech bubble icon with tail
  const segments: PathSegment[] = [
    { type: 'moveTo', points: [{ x: left, y: bottom + 4 }] },
    { type: 'lineTo', points: [{ x: left, y: top }] },
    { type: 'lineTo', points: [{ x: right, y: top }] },
    { type: 'lineTo', points: [{ x: right, y: bottom + 6 }] },
    { type: 'lineTo', points: [{ x: left + width * 0.6, y: bottom + 6 }] },
    { type: 'lineTo', points: [{ x: left + width * 0.3, y: bottom }] }, // bubble pointer
    { type: 'lineTo', points: [{ x: left + width * 0.4, y: bottom + 6 }] },
    { type: 'closePath', points: [] }
  ];

  const bubblePath: PathObject = {
    id: `${annotation.id}-bubble`,
    type: 'path',
    bounds: { ...annotation.bounds },
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: annotation.zIndex,
    segments,
    fillColor: color,
    strokeColor: { r: 161, g: 98, b: 7, a: 255 }, // amber border
    lineWidth: 1.5,
    fill: true,
    stroke: true,
    fillMode: 'winding'
  };

  return [bubblePath];
}
