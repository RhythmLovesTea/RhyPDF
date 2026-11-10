import type { TextRun, Rect } from '@rhypdf/pdf-model';

export interface SearchOptions {
  matchCase?: boolean;
  wholeWord?: boolean;
}

export interface SearchMatch {
  id: string;
  pageIndex: number;
  text: string;
  rects: Rect[];
  runIndex: number;
  charStartIndex: number;
  charEndIndex: number;
}

/**
 * Escapes regex special characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Searches text runs on a single page and extracts exact bounding rects for all matches.
 */
export function searchPageText(
  pageIndex: number,
  runs: TextRun[],
  query: string,
  options: SearchOptions = {}
): SearchMatch[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { matchCase = false, wholeWord = false } = options;
  const escaped = escapeRegExp(trimmed);
  const pattern = wholeWord ? `\\b${escaped}\\b` : escaped;
  const flags = matchCase ? 'g' : 'gi';

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flags);
  } catch {
    return [];
  }

  const matches: SearchMatch[] = [];

  for (let r = 0; r < runs.length; r++) {
    const run = runs[r];
    if (!run || !run.text) continue;

    const text = run.text;
    regex.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;
      const matchRects: Rect[] = [];

      if (run.charBoxes && run.charBoxes.length >= endIndex) {
        // Build sub-rects from charBoxes
        const subBoxes = run.charBoxes.slice(startIndex, endIndex);
        if (subBoxes.length > 0) {
          let minLeft = Infinity;
          let minBottom = Infinity;
          let maxRight = -Infinity;
          let maxTop = -Infinity;

          for (const cb of subBoxes) {
            if (cb.box.left < minLeft) minLeft = cb.box.left;
            if (cb.box.bottom < minBottom) minBottom = cb.box.bottom;
            if (cb.box.right > maxRight) maxRight = cb.box.right;
            if (cb.box.top > maxTop) maxTop = cb.box.top;
          }

          matchRects.push({
            left: minLeft,
            bottom: minBottom,
            right: maxRight,
            top: maxTop
          });
        }
      } else {
        // Fallback: estimate proportional sub-box from run.bounds
        const runW = run.bounds.right - run.bounds.left;
        const totalChars = text.length || 1;
        const charW = runW / totalChars;

        const left = run.bounds.left + startIndex * charW;
        const right = run.bounds.left + endIndex * charW;

        matchRects.push({
          left,
          bottom: run.bounds.bottom,
          right,
          top: run.bounds.top
        });
      }

      matches.push({
        id: `match-p${pageIndex}-r${r}-c${startIndex}`,
        pageIndex,
        text: match[0],
        rects: matchRects,
        runIndex: r,
        charStartIndex: startIndex,
        charEndIndex: endIndex
      });
    }
  }

  return matches;
}
