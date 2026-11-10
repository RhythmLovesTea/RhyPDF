/**
 * Blank PDF Generator
 * Generates valid, spec-compliant PDF 1.4 binary data without external dependencies.
 */

export type PageSizePreset = 'A4' | 'Letter' | 'Legal' | 'Custom';
export type PageOrientation = 'portrait' | 'landscape';
export type MeasurementUnit = 'pt' | 'mm' | 'in' | 'px';

export interface BlankPdfOptions {
  pageSize?: PageSizePreset;
  orientation?: PageOrientation;
  pageCount?: number;
  customWidth?: number;
  customHeight?: number;
  unit?: MeasurementUnit;
}

const PRESET_DIMENSIONS: Record<
  Exclude<PageSizePreset, 'Custom'>,
  { width: number; height: number }
> = {
  A4: { width: 595.28, height: 841.89 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 }
};

export function convertToPoints(value: number, unit: MeasurementUnit = 'pt'): number {
  switch (unit) {
    case 'mm':
      return (value * 72) / 25.4;
    case 'in':
      return value * 72;
    case 'px':
      return (value * 72) / 96;
    case 'pt':
    default:
      return value;
  }
}

export function convertFromPoints(points: number, unit: MeasurementUnit = 'pt'): number {
  switch (unit) {
    case 'mm':
      return (points * 25.4) / 72;
    case 'in':
      return points / 72;
    case 'px':
      return (points * 96) / 72;
    case 'pt':
    default:
      return points;
  }
}

/**
 * Calculates page dimensions in points respecting preset, custom values, and orientation.
 */
export function getPageDimensions(options: BlankPdfOptions = {}): {
  width: number;
  height: number;
} {
  const {
    pageSize = 'A4',
    orientation = 'portrait',
    customWidth = 595.28,
    customHeight = 841.89,
    unit = 'pt'
  } = options;

  let baseWidth: number;
  let baseHeight: number;

  if (pageSize === 'Custom') {
    baseWidth = convertToPoints(customWidth, unit);
    baseHeight = convertToPoints(customHeight, unit);
  } else {
    const preset = PRESET_DIMENSIONS[pageSize] ?? PRESET_DIMENSIONS.A4;
    baseWidth = preset.width;
    baseHeight = preset.height;
  }

  // Ensure width <= height for portrait, and width >= height for landscape
  const minDim = Math.min(baseWidth, baseHeight);
  const maxDim = Math.max(baseWidth, baseHeight);

  if (orientation === 'landscape') {
    return { width: Math.round(maxDim * 100) / 100, height: Math.round(minDim * 100) / 100 };
  }
  return { width: Math.round(minDim * 100) / 100, height: Math.round(maxDim * 100) / 100 };
}

/**
 * Generates binary Uint8Array containing a compliant empty PDF document.
 */
export function createBlankPdfBytes(options: BlankPdfOptions = {}): Uint8Array {
  const pageCount = Math.max(1, Math.floor(options.pageCount ?? 1));
  const { width, height } = getPageDimensions(options);

  // We build PDF objects:
  // 1: Catalog
  // 2: Pages
  // 3 .. 3 + (pageCount - 1): Page objects
  // (3 + pageCount) .. (2 + 2*pageCount): Content stream objects
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  const contentObjectIds: number[] = [];

  for (let i = 0; i < pageCount; i++) {
    pageObjectIds.push(3 + i);
    contentObjectIds.push(3 + pageCount + i);
  }

  // Obj 1: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  const kidsStr = pageObjectIds.map((id) => `${id} 0 R`).join(' ');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kidsStr}] /Count ${pageCount} >>\nendobj\n`);

  // Page objects
  for (let i = 0; i < pageCount; i++) {
    const pageId = pageObjectIds[i]!;
    const contentId = contentObjectIds[i]!;
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources <<>> /Contents ${contentId} 0 R >>\nendobj\n`
    );
  }

  // Content streams (empty streams)
  for (let i = 0; i < pageCount; i++) {
    const contentId = contentObjectIds[i]!;
    objects.push(`${contentId} 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n`);
  }

  const header = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const encoder = new TextEncoder();
  const headerBytes = encoder.encode(header);

  // Calculate byte offsets
  const offsets: number[] = [0]; // Object 0 is free
  let currentOffset = headerBytes.length;

  const encodedObjects: Uint8Array[] = [];
  for (const objStr of objects) {
    offsets.push(currentOffset);
    const encoded = encoder.encode(objStr);
    encodedObjects.push(encoded);
    currentOffset += encoded.length;
  }

  const startXref = currentOffset;
  const totalObjCount = offsets.length;

  // Build xref table
  let xrefStr = `xref\n0 ${totalObjCount}\n0000000000 65535 f \n`;
  for (let i = 1; i < totalObjCount; i++) {
    const off = String(offsets[i]).padStart(10, '0');
    xrefStr += `${off} 00000 n \n`;
  }

  const trailerStr = `trailer\n<< /Size ${totalObjCount} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  const xrefBytes = encoder.encode(xrefStr);
  const trailerBytes = encoder.encode(trailerStr);

  const totalLength = currentOffset + xrefBytes.length + trailerBytes.length;
  const result = new Uint8Array(totalLength);

  let writePos = 0;
  result.set(headerBytes, writePos);
  writePos += headerBytes.length;

  for (const objBytes of encodedObjects) {
    result.set(objBytes, writePos);
    writePos += objBytes.length;
  }

  result.set(xrefBytes, writePos);
  writePos += xrefBytes.length;

  result.set(trailerBytes, writePos);

  return result;
}
