import type { AnnotationObject, PageObject } from '@rhypdf/pdf-model';
import { markupToVectorPaths } from './markup';
import { stickyNoteToPageObjects } from './sticky-notes';
import { stampToPageObjects } from './stamps';

/**
 * Flattens an array of AnnotationObjects into permanent static PageObjects (PathObjects, TextRuns, ImageObjects).
 */
export function flattenAnnotations(annotations: AnnotationObject[]): PageObject[] {
  const result: PageObject[] = [];

  for (const annot of annotations) {
    switch (annot.subType) {
      case 'Highlight':
      case 'Underline':
      case 'StrikeOut':
      case 'Squiggly':
        result.push(...markupToVectorPaths(annot));
        break;

      case 'Text':
        result.push(...stickyNoteToPageObjects(annot));
        break;

      case 'Stamp':
        result.push(...stampToPageObjects(annot));
        break;

      case 'Signature': {
        // If signature has vector representation or text, convert to text or image
        if (annot.signatureType === 'type' && annot.signerName) {
          result.push({
            id: `${annot.id}-text`,
            type: 'text',
            text: annot.signerName,
            fontName: 'Helvetica',
            fontSize: Math.min((annot.bounds.top - annot.bounds.bottom) * 0.6, 24),
            fillColor: annot.color ?? { r: 15, g: 23, b: 42, a: 255 },
            bounds: { ...annot.bounds },
            matrix: [1, 0, 0, 1, annot.bounds.left, annot.bounds.bottom + 5],
            zIndex: annot.zIndex,
            isEmbeddedSubset: false
          });
        }
        break;
      }

      default:
        // Default fallback: convert any bounding box to a subtle vector path
        break;
    }
  }

  return result;
}
