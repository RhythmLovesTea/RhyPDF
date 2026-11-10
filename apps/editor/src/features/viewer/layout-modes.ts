export type PageLayoutMode = 'continuous' | 'single' | 'twoPage';

export interface SpreadPair {
  leftPageIndex: number | null;
  rightPageIndex: number | null;
}

/**
 * Given current page (1-indexed) and total pages, computes the two-page spread pair.
 * In standard book spreads, page 1 is a single cover on the right;
 * pages 2-3, 4-5, etc. are paired spreads.
 */
export function getTwoPageSpread(currentPage: number, totalPages: number): SpreadPair {
  if (totalPages <= 0) {
    return { leftPageIndex: null, rightPageIndex: null };
  }

  // Cover page: page 1
  if (currentPage === 1) {
    return { leftPageIndex: null, rightPageIndex: 0 };
  }

  // If even page (e.g. 2, 4, 6), it is the left page
  if (currentPage % 2 === 0) {
    const leftIdx = currentPage - 1;
    const rightIdx = leftIdx + 1 < totalPages ? leftIdx + 1 : null;
    return { leftPageIndex: leftIdx, rightPageIndex: rightIdx };
  }

  // If odd page (e.g. 3, 5, 7), it is the right page
  const rightIdx = currentPage - 1;
  const leftIdx = rightIdx - 1 >= 0 ? rightIdx - 1 : null;
  return { leftPageIndex: leftIdx, rightPageIndex: rightIdx };
}
