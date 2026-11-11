/**
 * @rhypdf/edit-core
 * Task 11.7: Simple table types.
 */

import type { Rect, ColorRGBA, PathObject } from '@rhypdf/pdf-model';
import type { TextBlock } from '../text/types';

export interface TableOptions {
  borderColor?: ColorRGBA;
  borderWidth?: number;
  headerRow?: boolean;
  headerFillColor?: ColorRGBA;
  cellFillColor?: ColorRGBA;
  cellPadding?: number;
  fontName?: string;
  fontSize?: number;
  textColor?: ColorRGBA;
}

export interface TableCellData {
  row: number;
  col: number;
  text: string;
  bounds: Rect;
  blockId: string;
}

export interface TableStructure {
  id: string;
  pageIndex: number;
  bounds: Rect;
  rowCount: number;
  colCount: number;
  rowHeights: number[]; // Height of each row in points
  colWidths: number[];  // Width of each column in points
  options: TableOptions;
  cells: TableCellData[];
  gridPathId: string;
}

export interface GeneratedTable {
  structure: TableStructure;
  gridPath: PathObject;
  textBlocks: TextBlock[];
}
