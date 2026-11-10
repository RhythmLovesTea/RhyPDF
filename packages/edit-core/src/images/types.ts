import type { Rect } from '@rhypdf/pdf-model';

export interface ImageAdjustments {
  opacity: number; // 0 to 100
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  grayscale: boolean;
}

export type CropPreset = 'free' | '1:1' | '4:3' | '16:9';

export type ReplaceFitMode = 'fit' | 'fill' | 'stretch';

export type CompressionQuality = 'original' | 'high' | 'medium' | 'low';

export interface EffectiveDpiResult {
  dpiX: number;
  dpiY: number;
  minDpi: number;
  isLowRes: boolean; // < 150 DPI
}

export interface ImageCropData {
  cropBox: Rect; // relative to image bounds in PDF points
  preset: CropPreset;
}

export interface ExtractedImageResult {
  blob: Blob;
  format: 'png' | 'jpeg';
  width: number;
  height: number;
}
