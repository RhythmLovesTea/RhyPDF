/**
 * @rhypdf/text-layout
 * Shaping, bidi, line breaking, and TextLayoutEngine.
 */

import type { Rect } from '@rhypdf/pdf-model';

export type TextDirection = 'ltr' | 'rtl';

export interface ShapedGlyph {
  glyphId: number;
  cluster: number;
  xAdvance: number;
  yAdvance: number;
  xOffset: number;
  yOffset: number;
}

export interface ShapedRun {
  direction: TextDirection;
  script: string;
  glyphs: ShapedGlyph[];
  totalAdvance: number;
}

export interface LayoutGlyphPosition {
  glyphId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutLine {
  text: string;
  bounds: Rect;
  ascent: number;
  descent: number;
  glyphs: LayoutGlyphPosition[];
}

export interface LayoutResult {
  lines: LayoutLine[];
  width: number;
  height: number;
}

export interface TextLayoutOptions {
  fontSize: number;
  lineHeight?: number;
  maxWidth?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
}

export interface TextLayoutEngine {
  shape(text: string, fontData: Uint8Array, direction?: TextDirection): Promise<ShapedRun>;
  layout(text: string, options: TextLayoutOptions): Promise<LayoutResult>;
}

export { SimpleTextLayoutEngine, measureTextWidth } from './layout-engine';
