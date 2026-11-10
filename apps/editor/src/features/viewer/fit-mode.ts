import { clampScale } from './useZoomPan';

export type FitMode = 'fitWidth' | 'fitPage' | 'actualSize' | 'custom';

export interface FitCalculationOptions {
  viewportWidth: number;
  viewportHeight: number;
  pageWidthPt: number;
  pageHeightPt: number;
  rotation?: 0 | 90 | 180 | 270;
  horizontalPadding?: number;
  verticalPadding?: number;
}

/**
 * Calculates scale factor for a given fit mode and viewport dimensions.
 */
export function calculateFitScale(mode: FitMode, options: FitCalculationOptions): number {
  if (mode === 'actualSize') {
    return 1.0;
  }

  const {
    viewportWidth,
    viewportHeight,
    pageWidthPt,
    pageHeightPt,
    rotation = 0,
    horizontalPadding = 32,
    verticalPadding = 32
  } = options;

  const isSideways = rotation === 90 || rotation === 270;
  const effW = isSideways ? pageHeightPt : pageWidthPt;
  const effH = isSideways ? pageWidthPt : pageHeightPt;

  const availableW = Math.max(10, viewportWidth - horizontalPadding);
  const availableH = Math.max(10, viewportHeight - verticalPadding);

  if (mode === 'fitWidth') {
    const scale = availableW / effW;
    return clampScale(scale);
  }

  if (mode === 'fitPage') {
    const scaleW = availableW / effW;
    const scaleH = availableH / effH;
    const scale = Math.min(scaleW, scaleH);
    return clampScale(scale);
  }

  return 1.0;
}

const STORAGE_PREFIX = 'rhypdf:fit-mode:';

/**
 * Persists chosen fit mode for a document in localStorage.
 */
export function saveDocumentFitMode(docId: string, mode: FitMode): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`${STORAGE_PREFIX}${docId}`, mode);
    }
  } catch {
    // Ignore private browsing or storage quota errors
  }
}

/**
 * Retrieves persisted fit mode for a document. Defaults to 'fitWidth'.
 */
export function getSavedDocumentFitMode(docId: string, fallback: FitMode = 'fitWidth'): FitMode {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(`${STORAGE_PREFIX}${docId}`) as FitMode | null;
      if (
        saved === 'fitWidth' ||
        saved === 'fitPage' ||
        saved === 'actualSize' ||
        saved === 'custom'
      ) {
        return saved;
      }
    }
  } catch {
    // Ignore
  }
  return fallback;
}
