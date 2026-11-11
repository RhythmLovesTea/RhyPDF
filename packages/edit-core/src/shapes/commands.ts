/**
 * @rhypdf/edit-core
 * Task 11.1: Shape Edit Commands (Insert, Update style).
 */

import type { EditCommand } from '../types';
import type { ShapeObject, ShapeOptions } from './types';

export class InsertShapeCommand implements EditCommand {
  public readonly id = `cmd-insert-shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 512;

  constructor(
    public readonly pageIndex: number,
    public readonly shape: ShapeObject,
    private readonly insertFn?: (pageIndex: number, shape: ShapeObject) => Promise<void> | void,
    private readonly deleteFn?: (pageIndex: number, shapeId: string) => Promise<void> | void
  ) {
    this.name = `Insert ${shape.shapeType} shape`;
  }

  async apply(): Promise<void> {
    if (this.insertFn) {
      await this.insertFn(this.pageIndex, this.shape);
    }
  }

  async revert(): Promise<void> {
    if (this.deleteFn) {
      await this.deleteFn(this.pageIndex, this.shape.id);
    }
  }
}

export class UpdateShapeStyleCommand implements EditCommand {
  public readonly id = `cmd-update-shape-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name = 'Update shape style';
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  private prevOptions: ShapeOptions;

  constructor(
    public readonly pageIndex: number,
    public readonly shapeId: string,
    public readonly newOptions: Partial<ShapeOptions>,
    initialShape: ShapeObject,
    private readonly updateFn: (
      pageIndex: number,
      shapeId: string,
      options: Partial<ShapeOptions>
    ) => Promise<void> | void
  ) {
    this.prevOptions = { ...initialShape.shapeOptions };
  }

  async apply(): Promise<void> {
    await this.updateFn(this.pageIndex, this.shapeId, this.newOptions);
  }

  async revert(): Promise<void> {
    await this.updateFn(this.pageIndex, this.shapeId, this.prevOptions);
  }
}
