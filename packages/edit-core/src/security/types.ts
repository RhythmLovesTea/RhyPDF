import type { Rect, ColorRGBA } from '@rhypdf/pdf-model';

export interface PdfSecurityOptions {
  userPassword?: string;
  ownerPassword?: string;
  /**
   * PDF standard permissions bitmask
   * e.g. AllowPrint = 4, AllowCopy = 16, AllowModify = 8, AllowAnnot = 32
   */
  permissions?: number;
}

export const PDF_PERMISSIONS = {
  PRINT: 4,
  MODIFY: 8,
  COPY: 16,
  ANNOT_FORMS: 32,
  FILL_FORMS: 256,
  EXTRACT_ACCESS: 512,
  ASSEMBLE: 1024,
  PRINT_HIGH_QUALITY: 2048,
  ALL_ALLOWED: -1
} as const;

export interface RedactionArea {
  id: string;
  pageIndex: number;
  bounds: Rect;
  fillColor?: ColorRGBA;
  overlayText?: string;
  textColor?: ColorRGBA;
}

export interface RedactionResult {
  bytes: Uint8Array;
  removedTextRunCount: number;
  removedImageCount: number;
  redactedAreasCount: number;
}

export interface PdfMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface LinkSafetyCheck {
  isSafe: boolean;
  protocol?: string;
  requiresConfirmation: boolean;
  reason?: string;
  sanitizedUrl?: string;
}
