import type { AnnotationObject } from '@rhypdf/pdf-model';
import type { AcroFormField, FormFieldType } from './types';

export const XFA_UNSUPPORTED_MESSAGE =
  'XFA forms are not supported. This document contains dynamic XML forms (XFA) which require Adobe Acrobat.';

/**
 * Detects whether a PDF document contains dynamic XFA (XML Forms Architecture) data.
 * Checks for /XFA in AcroForm dictionaries or XML form stream headers.
 */
export function detectXfaForm(documentSource: Uint8Array | string): {
  hasXfa: boolean;
  warning?: string;
} {
  let text = '';
  if (typeof documentSource === 'string') {
    text = documentSource;
  } else {
    // Check first 1MB or full file if smaller
    const slice = documentSource.subarray(0, Math.min(documentSource.length, 1024 * 1024));
    const dec = new TextDecoder('latin1');
    text = dec.decode(slice);
  }

  // Look for /XFA key inside PDF dictionary, e.g. /AcroForm << ... /XFA [ ... ] >>
  // or /XFA 12 0 R
  const xfaPattern = /\/XFA\s+(\d+\s+\d+\s+R|\[|<)/i;
  const isXfa = xfaPattern.test(text);

  if (isXfa) {
    return {
      hasXfa: true,
      warning: XFA_UNSUPPORTED_MESSAGE
    };
  }

  return { hasXfa: false };
}

/**
 * Converts page AnnotationObjects of subtype 'Widget' (or with field properties) into AcroFormField representations.
 */
export function detectFormFieldsFromAnnotations(
  annotations: AnnotationObject[],
  pageIndex: number
): AcroFormField[] {
  const fields: AcroFormField[] = [];

  for (let i = 0; i < annotations.length; i++) {
    const annot = annotations[i]!;
    if (annot.subType === 'Widget' || annot.fieldType) {
      const fieldType = (annot.fieldType as FormFieldType) ?? 'text';
      const name = annot.fieldName ?? `field_${pageIndex}_${i}`;
      const value = annot.fieldValue ?? (fieldType === 'checkbox' ? false : '');

      fields.push({
        id: annot.id,
        pageIndex,
        bounds: { ...annot.bounds },
        type: fieldType,
        name,
        value,
        defaultValue: annot.defaultValue,
        readOnly: annot.readOnly ?? false,
        required: annot.required ?? false,
        options: annot.options,
        tabOrder: annot.tabOrder ?? i + 1,
        groupName: fieldType === 'radio' ? name : undefined
      });
    }
  }

  // Sort by tabOrder or vertical reading order (top to bottom, left to right)
  return fields.sort((a, b) => {
    if (a.tabOrder !== undefined && b.tabOrder !== undefined) {
      return a.tabOrder - b.tabOrder;
    }
    // PDF Y coordinates: higher Y is closer to the top of page
    if (Math.abs(b.bounds.top - a.bounds.top) > 5) {
      return b.bounds.top - a.bounds.top;
    }
    return a.bounds.left - b.bounds.left;
  });
}
