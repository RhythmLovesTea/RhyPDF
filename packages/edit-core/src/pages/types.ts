import type { Rect, BookmarkItem } from '@rhypdf/pdf-model';

export type PageSizePreset = 'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'A3' | 'A5' | 'Custom';
export type PageOrientation = 'portrait' | 'landscape';

export interface PageDimension {
  width: number;
  height: number;
}

export const PAGE_SIZE_PRESETS: Record<Exclude<PageSizePreset, 'Custom'>, PageDimension> = {
  A4: { width: 595.28, height: 841.89 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
  Tabloid: { width: 792, height: 1224 },
  A3: { width: 841.89, height: 1190.55 },
  A5: { width: 419.53, height: 595.28 }
};

export interface PageCropParams {
  pageIndex: number;
  cropBox: Rect;
}

export interface PageResizeParams {
  pageIndex: number;
  width: number;
  height: number;
  scaleContent?: boolean;
}

export interface InsertBlankPageParams {
  sizePreset: PageSizePreset;
  customWidth?: number;
  customHeight?: number;
  orientation: PageOrientation;
  targetIndex: number;
}

export interface InsertPagesFromPdfParams {
  sourcePdfBytes: Uint8Array;
  pageRange?: string;
  targetIndex: number;
}

export interface MergePdfItem {
  id: string;
  name: string;
  bytes: Uint8Array;
  pageCount?: number;
}

export type SplitPdfMode = 'ranges' | 'everyN' | 'selection' | 'bookmarks';

export interface SplitPdfOptions {
  mode: SplitPdfMode;
  ranges?: string;
  everyN?: number;
  selectedPages?: number[];
  bookmarks?: BookmarkItem[];
}

export interface SplitResultFile {
  filename: string;
  bytes: Uint8Array;
  pageCount: number;
}

export interface ImagesToPdfItem {
  name: string;
  data: Uint8Array;
  format: 'png' | 'jpeg';
}

export interface ImagesToPdfOptions {
  images: ImagesToPdfItem[];
  pageSize?: PageSizePreset;
  customWidth?: number;
  customHeight?: number;
  orientation?: PageOrientation;
  margin?: number;
}

export interface PdfToImagesOptions {
  pages?: number[];
  format: 'png' | 'jpeg' | 'webp';
  dpi: 72 | 150 | 300;
}

export type { BookmarkItem };
