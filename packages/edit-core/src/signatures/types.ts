import type { Rect, ColorRGBA } from '@rhypdf/pdf-model';

export type SignatureMode = 'draw' | 'type' | 'upload';

export interface StoredSignatureRecord {
  id: string;
  label: string;
  mode: SignatureMode;
  data: string; // SVG path data, text string, or base64 data URL
  fontFamily?: string;
  createdAt: string;
  isEncrypted: boolean;
  ciphertext?: string;
  iv?: string;
  salt?: string;
}

export interface SignatureInsertOptions {
  mode: SignatureMode;
  data: string; // SVG path, typed name, or image data URL
  fontFamily?: string;
  bounds: Rect;
  color?: ColorRGBA;
  author?: string;
  zIndex?: number;
  rotation?: number;
}
