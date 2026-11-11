/**
 * @rhypdf/ocr
 * Task 10.7 (Mode A): Searchable Invisible Text Layer.
 * Places PDF text runs with renderMode = 3 (invisible text) aligned with the scanned image.
 */

import type { TextRun } from '@rhypdf/pdf-model';
import type { OcrPageResult } from './types';
import { convertOcrToTextRuns } from './block-converter';

/**
 * Creates an invisible text layer (PDF renderMode = 3) from OCR output.
 * When placed over/under the scanned background image, the text is completely transparent
 * but fully selectable, searchable, and copyable in external PDF viewers.
 */
export function createSearchableInvisibleLayer(
  result: OcrPageResult,
  pageWidthPt: number,
  pageHeightPt: number
): TextRun[] {
  // renderMode 'invisible': Neither fill nor stroke text (invisible text layer)
  return convertOcrToTextRuns(result, pageWidthPt, pageHeightPt, 'invisible');
}
