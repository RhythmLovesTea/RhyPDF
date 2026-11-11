/**
 * @rhypdf/ocr
 * Task 10.11: Region OCR.
 * Enables localized OCR on a selected rectangular region or screenshot within a digital PDF.
 */

import type { Rect } from '@rhypdf/pdf-model';
import type { OcrEngine, OcrEngineOptions, OcrPageResult } from './types';
import { createImageData } from './preprocessor';

/**
 * Crops a sub-region out of an ImageData buffer.
 */
export function cropImageData(src: ImageData, cropBox: Rect): ImageData {
  const left = Math.max(0, Math.floor(cropBox.left));
  const top = Math.max(0, Math.floor(cropBox.top));
  const right = Math.min(src.width, Math.ceil(cropBox.right));
  const bottom = Math.min(src.height, Math.ceil(cropBox.bottom));

  const cropW = Math.max(1, right - left);
  const cropH = Math.max(1, bottom - top);

  const cropped = createImageData(cropW, cropH);
  const srcData = src.data;
  const outData = cropped.data;

  for (let y = 0; y < cropH; y++) {
    const srcRowStart = ((top + y) * src.width + left) * 4;
    const outRowStart = y * cropW * 4;
    for (let x = 0; x < cropW * 4; x++) {
      outData[outRowStart + x] = srcData[srcRowStart + x]!;
    }
  }

  return cropped;
}

/**
 * Performs OCR exclusively on a designated region of a page.
 */
export async function performRegionOcr(
  engine: OcrEngine,
  pageImage: ImageData,
  regionPt: Rect,
  pageWidthPt: number,
  pageHeightPt: number,
  options?: Partial<OcrEngineOptions>
): Promise<OcrPageResult> {
  const scaleX = pageImage.width / pageWidthPt;
  const scaleY = pageImage.height / pageHeightPt;

  // Convert PDF region (points, bottom-left origin) to image coordinates (pixels, top-left origin)
  const pixelLeft = regionPt.left * scaleX;
  const pixelRight = regionPt.right * scaleX;
  const pixelTop = (pageHeightPt - regionPt.top) * scaleY;
  const pixelBottom = (pageHeightPt - regionPt.bottom) * scaleY;

  const cropRect: Rect = {
    left: Math.min(pixelLeft, pixelRight),
    top: Math.min(pixelTop, pixelBottom),
    right: Math.max(pixelLeft, pixelRight),
    bottom: Math.max(pixelTop, pixelBottom)
  };

  const croppedImage = cropImageData(pageImage, cropRect);
  const result = await engine.recognize(croppedImage, options);

  // Offset resulting block and line bounding boxes back to the full-page raster coordinate frame
  for (const block of result.blocks) {
    block.bbox = {
      left: block.bbox.left + cropRect.left,
      top: block.bbox.top + cropRect.top,
      right: block.bbox.right + cropRect.left,
      bottom: block.bbox.bottom + cropRect.top
    };

    for (const line of block.lines) {
      line.bbox = {
        left: line.bbox.left + cropRect.left,
        top: line.bbox.top + cropRect.top,
        right: line.bbox.right + cropRect.left,
        bottom: line.bbox.bottom + cropRect.top
      };

      for (const word of line.words) {
        word.bbox = {
          left: word.bbox.left + cropRect.left,
          top: word.bbox.top + cropRect.top,
          right: word.bbox.right + cropRect.left,
          bottom: word.bbox.bottom + cropRect.top
        };
      }
    }
  }

  return {
    ...result,
    imageWidth: pageImage.width,
    imageHeight: pageImage.height,
    pageWidthPt,
    pageHeightPt
  };
}
