/**
 * @rhypdf/ocr
 * Task 10.1: Scanned page detection.
 * Inspects page objects to determine whether a page is a scanned document (full-page image with little/no text).
 */

import type { PageObject, TextRun, ImageObject, FormObject } from '@rhypdf/pdf-model';
import type { ScannedPageDetectionResult } from './types';

/**
 * Traverses page objects recursively (handling Form XObjects) to collect all text runs and images.
 */
function flattenPageObjects(objects: PageObject[]): { textRuns: TextRun[]; images: ImageObject[] } {
  const textRuns: TextRun[] = [];
  const images: ImageObject[] = [];

  for (const obj of objects) {
    if (obj.type === 'text') {
      textRuns.push(obj as TextRun);
    } else if (obj.type === 'image') {
      images.push(obj as ImageObject);
    } else if (obj.type === 'form') {
      const form = obj as FormObject;
      if (form.subObjects && form.subObjects.length > 0) {
        const nested = flattenPageObjects(form.subObjects);
        textRuns.push(...nested.textRuns);
        images.push(...nested.images);
      }
    }
  }

  return { textRuns, images };
}

/**
 * Detects whether a page is likely a scanned document.
 *
 * @param pageObjects Objects on the page
 * @param pageWidth Page width in PDF points
 * @param pageHeight Page height in PDF points
 */
export function detectScannedPage(
  pageObjects: PageObject[],
  pageWidth: number,
  pageHeight: number
): ScannedPageDetectionResult {
  const { textRuns, images } = flattenPageObjects(pageObjects);
  const pageArea = Math.max(1, pageWidth * pageHeight);

  let totalImageArea = 0;
  let primaryImage: ImageObject | undefined;
  let maxImageArea = 0;

  for (const img of images) {
    const width = Math.abs(img.bounds.right - img.bounds.left);
    const height = Math.abs(img.bounds.top - img.bounds.bottom);
    const area = width * height;
    totalImageArea += area;

    if (area > maxImageArea) {
      maxImageArea = area;
      primaryImage = img;
    }
  }

  const imageAreaRatio = Math.min(1.0, totalImageArea / pageArea);
  const textRunCount = textRuns.length;
  let totalTextChars = 0;

  for (const run of textRuns) {
    totalTextChars += (run.text || '').trim().length;
  }

  // Detection heuristics
  let isScanned: boolean;
  let confidence: number;
  let reason: string;

  if (images.length === 0) {
    isScanned = false;
    confidence = 0.0;
    reason = 'No raster images present on page; digital vector or text document.';
  } else if (imageAreaRatio >= 0.7 && totalTextChars < 25) {
    isScanned = true;
    confidence = totalTextChars === 0 ? 0.98 : 0.92;
    reason = `Full-page image covers ${(imageAreaRatio * 100).toFixed(1)}% of page with only ${totalTextChars} text characters.`;
  } else if (imageAreaRatio >= 0.5 && totalTextChars === 0) {
    isScanned = true;
    confidence = 0.9;
    reason = `Page contains image covering ${(imageAreaRatio * 100).toFixed(1)}% of page area with zero text runs.`;
  } else if (imageAreaRatio >= 0.7 && totalTextChars < 60 && textRunCount <= 3) {
    isScanned = true;
    confidence = 0.82;
    reason = `Dominant image with sparse metadata/header text (${totalTextChars} chars in ${textRunCount} runs).`;
  } else if (totalTextChars > 150) {
    isScanned = false;
    confidence = 0.05;
    reason = `Substantial digital text found (${totalTextChars} characters across ${textRunCount} runs).`;
  } else {
    isScanned = false;
    confidence = 0.25;
    reason = `Mixed document: ${(imageAreaRatio * 100).toFixed(1)}% image area with ${totalTextChars} text characters.`;
  }

  return {
    isScanned,
    confidence,
    imageAreaRatio,
    textRunCount,
    totalTextChars,
    reason,
    primaryImageId: primaryImage?.id
  };
}
