import type { PageObject, TextRun, PathObject, PathSegment } from '@rhypdf/pdf-model';
import type { AcroFormField } from './types';

/**
 * Flattens form fields into static PageObjects (TextRuns, checkmark PathObjects) for permanent export.
 */
export function flattenFormFields(fields: AcroFormField[]): PageObject[] {
  const objects: PageObject[] = [];

  for (const field of fields) {
    const { left, bottom, right, top } = field.bounds;
    const width = right - left;
    const height = top - bottom;

    if (field.type === 'checkbox') {
      const isChecked = field.value === true || field.value === 'Yes' || field.value === 'true';
      if (isChecked) {
        // Draw checkmark vector path inside checkbox bounds
        const padX = width * 0.2;
        const padY = height * 0.2;
        const p1 = { x: left + padX, y: bottom + height * 0.5 };
        const p2 = { x: left + width * 0.45, y: bottom + padY };
        const p3 = { x: right - padX, y: top - padY };

        const segments: PathSegment[] = [
          { type: 'moveTo', points: [p1] },
          { type: 'lineTo', points: [p2] },
          { type: 'lineTo', points: [p3] }
        ];

        const checkPath: PathObject = {
          id: `${field.id}-flattened-check`,
          type: 'path',
          bounds: { ...field.bounds },
          matrix: [1, 0, 0, 1, 0, 0],
          zIndex: 90,
          segments,
          strokeColor: { r: 15, g: 23, b: 42, a: 255 },
          lineWidth: 2,
          stroke: true,
          fill: false
        };
        objects.push(checkPath);
      }
    } else if (field.type === 'radio') {
      const isSelected = field.value === true || field.value === field.exportValue;
      if (isSelected) {
        // Draw filled inner circle
        const centerX = (left + right) / 2;
        const centerY = (bottom + top) / 2;
        const r = Math.min(width, height) * 0.25;

        // Approximate circle with 4 bezier segments (k = 0.55228475)
        const k = 0.55228475 * r;
        const segments: PathSegment[] = [
          { type: 'moveTo', points: [{ x: centerX, y: centerY + r }] },
          {
            type: 'bezierCurveTo',
            points: [
              { x: centerX + k, y: centerY + r },
              { x: centerX + r, y: centerY + k },
              { x: centerX + r, y: centerY }
            ]
          },
          {
            type: 'bezierCurveTo',
            points: [
              { x: centerX + r, y: centerY - k },
              { x: centerX + k, y: centerY - r },
              { x: centerX, y: centerY - r }
            ]
          },
          {
            type: 'bezierCurveTo',
            points: [
              { x: centerX - k, y: centerY - r },
              { x: centerX - r, y: centerY - k },
              { x: centerX - r, y: centerY }
            ]
          },
          {
            type: 'bezierCurveTo',
            points: [
              { x: centerX - r, y: centerY + k },
              { x: centerX - k, y: centerY + r },
              { x: centerX, y: centerY + r }
            ]
          },
          { type: 'closePath', points: [] }
        ];

        const radioDot: PathObject = {
          id: `${field.id}-flattened-radio`,
          type: 'path',
          bounds: { left: centerX - r, bottom: centerY - r, right: centerX + r, top: centerY + r },
          matrix: [1, 0, 0, 1, 0, 0],
          zIndex: 90,
          segments,
          fillColor: { r: 15, g: 23, b: 42, a: 255 },
          fill: true,
          fillMode: 'winding',
          lineWidth: 0,
          stroke: false
        };
        objects.push(radioDot);
      }
    } else {
      // Text field, dropdown, list
      const textVal = Array.isArray(field.value)
        ? field.value.join(', ')
        : String(field.value || '');
      if (textVal.trim()) {
        const fontSize = Math.min(height * 0.7, 12);
        const baselineY = bottom + (height - fontSize) / 2 + fontSize * 0.2;
        const textRun: TextRun = {
          id: `${field.id}-flattened-text`,
          type: 'text',
          text: textVal,
          fontName: 'Helvetica',
          fontSize,
          fillColor: { r: 15, g: 23, b: 42, a: 255 },
          bounds: {
            left: left + 2,
            bottom: baselineY - fontSize * 0.2,
            right: Math.min(right - 2, left + textVal.length * fontSize * 0.6),
            top: baselineY + fontSize * 0.8
          },
          matrix: [1, 0, 0, 1, left + 2, baselineY],
          zIndex: 90,
          isEmbeddedSubset: false
        };
        objects.push(textRun);
      }
    }
  }

  return objects;
}
