/**
 * @rhypdf/edit-core
 * Task 11.2: Free-hand drawing edit commands.
 */

import type { EditCommand } from '../types';
import type { DrawingStrokeObject } from './types';

export class AddDrawingStrokeCommand implements EditCommand {
  public readonly id = `cmd-add-stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes: number;

  constructor(
    public readonly pageIndex: number,
    public readonly stroke: DrawingStrokeObject,
    private readonly insertFn?: (
      pageIndex: number,
      stroke: DrawingStrokeObject
    ) => Promise<void> | void,
    private readonly deleteFn?: (pageIndex: number, strokeId: string) => Promise<void> | void
  ) {
    this.name = `Draw with ${stroke.tool}`;
    this.approximateBytes = 256 + (stroke.rawPoints?.length ?? 0) * 16;
  }

  async apply(): Promise<void> {
    if (this.insertFn) {
      await this.insertFn(this.pageIndex, this.stroke);
    }
  }

  async revert(): Promise<void> {
    if (this.deleteFn) {
      await this.deleteFn(this.pageIndex, this.stroke.id);
    }
  }
}

export class EraseDrawingStrokeCommand implements EditCommand {
  public readonly id = `cmd-erase-stroke-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name = 'Erase drawing stroke';
  public readonly timestamp = Date.now();
  public readonly approximateBytes: number;

  constructor(
    public readonly pageIndex: number,
    public readonly stroke: DrawingStrokeObject,
    private readonly deleteFn?: (pageIndex: number, strokeId: string) => Promise<void> | void,
    private readonly insertFn?: (
      pageIndex: number,
      stroke: DrawingStrokeObject
    ) => Promise<void> | void
  ) {
    this.approximateBytes = 256 + (stroke.rawPoints?.length ?? 0) * 16;
  }

  async apply(): Promise<void> {
    if (this.deleteFn) {
      await this.deleteFn(this.pageIndex, this.stroke.id);
    }
  }

  async revert(): Promise<void> {
    if (this.insertFn) {
      await this.insertFn(this.pageIndex, this.stroke);
    }
  }
}
