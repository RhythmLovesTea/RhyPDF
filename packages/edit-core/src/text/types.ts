import type { Rect, ColorRGBA, TextRun } from '@rhypdf/pdf-model';

export interface TextBlockSpan {
  text: string;
  bounds: Rect;
  fontName: string;
  fontSize: number;
  color: ColorRGBA;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  originalRunId?: string;
}

export interface TextBlockLine {
  id: string;
  text: string;
  bounds: Rect;
  baseline: number;
  spans: TextBlockSpan[];
}

export interface FontReusabilityInfo {
  canReuseFont: boolean;
  isSubset: boolean;
  isEmbedded: boolean;
  fontName: string;
  missingGlyphs: string[];
  recommendedFallback: string;
}

export interface TextBlock {
  id: string;
  pageIndex: number;
  bounds: Rect;
  lines: TextBlockLine[];
  runs: TextRun[];
  rotation: number;
  writingMode: 'horizontal-tb' | 'vertical-rl';
  alignment: 'left' | 'center' | 'right' | 'justify';
  primaryFont: string;
  primaryFontSize: number;
  primaryColor: ColorRGBA;
  fontReusability: FontReusabilityInfo;
  isHeader?: boolean;
  isFooter?: boolean;
  isListItem?: boolean;
  isTableCell?: boolean;
}

export interface GroupingOptions {
  baselineTolerance?: number;
  lineSpacingFactor?: number;
  columnGapThreshold?: number;
  pageHeight?: number;
}

export interface FindReplaceOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export interface FindReplaceMatch {
  id: string;
  pageIndex: number;
  blockId: string;
  lineIndex: number;
  matchStart: number;
  matchEnd: number;
  matchedText: string;
  context: string;
}
