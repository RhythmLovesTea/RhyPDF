import type { Rect, TextRun } from '@rhypdf/pdf-model';
import type { TextBlock } from './types';
import { groupTextRunsToBlocks } from './grouping';
import { rectsIntersect } from '../selection';

/**
 * Task 7.6: "Select text region" tool (drag a rectangle)
 * Filters text runs within the user-dragged region and groups them into a custom TextBlock.
 */
export function groupRunsInRegion(runs: TextRun[], region: Rect, pageIndex = 0): TextBlock | null {
  const selectedRuns = runs.filter((r) => rectsIntersect(r.bounds, region));
  if (selectedRuns.length === 0) return null;

  const blocks = groupTextRunsToBlocks(selectedRuns, pageIndex, {
    lineSpacingFactor: 3.0 // Allow user-selected region to encompass wider line breaks
  });

  if (blocks.length === 0) return null;

  if (blocks.length === 1) {
    return blocks[0]!;
  }

  // Combine multiple sub-blocks in this manual region into a single unified block
  const allLines = blocks.flatMap((b) => b.lines);
  const allRuns = blocks.flatMap((b) => b.runs);
  const firstBlock = blocks[0]!;

  let left = Infinity;
  let bottom = Infinity;
  let right = -Infinity;
  let top = -Infinity;

  for (const b of blocks) {
    left = Math.min(left, b.bounds.left);
    bottom = Math.min(bottom, b.bounds.bottom);
    right = Math.max(right, b.bounds.right);
    top = Math.max(top, b.bounds.top);
  }

  return {
    ...firstBlock,
    id: `block-region-${pageIndex}-${Date.now()}`,
    bounds: { left, bottom, right, top },
    lines: allLines,
    runs: allRuns
  };
}
