import type { TextBlock, FindReplaceOptions, FindReplaceMatch } from './types';

/**
 * Searches across text blocks for occurrences of query string.
 * Subtask 7.18: Find & Replace across the document (case-sensitive, whole-word, replace one / all).
 */
export function findInTextBlocks(
  blocks: TextBlock[],
  query: string,
  options: FindReplaceOptions = {}
): FindReplaceMatch[] {
  if (!query || query.length === 0) return [];

  const { caseSensitive = false, wholeWord = false } = options;
  const matches: FindReplaceMatch[] = [];

  let regexPattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (wholeWord) {
    regexPattern = `\\b${regexPattern}\\b`;
  }
  const regexFlags = caseSensitive ? 'g' : 'gi';
  const regex = new RegExp(regexPattern, regexFlags);

  for (const block of blocks) {
    for (let lIdx = 0; lIdx < block.lines.length; lIdx++) {
      const line = block.lines[lIdx]!;
      regex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = regex.exec(line.text)) !== null) {
        const start = match.index;
        const end = start + match[0].length;
        const ctxStart = Math.max(0, start - 15);
        const ctxEnd = Math.min(line.text.length, end + 15);
        const context = `${ctxStart > 0 ? '…' : ''}${line.text.slice(ctxStart, ctxEnd)}${ctxEnd < line.text.length ? '…' : ''}`;

        matches.push({
          id: `match-${block.id}-${lIdx}-${start}`,
          pageIndex: block.pageIndex,
          blockId: block.id,
          lineIndex: lIdx,
          matchStart: start,
          matchEnd: end,
          matchedText: match[0],
          context
        });
      }
    }
  }

  return matches;
}

/**
 * Detects if replacing the matched text with replacement string causes
 * line or block bounds to overflow original box dimensions.
 */
export function checkReplacementOverflow(
  match: FindReplaceMatch,
  replacement: string,
  block: TextBlock
): boolean {
  const line = block.lines[match.lineIndex];
  if (!line) return false;

  const originalLength = match.matchedText.length;
  const newLength = replacement.length;
  // If replacement is longer than original by more than 20% of line length
  const addedChars = newLength - originalLength;
  if (addedChars <= 0) return false;

  const lineWidth = line.bounds.right - line.bounds.left;
  const blockWidth = block.bounds.right - block.bounds.left;

  // Approximate width added
  const charWidth = (line.spans[0]?.fontSize || 12) * 0.55;
  const addedWidth = addedChars * charWidth;

  return lineWidth + addedWidth > blockWidth + 5;
}

/**
 * Performs string replacement inside a specific line of a text block.
 */
export function applyReplacementToBlock(
  block: TextBlock,
  match: FindReplaceMatch,
  replacement: string
): { updatedLines: string[]; isOverflow: boolean } {
  const isOverflow = checkReplacementOverflow(match, replacement, block);
  const updatedLines = block.lines.map((line, idx) => {
    if (idx !== match.lineIndex) return line.text;
    const before = line.text.slice(0, match.matchStart);
    const after = line.text.slice(match.matchEnd);
    return before + replacement + after;
  });

  return { updatedLines, isOverflow };
}
