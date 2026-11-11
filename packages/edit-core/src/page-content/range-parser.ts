/**
 * @rhypdf/edit-core
 * Page range parser for header/footers, watermarks, background, and bates numbering.
 */

import type { PageRangeMode } from './types';

/**
 * Returns an array of 0-based page indices matching the mode and range.
 */
export function resolvePageIndices(
  mode: PageRangeMode = 'all',
  totalPages: number,
  customRange?: string,
  excludeFirstPage?: boolean
): number[] {
  if (totalPages <= 0) return [];

  let indices: number[] = [];

  switch (mode) {
    case 'firstPageOnly':
      return [0];

    case 'excludeFirstPage':
      for (let i = 1; i < totalPages; i++) {
        indices.push(i);
      }
      return indices;

    case 'range': {
      if (!customRange || !customRange.trim()) {
        indices = Array.from({ length: totalPages }, (_, i) => i);
      } else {
        const parts = customRange.split(',').map(s => s.trim());
        const set = new Set<number>();

        for (const part of parts) {
          if (!part) continue;
          if (part.includes('-')) {
            const [startStr, endStr] = part.split('-').map(s => s.trim());
            const start = parseInt(startStr!, 10);
            const end = parseInt(endStr!, 10);
            if (!isNaN(start) && !isNaN(end)) {
              const min = Math.max(1, Math.min(start, end));
              const max = Math.min(totalPages, Math.max(start, end));
              for (let p = min; p <= max; p++) {
                set.add(p - 1); // 1-based to 0-based
              }
            }
          } else {
            const p = parseInt(part, 10);
            if (!isNaN(p) && p >= 1 && p <= totalPages) {
              set.add(p - 1);
            }
          }
        }
        indices = Array.from(set).sort((a, b) => a - b);
      }
      break;
    }

    case 'all':
    default:
      indices = Array.from({ length: totalPages }, (_, i) => i);
      break;
  }

  if (excludeFirstPage) {
    indices = indices.filter(idx => idx !== 0);
  }

  return indices;
}
