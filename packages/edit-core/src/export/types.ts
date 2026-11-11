export interface ExportOptions {
  /**
   * Target image quality (0.1 to 1.0)
   * @default 0.85
   */
  imageQuality?: number;

  /**
   * Flatten annotations (highlights, sticky notes, stamps) into static page content.
   * @default false
   */
  flattenAnnotations?: boolean;

  /**
   * Flatten interactive form fields (AcroForms) into static text and vector checkmarks.
   * @default false
   */
  flattenForms?: boolean;

  /**
   * Font embedding mode
   * @default 'subset'
   */
  embedFonts?: 'subset' | 'full' | 'standard';

  /**
   * Compress indirect objects into Object Streams (PDF 1.5+) for smaller file size.
   * @default true
   */
  optimizeSize?: boolean;

  /**
   * PDF version standard header
   * @default '1.7'
   */
  pdfVersion?: '1.4' | '1.5' | '1.6' | '1.7' | '2.0';
}

export interface CompressPdfOptions {
  /**
   * Preset compression level or custom quality factor
   */
  quality?: 'low' | 'medium' | 'high' | number;

  /**
   * Remove unnecessary metadata (XMP, producer info)
   * @default true
   */
  removeMetadata?: boolean;

  /**
   * Use object streams (PDF 1.5+) to compress indirect objects
   * @default true
   */
  useObjectStreams?: boolean;
}

export interface CompressResult {
  bytes: Uint8Array;
  originalSize: number;
  compressedSize: number;
  savingsRatio: number;
  savingsPercent: number;
}

export interface PdfValidationResult {
  valid: boolean;
  pageCount: number;
  error?: string;
  firstPageRenderable?: boolean;
}

export interface VersionRecord {
  id: string;
  docId: string;
  versionNumber: number;
  timestamp: number;
  sizeBytes: number;
  filename: string;
  description?: string;
}

export interface PrintOptions {
  /**
   * Page range to print: 'all', or comma-separated ranges e.g. '1-3, 5'
   * @default 'all'
   */
  pageRange?: string;

  /**
   * Number of copies
   * @default 1
   */
  copies?: number;
}
