/**
 * @rhypdf/edit-core
 * Task 11.7: Table commands.
 */

import type { EditCommand } from '../types';
import type { GeneratedTable } from './types';

export class InsertTableCommand implements EditCommand {
  public readonly id = `cmd-insert-table-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly pageIndex: number;
  public readonly approximateBytes: number;

  constructor(
    public readonly generatedTable: GeneratedTable,
    private readonly insertFn?: (table: GeneratedTable) => Promise<void> | void,
    private readonly removeFn?: (table: GeneratedTable) => Promise<void> | void
  ) {
    this.pageIndex = generatedTable.structure.pageIndex;
    this.name = `Insert ${generatedTable.structure.rowCount}x${generatedTable.structure.colCount} Table`;
    this.approximateBytes = 1024 + generatedTable.textBlocks.length * 256;
  }

  async apply(): Promise<void> {
    if (this.insertFn) {
      await this.insertFn(this.generatedTable);
    }
  }

  async revert(): Promise<void> {
    if (this.removeFn) {
      await this.removeFn(this.generatedTable);
    }
  }
}
