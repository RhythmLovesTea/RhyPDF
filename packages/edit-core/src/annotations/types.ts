import type { ColorRGBA, Rect } from '@rhypdf/pdf-model';

export type TextMarkupType = 'Highlight' | 'Underline' | 'StrikeOut' | 'Squiggly';

export interface MarkupAnnotationOptions {
  subType: TextMarkupType;
  bounds: Rect;
  quadPoints?: number[];
  color?: ColorRGBA;
  opacity?: number;
  author?: string;
  contents?: string;
  text?: string;
  zIndex?: number;
}

export type StickyNoteIcon =
  'Comment' | 'Key' | 'Note' | 'Help' | 'NewParagraph' | 'Paragraph' | 'Insert';

export interface StickyNoteOptions {
  position: { x: number; y: number };
  contents: string;
  author?: string;
  color?: ColorRGBA;
  icon?: StickyNoteIcon;
  zIndex?: number;
}

export type StampPresetType =
  | 'Approved'
  | 'Draft'
  | 'Confidential'
  | 'Rejected'
  | 'Final'
  | 'Expired'
  | 'NotApproved'
  | 'TopSecret'
  | 'CustomText'
  | 'CustomImage';

export interface StampOptions {
  stampType: StampPresetType;
  bounds: Rect;
  customText?: string;
  customColor?: ColorRGBA;
  imageUri?: string;
  rotation?: number;
  opacity?: number;
  author?: string;
  zIndex?: number;
}

export type AnnotationSummaryFormat = 'markdown' | 'text' | 'json';

export interface AnnotationSummaryItem {
  id: string;
  pageIndex: number;
  type: string;
  author: string;
  createdAt: string;
  contents?: string;
  highlightedText?: string;
  rect: Rect;
}

export interface AnnotationSummaryReport {
  totalAnnotations: number;
  byType: Record<string, number>;
  pagesWithAnnotations: number[];
  content: string;
  items: AnnotationSummaryItem[];
}
