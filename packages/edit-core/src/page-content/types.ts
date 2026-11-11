/**
 * @rhypdf/edit-core
 * Tasks 11.8 - 11.11: Page content types (Headers/Footers, Bates, Watermark, Background).
 */

import type { ColorRGBA } from '@rhypdf/pdf-model';

export type PageRangeMode = 'all' | 'firstPageOnly' | 'range' | 'excludeFirstPage';

export interface HeaderFooterSection {
  leftText?: string;
  centerText?: string;
  rightText?: string;
}

export interface HeaderFooterConfig {
  header?: HeaderFooterSection;
  footer?: HeaderFooterSection;
  fontName?: string;
  fontSize?: number;
  color?: ColorRGBA;
  pageRangeMode?: PageRangeMode;
  customPageRange?: string; // e.g. "1-5, 8"
  firstPageDifferent?: boolean;
  firstPageHeader?: HeaderFooterSection;
  firstPageFooter?: HeaderFooterSection;
  margin?: number;
}

export type BatesPosition =
  'topLeft' | 'topCenter' | 'topRight' | 'bottomLeft' | 'bottomCenter' | 'bottomRight';

export interface BatesNumberingConfig {
  prefix?: string;
  suffix?: string;
  startNumber?: number;
  numDigits?: number;
  position?: BatesPosition;
  fontName?: string;
  fontSize?: number;
  color?: ColorRGBA;
  pageRangeMode?: PageRangeMode;
  customPageRange?: string;
  margin?: number;
}

export interface WatermarkConfig {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  fontName?: string;
  fontSize?: number;
  color?: ColorRGBA;
  opacity?: number;
  rotation?: number; // degrees (e.g. 45)
  tile?: boolean; // center vs tile across page
  pageRangeMode?: PageRangeMode;
  customPageRange?: string;
}

export interface PageBackgroundConfig {
  color: ColorRGBA;
  pageRangeMode?: PageRangeMode;
  customPageRange?: string;
}
