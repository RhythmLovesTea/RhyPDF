/**
 * @rhypdf/edit-core
 * Task 11.7: Table operations (add/remove rows & columns, update cell text).
 */

import type { TableStructure, GeneratedTable } from './types';
import { createTable } from './generator';

/**
 * Adds a new row to the table at the given index (or at the end if omitted).
 */
export function addTableRow(table: TableStructure, atIndex?: number): GeneratedTable {
  const insertIndex =
    atIndex !== undefined ? Math.max(0, Math.min(table.rowCount, atIndex)) : table.rowCount;
  const newRowCount = table.rowCount + 1;

  // Preserve existing cell texts where possible
  const prevCellMap = new Map<string, string>();
  for (const cell of table.cells) {
    prevCellMap.set(`${cell.row},${cell.col}`, cell.text);
  }

  const generated = createTable(
    table.pageIndex,
    table.bounds,
    newRowCount,
    table.colCount,
    table.options
  );

  // Re-populate existing cell texts
  for (const newCell of generated.structure.cells) {
    let oldR = newCell.row;
    if (newCell.row > insertIndex) {
      oldR = newCell.row - 1;
    } else if (newCell.row === insertIndex) {
      newCell.text = `Cell ${newCell.row + 1},${newCell.col + 1}`;
      continue;
    }
    const prevText = prevCellMap.get(`${oldR},${newCell.col}`);
    if (prevText !== undefined) {
      newCell.text = prevText;
      const block = generated.textBlocks.find((b) => b.id === newCell.blockId);
      if (block) {
        block.lines[0]!.text = prevText;
        block.lines[0]!.spans[0]!.text = prevText;
      }
    }
  }

  return generated;
}

/**
 * Removes a row from the table. Cannot remove if only 1 row remains.
 */
export function removeTableRow(table: TableStructure, rowIndex: number): GeneratedTable | null {
  if (table.rowCount <= 1) {
    return null;
  }
  const deleteIndex = Math.max(0, Math.min(table.rowCount - 1, rowIndex));
  const newRowCount = table.rowCount - 1;

  const prevCellMap = new Map<string, string>();
  for (const cell of table.cells) {
    prevCellMap.set(`${cell.row},${cell.col}`, cell.text);
  }

  const generated = createTable(
    table.pageIndex,
    table.bounds,
    newRowCount,
    table.colCount,
    table.options
  );

  for (const newCell of generated.structure.cells) {
    const oldR = newCell.row >= deleteIndex ? newCell.row + 1 : newCell.row;
    const prevText = prevCellMap.get(`${oldR},${newCell.col}`);
    if (prevText !== undefined) {
      newCell.text = prevText;
      const block = generated.textBlocks.find((b) => b.id === newCell.blockId);
      if (block) {
        block.lines[0]!.text = prevText;
        block.lines[0]!.spans[0]!.text = prevText;
      }
    }
  }

  return generated;
}

/**
 * Adds a new column to the table at the given index (or at the end if omitted).
 */
export function addTableColumn(table: TableStructure, atIndex?: number): GeneratedTable {
  const insertIndex =
    atIndex !== undefined ? Math.max(0, Math.min(table.colCount, atIndex)) : table.colCount;
  const newColCount = table.colCount + 1;

  const prevCellMap = new Map<string, string>();
  for (const cell of table.cells) {
    prevCellMap.set(`${cell.row},${cell.col}`, cell.text);
  }

  const generated = createTable(
    table.pageIndex,
    table.bounds,
    table.rowCount,
    newColCount,
    table.options
  );

  for (const newCell of generated.structure.cells) {
    let oldC = newCell.col;
    if (newCell.col > insertIndex) {
      oldC = newCell.col - 1;
    } else if (newCell.col === insertIndex) {
      newCell.text = `Cell ${newCell.row + 1},${newCell.col + 1}`;
      continue;
    }
    const prevText = prevCellMap.get(`${newCell.row},${oldC}`);
    if (prevText !== undefined) {
      newCell.text = prevText;
      const block = generated.textBlocks.find((b) => b.id === newCell.blockId);
      if (block) {
        block.lines[0]!.text = prevText;
        block.lines[0]!.spans[0]!.text = prevText;
      }
    }
  }

  return generated;
}

/**
 * Removes a column from the table. Cannot remove if only 1 column remains.
 */
export function removeTableColumn(table: TableStructure, colIndex: number): GeneratedTable | null {
  if (table.colCount <= 1) {
    return null;
  }
  const deleteIndex = Math.max(0, Math.min(table.colCount - 1, colIndex));
  const newColCount = table.colCount - 1;

  const prevCellMap = new Map<string, string>();
  for (const cell of table.cells) {
    prevCellMap.set(`${cell.row},${cell.col}`, cell.text);
  }

  const generated = createTable(
    table.pageIndex,
    table.bounds,
    table.rowCount,
    newColCount,
    table.options
  );

  for (const newCell of generated.structure.cells) {
    const oldC = newCell.col >= deleteIndex ? newCell.col + 1 : newCell.col;
    const prevText = prevCellMap.get(`${newCell.row},${oldC}`);
    if (prevText !== undefined) {
      newCell.text = prevText;
      const block = generated.textBlocks.find((b) => b.id === newCell.blockId);
      if (block) {
        block.lines[0]!.text = prevText;
        block.lines[0]!.spans[0]!.text = prevText;
      }
    }
  }

  return generated;
}
