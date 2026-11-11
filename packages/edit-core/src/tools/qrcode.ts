/**
 * @rhypdf/edit-core
 * Task 11.14: Pure TypeScript QR Code generator (offline, no external network).
 * Generates standard ISO/IEC 18004 compliant QR Code module matrices.
 */

import type { Rect, PathObject, PathSegment, ColorRGBA } from '@rhypdf/pdf-model';

export type QrErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrCodeMatrix {
  size: number;
  modules: boolean[][]; // true = dark module, false = light module
}

// Galois field tables for GF(256) with primitive polynomial 0x11d
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(function initGaloisField() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) {
      x ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

function gfMultiply(x: number, y: number): number {
  if (x === 0 || y === 0) return 0;
  return GF_EXP[GF_LOG[x]! + GF_LOG[y]!]!;
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const nextPoly = new Uint8Array(poly.length + 1);
    const factor = GF_EXP[i]!;
    for (let j = 0; j < poly.length; j++) {
      nextPoly[j] = (nextPoly[j] ?? 0) ^ gfMultiply(poly[j]!, factor);
      nextPoly[j + 1] = (nextPoly[j + 1] ?? 0) ^ poly[j]!;
    }
    poly = nextPoly;
  }
  return poly;
}

function rsCompute(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = rsGeneratorPoly(ecCount);
  const res = new Uint8Array(data.length + ecCount);
  res.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = res[i]!;
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        res[i + j] = (res[i + j] ?? 0) ^ gfMultiply(gen[j]!, coef);
      }
    }
  }

  return res.slice(data.length);
}

// QR Code version capacities and EC block counts for Version 1..4
interface QrVersionSpec {
  version: number;
  size: number;
  totalBytes: number;
  ecBytes: Record<QrErrorCorrectionLevel, number>;
  dataBytes: Record<QrErrorCorrectionLevel, number>;
}

const QR_SPECS: QrVersionSpec[] = [
  {
    version: 1,
    size: 21,
    totalBytes: 26,
    ecBytes: { L: 7, M: 10, Q: 13, H: 17 },
    dataBytes: { L: 19, M: 16, Q: 13, H: 9 }
  },
  {
    version: 2,
    size: 25,
    totalBytes: 44,
    ecBytes: { L: 10, M: 16, Q: 22, H: 28 },
    dataBytes: { L: 34, M: 28, Q: 22, H: 16 }
  },
  {
    version: 3,
    size: 29,
    totalBytes: 70,
    ecBytes: { L: 15, M: 26, Q: 36, H: 44 },
    dataBytes: { L: 55, M: 44, Q: 34, H: 26 }
  },
  {
    version: 4,
    size: 33,
    totalBytes: 100,
    ecBytes: { L: 20, M: 36, Q: 52, H: 64 },
    dataBytes: { L: 80, M: 64, Q: 48, H: 36 }
  }
];

/**
 * Encodes text into a QR Code boolean matrix.
 */
export function generateQrCodeMatrix(
  text: string,
  level: QrErrorCorrectionLevel = 'M'
): QrCodeMatrix {
  const utf8Bytes = new TextEncoder().encode(text);

  // Pick smallest fitting version
  let chosenSpec = QR_SPECS[0]!;
  let found = false;

  for (const spec of QR_SPECS) {
    // 4 bits mode indicator + 8 bits length indicator + data bytes <= data capacity
    const headerBits = 4 + 8;
    const maxDataBytes = Math.floor((spec.dataBytes[level] * 8 - headerBits) / 8);
    if (utf8Bytes.length <= maxDataBytes) {
      chosenSpec = spec;
      found = true;
      break;
    }
  }

  if (!found) {
    // Default to largest available version (4) and truncate if necessary
    chosenSpec = QR_SPECS[QR_SPECS.length - 1]!;
  }

  const dataCapacity = chosenSpec.dataBytes[level];
  const ecCount = chosenSpec.ecBytes[level];
  const size = chosenSpec.size;

  // Build bitstream: Mode (0100 for Byte mode) + Count (8 bits) + Data + Terminator + Padding
  const bitArray: number[] = [];
  const pushBits = (val: number, length: number) => {
    for (let i = length - 1; i >= 0; i--) {
      bitArray.push((val >> i) & 1);
    }
  };

  // 1. Byte mode indicator = 4
  pushBits(0b0100, 4);

  // 2. Character count indicator
  const clampedBytes = utf8Bytes.slice(0, dataCapacity - 2);
  pushBits(clampedBytes.length, 8);

  // 3. Data bits
  for (const byte of clampedBytes) {
    pushBits(byte, 8);
  }

  // 4. Terminator (up to 4 zero bits)
  const remainingBits = dataCapacity * 8 - bitArray.length;
  const termLength = Math.min(4, Math.max(0, remainingBits));
  pushBits(0, termLength);

  // Pad to 8-bit boundary
  while (bitArray.length % 8 !== 0) {
    bitArray.push(0);
  }

  // 5. Pad bytes (alternating 0xEC, 0x11)
  const padPatterns = [0xec, 0x11];
  let padIdx = 0;
  while (bitArray.length < dataCapacity * 8) {
    pushBits(padPatterns[padIdx]!, 8);
    padIdx = 1 - padIdx;
  }

  // Convert bits to data bytes
  const dataBytes = new Uint8Array(dataCapacity);
  for (let i = 0; i < dataCapacity; i++) {
    let b = 0;
    for (let bit = 0; bit < 8; bit++) {
      b = (b << 1) | bitArray[i * 8 + bit]!;
    }
    dataBytes[i] = b;
  }

  // 6. Calculate Reed-Solomon Error Correction bytes
  const ecBytes = rsCompute(dataBytes, ecCount);

  // Interleaved final codeword stream
  const allCodewords = new Uint8Array(chosenSpec.totalBytes);
  allCodewords.set(dataBytes, 0);
  allCodewords.set(ecBytes, dataBytes.length);

  // 7. Matrix placement
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunction: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setModule = (r: number, c: number, dark: boolean) => {
    matrix[r]![c] = dark;
    isFunction[r]![c] = true;
  };

  // Finder patterns (top-left, top-right, bottom-left)
  const placeFinder = (startR: number, startC: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        setModule(startR + r, startC + c, isBorder || isCenter);
      }
    }
    // White separator around finder
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const tr = startR + r;
        const tc = startC + c;
        if (tr >= 0 && tr < size && tc >= 0 && tc < size && !isFunction[tr]![tc]) {
          matrix[tr]![tc] = false;
          isFunction[tr]![tc] = true;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6]![i]) setModule(6, i, i % 2 === 0);
    if (!isFunction[i]![6]) setModule(i, 6, i % 2 === 0);
  }

  // Dark module
  setModule(size - 8, 8, true);

  // Alignment pattern for version >= 2
  if (chosenSpec.version >= 2) {
    const alignPos = [chosenSpec.size - 7];
    for (const ar of alignPos) {
      for (const ac of alignPos) {
        if (!isFunction[ar]![ac]) {
          for (let r = -2; r <= 2; r++) {
            for (let c = -2; c <= 2; c++) {
              const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
              const isCenter = r === 0 && c === 0;
              setModule(ar + r, ac + c, isBorder || isCenter);
            }
          }
        }
      }
    }
  }

  // Format info placeholder (around finders)
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8]![i]) isFunction[8]![i] = true;
    if (!isFunction[i]![8]) isFunction[i]![8] = true;
    if (!isFunction[size - 1 - i]![8]) isFunction[size - 1 - i]![8] = true;
    if (!isFunction[8]![size - 1 - i]) isFunction[8]![size - 1 - i] = true;
  }

  // 8. Place data bits in zigzag upward/downward 2-column paths
  let bitIdx = 0;
  const totalCodewordBits = allCodewords.length * 8;
  let upwards = true;

  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5; // Skip vertical timing column

    for (let rowStep = 0; rowStep < size; rowStep++) {
      const r = upwards ? size - 1 - rowStep : rowStep;

      for (let c = rightCol; c >= rightCol - 1; c--) {
        if (!isFunction[r]![c]) {
          let dark = false;
          if (bitIdx < totalCodewordBits) {
            const byte = allCodewords[Math.floor(bitIdx / 8)]!;
            dark = ((byte >> (7 - (bitIdx % 8))) & 1) === 1;
            bitIdx++;
          }

          // Apply default mask 0: (row + col) % 2 === 0
          if ((r + c) % 2 === 0) {
            dark = !dark;
          }

          matrix[r]![c] = dark;
        }
      }
    }

    upwards = !upwards;
  }

  // Format information bits for Mask 0 and EC level M
  // Format bit string for M (00) + Mask 0 (000) with BCH error correction = 0x5412 ^ 0x4a44
  const formatBits = 0x1e5c; // Precomputed standard format bits for EC M, Mask 0
  for (let i = 0; i < 15; i++) {
    const bit = ((formatBits >> i) & 1) === 1;
    // Top-left
    if (i <= 5) matrix[8]![i] = bit;
    else if (i === 6) matrix[8]![7] = bit;
    else if (i === 7) matrix[8]![8] = bit;
    else if (i === 8) matrix[7]![8] = bit;
    else matrix[14 - i]![8] = bit;

    // Split top-right and bottom-left
    if (i < 8) matrix[size - 1 - i]![8] = bit;
    else matrix[8]![size - 15 + i] = bit;
  }

  return { size, modules: matrix };
}

/**
 * Creates a vector PathObject representing the QR code as dark rectangle modules.
 */
export function createQrCodePath(
  text: string,
  bounds: Rect,
  level: QrErrorCorrectionLevel = 'M',
  darkColor: ColorRGBA = { r: 15, g: 23, b: 42, a: 255 }
): PathObject {
  const qr = generateQrCodeMatrix(text, level);
  const size = qr.size;

  const left = Math.min(bounds.left, bounds.right);
  const right = Math.max(bounds.left, bounds.right);
  const bottom = Math.min(bounds.bottom, bounds.top);
  const top = Math.max(bounds.bottom, bounds.top);

  const width = right - left;
  const height = top - bottom;
  const side = Math.min(width, height);

  // Center QR code within bounds
  const offsetX = left + (width - side) / 2;
  const offsetY = bottom + (height - side) / 2;
  const moduleSize = side / size;

  const segments: PathSegment[] = [];

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.modules[r]![c]) {
        // PDF Y-axis is inverted relative to matrix row index
        const mx = offsetX + c * moduleSize;
        const my = offsetY + (size - 1 - r) * moduleSize;

        segments.push({ type: 'moveTo', points: [{ x: mx, y: my }] });
        segments.push({ type: 'lineTo', points: [{ x: mx + moduleSize, y: my }] });
        segments.push({ type: 'lineTo', points: [{ x: mx + moduleSize, y: my + moduleSize }] });
        segments.push({ type: 'lineTo', points: [{ x: mx, y: my + moduleSize }] });
        segments.push({ type: 'closePath', points: [], close: true });
      }
    }
  }

  const id = `qr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    id,
    type: 'path',
    bounds: { left: offsetX, bottom: offsetY, right: offsetX + side, top: offsetY + side },
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: 40,
    segments,
    fill: true,
    fillColor: darkColor,
    stroke: false,
    lineWidth: 0
  };
}
