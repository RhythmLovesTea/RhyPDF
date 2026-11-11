import type { Rect, TextRun, ColorRGBA } from '@rhypdf/pdf-model';
import type { TextBlock, TextBlockLine, TextBlockSpan, GroupingOptions } from './types';
import { detectFontReusability } from './fonts';

/**
 * Union multiple Rect bounding boxes into one enclosing Rect.
 */
export function unionRects(rects: Rect[]): Rect {
  if (rects.length === 0) {
    return { left: 0, bottom: 0, right: 0, top: 0 };
  }
  let left = Infinity;
  let bottom = Infinity;
  let right = -Infinity;
  let top = -Infinity;

  for (const r of rects) {
    left = Math.min(left, r.left);
    bottom = Math.min(bottom, r.bottom);
    right = Math.max(right, r.right);
    top = Math.max(top, r.top);
  }

  return { left, bottom, right, top };
}

/**
 * Normalizes text run rotation angle to [0, 360).
 */
export function normalizeRotation(angle?: number): number {
  if (!angle) return 0;
  const mod = Math.round(angle) % 360;
  return mod < 0 ? mod + 360 : mod;
}

/**
 * Determines whether text runs represent vertical CJK writing mode.
 */
export function isVerticalText(run: TextRun): boolean {
  const width = Math.abs(run.bounds.right - run.bounds.left);
  const height = Math.abs(run.bounds.top - run.bounds.bottom);
  const hasCJK = /[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf]/.test(run.text);
  return hasCJK && height > width * 1.5;
}

/**
 * Detect list bullet or numbering prefix.
 */
export function isListPrefix(text: string): boolean {
  const trimmed = text.trim();
  return (
    trimmed.startsWith('•') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('·') ||
    /^\d+[\.\)]\s/.test(trimmed) ||
    /^[a-zA-Z][\.\)]\s/.test(trimmed)
  );
}

/**
 * Detect column gutters in horizontal runs.
 * A gutter is a vertical strip spanning the height where no text runs lie.
 */
function detectColumnGutters(runs: TextRun[], minGutterWidth = 25): number[] {
  if (runs.length < 2) return [];

  // Consider only horizontal runs (rotation 0 or 180)
  const hRuns = runs.filter((r) => {
    const rot = normalizeRotation(r.rotation);
    return rot === 0 || rot === 180;
  });
  if (hRuns.length < 2) return [];

  const lefts = hRuns.map((r) => r.bounds.left);
  const rights = hRuns.map((r) => r.bounds.right);
  const minX = Math.min(...lefts);
  const maxX = Math.max(...rights);
  const totalWidth = maxX - minX;

  if (totalWidth < minGutterWidth * 3) return [];

  // Sort intervals by left
  const intervals = hRuns
    .map((r) => ({ left: r.bounds.left, right: r.bounds.right }))
    .sort((a, b) => a.left - b.left);

  // Merge overlapping horizontal intervals
  const merged: { left: number; right: number }[] = [];
  for (const iv of intervals) {
    if (merged.length === 0) {
      merged.push({ ...iv });
    } else {
      const last = merged[merged.length - 1]!;
      if (iv.left <= last.right) {
        last.right = Math.max(last.right, iv.right);
      } else {
        merged.push({ ...iv });
      }
    }
  }

  // Check gaps between merged horizontal intervals
  const gutters: number[] = [];
  for (let i = 0; i < merged.length - 1; i++) {
    const current = merged[i]!;
    const next = merged[i + 1]!;
    const gap = next.left - current.right;
    if (gap >= minGutterWidth) {
      // Middle of the gutter
      gutters.push(current.right + gap / 2);
    }
  }

  return gutters;
}

/**
 * Group raw TextRuns into lines based on baseline, rotation, and proximity.
 */
function groupRunsIntoLines(
  runs: TextRun[],
  options?: GroupingOptions
): TextBlockLine[] {
  if (runs.length === 0) return [];

  const sortedRuns = [...runs].sort((a, b) => {
    const rotA = normalizeRotation(a.rotation);
    const rotB = normalizeRotation(b.rotation);
    if (rotA !== rotB) return rotA - rotB;

    if (rotA === 0 || rotA === 180) {
      const diffY = b.bounds.bottom - a.bounds.bottom;
      if (Math.abs(diffY) > 2) return diffY;
      return a.bounds.left - b.bounds.left;
    } else {
      const diffX = a.bounds.left - b.bounds.left;
      if (Math.abs(diffX) > 2) return diffX;
      return b.bounds.bottom - a.bounds.bottom;
    }
  });

  const rawLines: TextRun[][] = [];
  let currentLine: TextRun[] = [];

  for (const run of sortedRuns) {
    if (currentLine.length === 0) {
      currentLine.push(run);
      continue;
    }

    const anchor = currentLine[0]!;
    const lastRun = currentLine[currentLine.length - 1]!;
    const rotAnchor = normalizeRotation(anchor.rotation);
    const rotRun = normalizeRotation(run.rotation);

    if (rotAnchor !== rotRun) {
      rawLines.push(currentLine);
      currentLine = [run];
      continue;
    }

    const fontSize = Math.min(anchor.fontSize, run.fontSize);
    const tolerance = options?.baselineTolerance ?? Math.max(2, fontSize * 0.35);

    let sameBaseline = false;
    if (rotAnchor === 0 || rotAnchor === 180) {
      sameBaseline = Math.abs(anchor.bounds.bottom - run.bounds.bottom) <= tolerance;
      // Also ensure runs on same baseline are not separated by large column gutter
      const columnGap = options?.columnGapThreshold ?? Math.max(25, fontSize * 2.5);
      if (sameBaseline && run.bounds.left - lastRun.bounds.right > columnGap) {
        sameBaseline = false;
      }
    } else {
      sameBaseline = Math.abs(anchor.bounds.left - run.bounds.left) <= tolerance;
    }

    if (sameBaseline) {
      currentLine.push(run);
    } else {
      rawLines.push(currentLine);
      currentLine = [run];
    }
  }

  if (currentLine.length > 0) {
    rawLines.push(currentLine);
  }

  const lines: TextBlockLine[] = [];
  let lineIdx = 0;

  for (const lineRuns of rawLines) {
    lineIdx++;
    const rot = normalizeRotation(lineRuns[0]!.rotation);

    if (rot === 0) {
      lineRuns.sort((a, b) => a.bounds.left - b.bounds.left);
    } else if (rot === 180) {
      lineRuns.sort((a, b) => b.bounds.right - a.bounds.right);
    } else if (rot === 90) {
      lineRuns.sort((a, b) => a.bounds.bottom - b.bounds.bottom);
    } else if (rot === 270) {
      lineRuns.sort((a, b) => b.bounds.top - a.bounds.top);
    }

    const spans: TextBlockSpan[] = lineRuns.map((r) => ({
      text: r.text,
      bounds: r.bounds,
      fontName: r.fontName,
      fontSize: r.fontSize,
      color: r.fillColor,
      isBold: Boolean(r.fontInfo?.isBold || /bold/i.test(r.fontName)),
      isItalic: Boolean(r.fontInfo?.isItalic || /italic|oblique/i.test(r.fontName)),
      originalRunId: r.id
    }));

    let fullText = '';
    for (let k = 0; k < lineRuns.length; k++) {
      const cur = lineRuns[k]!;
      if (k > 0) {
        const prev = lineRuns[k - 1]!;
        const gap = cur.bounds.left - prev.bounds.right;
        if (gap > cur.fontSize * 0.2 && !prev.text.endsWith(' ') && !cur.text.startsWith(' ')) {
          fullText += ' ';
        }
      }
      fullText += cur.text;
    }

    const lineBounds = unionRects(lineRuns.map((r) => r.bounds));
    const baseline = lineRuns[0]!.bounds.bottom;

    lines.push({
      id: `line-${lineIdx}-${Math.random().toString(36).slice(2, 6)}`,
      text: fullText,
      bounds: lineBounds,
      baseline,
      spans
    });
  }

  return lines;
}

/**
 * Detect alignment of lines in a block.
 */
function detectAlignment(lines: TextBlockLine[]): 'left' | 'center' | 'right' | 'justify' {
  if (lines.length <= 1) return 'left';

  const leftCoords = lines.map((l) => l.bounds.left);
  const rightCoords = lines.map((l) => l.bounds.right);
  const centerCoords = lines.map((l) => (l.bounds.left + l.bounds.right) / 2);

  const leftSpread = Math.max(...leftCoords) - Math.min(...leftCoords);
  const rightSpread = Math.max(...rightCoords) - Math.min(...rightCoords);
  const centerSpread = Math.max(...centerCoords) - Math.min(...centerCoords);

  if (centerSpread < 4 && leftSpread > 6 && rightSpread > 6) {
    return 'center';
  }
  if (rightSpread < 4 && leftSpread > 6) {
    return 'right';
  }
  return 'left';
}

/**
 * Detect table grid structures: multiple rows sharing column alignments or multiple distinct cells per baseline.
 */
function isTableLayout(runs: TextRun[], lines: TextBlockLine[]): boolean {
  // If any run is a long paragraph sentence or wide text block, it's not a table
  if (runs.some((r) => r.text.length > 25 || r.bounds.right - r.bounds.left > 130)) {
    return false;
  }

  // Check if multiple runs have identical baselines with gap, or lines have tabular alignment
  const baselineMap = new Map<number, TextRun[]>();
  for (const r of runs) {
    const key = Math.round(r.bounds.bottom / 4) * 4;
    const list = baselineMap.get(key) || [];
    list.push(r);
    baselineMap.set(key, list);
  }

  let multiCellRows = 0;
  for (const rowRuns of baselineMap.values()) {
    if (rowRuns.length >= 2) multiCellRows++;
  }

  return multiCellRows >= 2 || (lines.length >= 2 && lines.some((l) => /\$\d+|\d+\.\d{2}/.test(l.text)));
}

/**
 * Group runs into lines and blocks using baseline, font, size, color, gaps and column detection.
 * Subtasks 7.1, 7.2, 7.3, 7.4.
 */
export function groupTextRunsToBlocks(
  runs: TextRun[],
  pageIndex = 0,
  options?: GroupingOptions
): TextBlock[] {
  if (runs.length === 0) return [];

  // Check if this is a table structure first
  const isTable = isTableLayout(runs, []);
  if (isTable) {
    const lines = groupRunsIntoLines(runs, options);
    const block = buildTextBlock(lines, runs, pageIndex, options?.pageHeight ?? 842);
    block.isTableCell = true;
    return [block];
  }

  // Detect column gutters to separate multi-column layouts (Task 7.2)
  const gutters = detectColumnGutters(runs, options?.columnGapThreshold ?? 25);

  if (gutters.length > 0) {
    // Partition runs by column gutters
    const columnRuns: TextRun[][] = [];
    const boundaries = [-Infinity, ...gutters, Infinity];

    for (let c = 0; c < boundaries.length - 1; c++) {
      const minX = boundaries[c]!;
      const maxX = boundaries[c + 1]!;
      const colRuns = runs.filter((r) => r.bounds.left >= minX && r.bounds.left < maxX);
      if (colRuns.length > 0) {
        columnRuns.push(colRuns);
      }
    }

    // Process each column separately in reading order
    const allBlocks: TextBlock[] = [];
    for (const cRuns of columnRuns) {
      const colBlocks = groupColumnRunsToBlocks(cRuns, pageIndex, options);
      allBlocks.push(...colBlocks);
    }
    return allBlocks;
  }

  return groupColumnRunsToBlocks(runs, pageIndex, options);
}

function groupColumnRunsToBlocks(
  runs: TextRun[],
  pageIndex: number,
  options?: GroupingOptions
): TextBlock[] {
  const lines = groupRunsIntoLines(runs, options);
  if (lines.length === 0) return [];

  const blocks: TextBlock[] = [];
  let currentLines: TextBlockLine[] = [];

  const pageHeight = options?.pageHeight ?? 842;
  const lineSpacingFactor = options?.lineSpacingFactor ?? 1.8;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (currentLines.length === 0) {
      currentLines.push(line);
      continue;
    }

    const prevLine = currentLines[currentLines.length - 1]!;
    const fontSize = prevLine.spans[0]?.fontSize || 12;

    const verticalGap = prevLine.bounds.bottom - line.bounds.top;
    const isNewParagraph = verticalGap > fontSize * lineSpacingFactor;

    const prevLeft = prevLine.bounds.left;
    const prevRight = prevLine.bounds.right;
    const curLeft = line.bounds.left;
    const curRight = line.bounds.right;

    const horizontalOverlap = Math.min(prevRight, curRight) - Math.max(prevLeft, curLeft);
    const isDifferentColumn = horizontalOverlap < -15;

    const curFontSize = line.spans[0]?.fontSize || 12;
    const isHeaderBreak = Math.abs(curFontSize - fontSize) > 3.5;

    const isListStart = isListPrefix(line.text);

    if (isNewParagraph || isDifferentColumn || isHeaderBreak || isListStart) {
      blocks.push(buildTextBlock(currentLines, runs, pageIndex, pageHeight));
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }

  if (currentLines.length > 0) {
    blocks.push(buildTextBlock(currentLines, runs, pageIndex, pageHeight));
  }

  return blocks;
}

/**
 * Constructs a TextBlock from grouped lines.
 */
function buildTextBlock(
  lines: TextBlockLine[],
  allRuns: TextRun[],
  pageIndex: number,
  pageHeight: number
): TextBlock {
  const lineRunIds = new Set<string>();
  for (const l of lines) {
    for (const s of l.spans) {
      if (s.originalRunId) lineRunIds.add(s.originalRunId);
    }
  }

  const blockRuns = allRuns.filter((r) => lineRunIds.has(r.id));
  const bounds = unionRects(lines.map((l) => l.bounds));

  const firstSpan = lines[0]?.spans[0];
  const primaryFont = firstSpan?.fontName || 'Helvetica';
  const primaryFontSize = firstSpan?.fontSize || 12;
  const primaryColor: ColorRGBA = firstSpan?.color || { r: 0, g: 0, b: 0, a: 255 };

  const firstRun = blockRuns[0];
  const rotation = normalizeRotation(firstRun?.rotation);
  const writingMode = blockRuns.some(isVerticalText) ? 'vertical-rl' : 'horizontal-tb';

  const isHeader = bounds.bottom > pageHeight * 0.9 || primaryFontSize > 16;
  const isFooter = bounds.top < pageHeight * 0.08 || (bounds.top < 60 && primaryFontSize <= 10);
  const isListItem = lines.some((l) => isListPrefix(l.text));
  const isTableCell = isTableLayout(blockRuns, lines);

  const fontReusability = detectFontReusability(blockRuns, undefined, primaryFont);
  const alignment = detectAlignment(lines);

  return {
    id: `block-${pageIndex}-${Math.round(bounds.left)}-${Math.round(bounds.bottom)}-${Math.random().toString(36).slice(2, 6)}`,
    pageIndex,
    bounds,
    lines,
    runs: blockRuns,
    rotation,
    writingMode,
    alignment,
    primaryFont,
    primaryFontSize,
    primaryColor,
    fontReusability,
    isBold: Boolean(firstSpan?.isBold),
    isItalic: Boolean(firstSpan?.isItalic),
    isHeader,
    isFooter,
    isListItem,
    isTableCell
  };
}
