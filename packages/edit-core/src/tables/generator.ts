/**
 * @rhypdf/edit-core
 * Task 11.7: Table generator (Vector grid lines + cell TextBlocks).
 */

import type { Rect, PathSegment, PathObject, ColorRGBA } from '@rhypdf/pdf-model';
import type { TextBlock } from '../text/types';
import type { TableOptions, TableStructure, TableCellData, GeneratedTable } from './types';

export function createTable(
  pageIndex: number,
  bounds: Rect,
  rows: number,
  cols: number,
  options: TableOptions = {}
): GeneratedTable {
  const rowCount = Math.max(1, rows);
  const colCount = Math.max(1, cols);

  const left = Math.min(bounds.left, bounds.right);
  const right = Math.max(bounds.left, bounds.right);
  const bottom = Math.min(bounds.bottom, bounds.top);
  const top = Math.max(bounds.bottom, bounds.top);

  const totalWidth = Math.max(20, right - left);
  const totalHeight = Math.max(20, top - bottom);

  const rowHeight = totalHeight / rowCount;
  const colWidth = totalWidth / colCount;

  const rowHeights = Array(rowCount).fill(rowHeight);
  const colWidths = Array(colCount).fill(colWidth);

  const borderColor: ColorRGBA = options.borderColor ?? { r: 100, g: 116, b: 139, a: 255 }; // #64748b slate
  const borderWidth = options.borderWidth ?? 1;
  const fontName = options.fontName ?? 'Roboto-Regular';
  const fontSize = options.fontSize ?? 10;
  const textColor: ColorRGBA = options.textColor ?? { r: 15, g: 23, b: 42, a: 255 };
  const cellPadding = options.cellPadding ?? 4;

  const tableId = `table-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const gridPathId = `path-${tableId}-grid`;

  // Build grid segments
  const segments: PathSegment[] = [];

  // Outer border
  segments.push({ type: 'moveTo', points: [{ x: left, y: bottom }] });
  segments.push({ type: 'lineTo', points: [{ x: right, y: bottom }] });
  segments.push({ type: 'lineTo', points: [{ x: right, y: top }] });
  segments.push({ type: 'lineTo', points: [{ x: left, y: top }] });
  segments.push({ type: 'closePath', points: [], close: true });

  // Internal horizontal row dividers
  let currentY = top;
  for (let r = 0; r < rowCount - 1; r++) {
    currentY -= rowHeights[r]!;
    segments.push({ type: 'moveTo', points: [{ x: left, y: currentY }] });
    segments.push({ type: 'lineTo', points: [{ x: right, y: currentY }] });
  }

  // Internal vertical column dividers
  let currentX = left;
  for (let c = 0; c < colCount - 1; c++) {
    currentX += colWidths[c]!;
    segments.push({ type: 'moveTo', points: [{ x: currentX, y: bottom }] });
    segments.push({ type: 'lineTo', points: [{ x: currentX, y: top }] });
  }

  const gridPath: PathObject = {
    id: gridPathId,
    type: 'path',
    bounds: { left, bottom, right, top },
    matrix: [1, 0, 0, 1, 0, 0],
    zIndex: 10,
    segments,
    stroke: true,
    strokeColor: borderColor,
    lineWidth: borderWidth,
    fill: false
  };

  // Generate cell text blocks
  const cells: TableCellData[] = [];
  const textBlocks: TextBlock[] = [];

  let cellTop = top;
  for (let r = 0; r < rowCount; r++) {
    const rHeight = rowHeights[r]!;
    const cellBottom = cellTop - rHeight;
    let cellLeft = left;

    for (let c = 0; c < colCount; c++) {
      const cWidth = colWidths[c]!;
      const cellRight = cellLeft + cWidth;

      const cellBounds: Rect = {
        left: cellLeft + cellPadding,
        bottom: cellBottom + cellPadding,
        right: cellRight - cellPadding,
        top: cellTop - cellPadding
      };

      const blockId = `tb-cell-${tableId}-${r}-${c}`;
      const defaultText =
        options.headerRow && r === 0 ? `Header ${c + 1}` : `Cell ${r + 1},${c + 1}`;
      const isHeaderCell = Boolean(options.headerRow && r === 0);

      cells.push({
        row: r,
        col: c,
        text: defaultText,
        bounds: cellBounds,
        blockId
      });

      const textBlock: TextBlock = {
        id: blockId,
        pageIndex,
        bounds: cellBounds,
        lines: [
          {
            id: `line-${blockId}-0`,
            text: defaultText,
            bounds: cellBounds,
            baseline: cellBounds.bottom + fontSize * 0.3,
            spans: [
              {
                text: defaultText,
                bounds: cellBounds,
                fontName: isHeaderCell ? 'Roboto-Bold' : fontName,
                fontSize: isHeaderCell ? fontSize : fontSize,
                color: textColor,
                isBold: isHeaderCell
              }
            ]
          }
        ],
        runs: [],
        rotation: 0,
        writingMode: 'horizontal-tb',
        alignment: isHeaderCell ? 'center' : 'left',
        primaryFont: isHeaderCell ? 'Roboto-Bold' : fontName,
        primaryFontSize: fontSize,
        primaryColor: textColor,
        isBold: isHeaderCell,
        isTableCell: true,
        fontReusability: {
          canReuseFont: true,
          isSubset: false,
          isEmbedded: true,
          fontName: isHeaderCell ? 'Roboto-Bold' : fontName,
          missingGlyphs: [],
          recommendedFallback: 'Roboto-Regular'
        }
      };

      textBlocks.push(textBlock);
      cellLeft = cellRight;
    }

    cellTop = cellBottom;
  }

  const structure: TableStructure = {
    id: tableId,
    pageIndex,
    bounds: { left, bottom, right, top },
    rowCount,
    colCount,
    rowHeights,
    colWidths,
    options,
    cells,
    gridPathId
  };

  return { structure, gridPath, textBlocks };
}
