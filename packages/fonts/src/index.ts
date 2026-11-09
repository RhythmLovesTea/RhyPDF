/**
 * @rhypdf/fonts
 * Font catalog, font loader interfaces, and standard font descriptors.
 */

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
export type FontStyle = 'normal' | 'italic' | 'oblique';

export interface FontDescriptor {
  family: string;
  weight: FontWeight;
  style: FontStyle;
  postScriptName?: string;
  isCustom?: boolean;
}

export interface FontCatalogEntry {
  id: string;
  displayName: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'handwriting';
  weights: FontWeight[];
  styles: FontStyle[];
  hasSubsets: boolean;
  scriptsSupported: string[];
}

export const STANDARD_PDF_FONTS = [
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
  'Courier',
  'Courier-Bold',
  'Courier-Oblique',
  'Courier-BoldOblique',
  'Symbol',
  'ZapfDingbats'
] as const;

export type StandardPdfFont = (typeof STANDARD_PDF_FONTS)[number];

export interface FontLoader {
  loadFont(descriptor: FontDescriptor): Promise<Uint8Array>;
  matchFont(name: string): FontDescriptor;
}
