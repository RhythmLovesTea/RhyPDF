/**
 * @rhypdf/text-layout
 * Multi-language text layout, HarfBuzz text shaping, UAX #9 bidi,
 * script engines (Arabic, Hebrew, Indic, Thai, CJK, Emoji), and PDF CIDFont ToUnicode generators.
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
  text?: string;
}

export interface ShapedRun {
  direction: TextDirection;
  script: string;
  language?: string;
  glyphs: ShapedGlyph[];
  totalAdvance: number;
  unitsPerEm?: number;
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
  shape(text: string, fontData?: Uint8Array, direction?: TextDirection): Promise<ShapedRun>;
  layout(text: string, options: TextLayoutOptions): Promise<LayoutResult>;
}

// Layout and Shaper Engines
export { SimpleTextLayoutEngine, measureTextWidth } from './layout-engine';
export { TextShaper, type ShaperOptions } from './shaper';

// UAX #9 Bidi Engine (Task 9.2)
export {
  BidiEngine,
  determineBaseDirection,
  classifyBidiType,
  BIDI_MIRRORED_PAIRS,
  type Direction,
  type BidiType,
  type BidiRun,
  type BidiResult
} from './bidi';

// Arabic Script Engine (Task 9.3)
export {
  ArabicEngine,
  getArabicJoiningType,
  isArabicTashkeel,
  type ArabicJoiningType,
  type ArabicForm,
  type ArabicShapedChar
} from './arabic';

// Hebrew Script Engine (Task 9.4)
export {
  HebrewEngine,
  isHebrewNiqqud,
  isHebrewCantillation,
  isHebrewCombiningMark,
  type HebrewCluster
} from './hebrew';

// Indic Scripts Engine (Task 9.5)
export {
  IndicEngine,
  isIndicCodePoint,
  isIndicVirama,
  isPreBaseMatra,
  isIndicMatra,
  isIndicModifier,
  type IndicScript,
  type IndicAkshara
} from './indic';

// Thai Script Engine (Task 9.6)
export {
  ThaiEngine,
  classifyThaiChar,
  isThaiCodePoint,
  type ThaiCharType,
  type ThaiWord,
  type ThaiGrapheme
} from './thai';

// CJK Layout & Kinsoku Engine (Task 9.7)
export {
  CjkEngine,
  isCjkCodePoint,
  isProhibitedLineStart,
  isProhibitedLineEnd,
  KINSOKU_LINE_START_PROHIBITED,
  KINSOKU_LINE_END_PROHIBITED,
  type CjkWritingMode,
  type CjkLineWrapResult
} from './cjk';

// Emoji Engine (Task 9.8)
export { EmojiEngine, isEmojiCodePoint, isSkinToneModifier, type EmojiSequence } from './emoji';

// PDF CIDFont & /ToUnicode CMap Generator (Task 9.9)
export { CidToUnicodeGenerator, type CidMapping, type CidFontDetails } from './pdf-cid';
