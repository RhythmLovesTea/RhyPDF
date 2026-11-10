import type { PageObject, Rect, Matrix2D, TextRun } from '@rhypdf/pdf-model';
import type { EditCommand, PageOperationParams } from '../types';

/**
 * Helper to deep clone PageObject data without references
 */
export function cloneObject<T extends PageObject>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * MoveObjectCommand
 * Moves an object by delta (dx, dy) in PDF points.
 * Supports coalescing consecutive moves of the same object.
 */
export class MoveObjectCommand implements EditCommand {
  public readonly id = `cmd-move-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public dx: number,
    public dy: number,
    private readonly mutateFn: (
      pageIndex: number,
      objectId: string,
      deltaX: number,
      deltaY: number
    ) => Promise<void> | void
  ) {
    this.name = `Move object ${objectId} by (${dx}, ${dy})`;
  }

  async apply(): Promise<void> {
    await this.mutateFn(this.pageIndex, this.objectId, this.dx, this.dy);
  }

  async revert(): Promise<void> {
    await this.mutateFn(this.pageIndex, this.objectId, -this.dx, -this.dy);
  }

  mergeWith(other: EditCommand): boolean {
    if (
      other instanceof MoveObjectCommand &&
      other.pageIndex === this.pageIndex &&
      other.objectId === this.objectId &&
      other.timestamp - this.timestamp < 1000
    ) {
      this.dx += other.dx;
      this.dy += other.dy;
      return true;
    }
    return false;
  }
}

/**
 * ResizeObjectCommand
 * Resizes an object from oldBounds to newBounds.
 */
export class ResizeObjectCommand implements EditCommand {
  public readonly id = `cmd-resize-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly oldBounds: Rect,
    public readonly newBounds: Rect,
    private readonly setBoundsFn: (
      pageIndex: number,
      objectId: string,
      bounds: Rect
    ) => Promise<void> | void
  ) {
    this.name = `Resize object ${objectId}`;
  }

  async apply(): Promise<void> {
    await this.setBoundsFn(this.pageIndex, this.objectId, this.newBounds);
  }

  async revert(): Promise<void> {
    await this.setBoundsFn(this.pageIndex, this.objectId, this.oldBounds);
  }
}

/**
 * RotateObjectCommand
 * Rotates an object, changing its matrix or rotation angle.
 */
export class RotateObjectCommand implements EditCommand {
  public readonly id = `cmd-rotate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly oldMatrix: Matrix2D,
    public readonly newMatrix: Matrix2D,
    private readonly setMatrixFn: (
      pageIndex: number,
      objectId: string,
      matrix: Matrix2D
    ) => Promise<void> | void
  ) {
    this.name = `Rotate object ${objectId}`;
  }

  async apply(): Promise<void> {
    await this.setMatrixFn(this.pageIndex, this.objectId, this.newMatrix);
  }

  async revert(): Promise<void> {
    await this.setMatrixFn(this.pageIndex, this.objectId, this.oldMatrix);
  }
}

/**
 * DeleteObjectCommand
 * Deletes an object. Stores a serialized snapshot of the object
 * to faithfully restore it (including bounds, zIndex, styles) upon revert.
 */
export class DeleteObjectCommand implements EditCommand {
  public readonly id = `cmd-delete-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly objectSnapshot: PageObject;
  public readonly approximateBytes: number;

  constructor(
    public readonly pageIndex: number,
    objectToDelete: PageObject,
    private readonly deleteFn: (pageIndex: number, objectId: string) => Promise<void> | void,
    private readonly insertFn: (
      pageIndex: number,
      object: PageObject,
      index?: number
    ) => Promise<void> | void
  ) {
    this.objectSnapshot = cloneObject(objectToDelete);
    this.approximateBytes = JSON.stringify(this.objectSnapshot).length + 128;
    this.name = `Delete object ${objectToDelete.id}`;
  }

  async apply(): Promise<void> {
    await this.deleteFn(this.pageIndex, this.objectSnapshot.id);
  }

  async revert(): Promise<void> {
    await this.insertFn(
      this.pageIndex,
      cloneObject(this.objectSnapshot),
      this.objectSnapshot.zIndex
    );
  }

  getSnapshot(): PageObject {
    return this.objectSnapshot;
  }
}

/**
 * InsertObjectCommand
 * Inserts a new object into a page. On revert, deletes the object.
 */
export class InsertObjectCommand implements EditCommand {
  public readonly id = `cmd-insert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly objectToInsert: PageObject;
  public readonly approximateBytes: number;

  constructor(
    public readonly pageIndex: number,
    object: PageObject,
    private readonly insertFn: (
      pageIndex: number,
      object: PageObject,
      index?: number
    ) => Promise<void> | void,
    private readonly deleteFn: (pageIndex: number, objectId: string) => Promise<void> | void
  ) {
    this.objectToInsert = cloneObject(object);
    this.approximateBytes = JSON.stringify(this.objectToInsert).length + 128;
    this.name = `Insert object ${object.id} (${object.type})`;
  }

  async apply(): Promise<void> {
    await this.insertFn(
      this.pageIndex,
      cloneObject(this.objectToInsert),
      this.objectToInsert.zIndex
    );
  }

  async revert(): Promise<void> {
    await this.deleteFn(this.pageIndex, this.objectToInsert.id);
  }

  getSnapshot(): PageObject {
    return this.objectToInsert;
  }
}

/**
 * EditTextBlockCommand
 * Updates text content, font properties, and metrics.
 */
export class EditTextBlockCommand implements EditCommand {
  public readonly id = `cmd-edit-text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes: number;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly oldTextRun: TextRun,
    public readonly newTextRun: TextRun,
    private readonly updateTextFn: (
      pageIndex: number,
      objectId: string,
      run: TextRun
    ) => Promise<void> | void
  ) {
    this.approximateBytes =
      JSON.stringify(oldTextRun).length + JSON.stringify(newTextRun).length + 128;
    this.name = `Edit text in ${objectId}`;
  }

  async apply(): Promise<void> {
    await this.updateTextFn(this.pageIndex, this.objectId, cloneObject(this.newTextRun));
  }

  async revert(): Promise<void> {
    await this.updateTextFn(this.pageIndex, this.objectId, cloneObject(this.oldTextRun));
  }

  mergeWith(other: EditCommand): boolean {
    if (
      other instanceof EditTextBlockCommand &&
      other.pageIndex === this.pageIndex &&
      other.objectId === this.objectId &&
      other.timestamp - this.timestamp < 1500
    ) {
      // Coalesce typing stream: keep original oldTextRun, take latest newTextRun
      (this as { newTextRun: TextRun }).newTextRun = other.newTextRun;
      return true;
    }
    return false;
  }
}

/**
 * ChangeStyleCommand
 * Changes visual style attributes (color, opacity, line width, etc.)
 */
export class ChangeStyleCommand implements EditCommand {
  public readonly id = `cmd-style-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly property: string,
    public readonly oldValue: unknown,
    public readonly newValue: unknown,
    private readonly setPropertyFn: (
      pageIndex: number,
      objectId: string,
      prop: string,
      val: unknown
    ) => Promise<void> | void
  ) {
    this.name = `Change ${property} on ${objectId}`;
  }

  async apply(): Promise<void> {
    await this.setPropertyFn(this.pageIndex, this.objectId, this.property, this.newValue);
  }

  async revert(): Promise<void> {
    await this.setPropertyFn(this.pageIndex, this.objectId, this.property, this.oldValue);
  }
}

/**
 * ReorderObjectCommand
 * Moves object forward / backward or to front / back in the z-index layer stack.
 */
export class ReorderObjectCommand implements EditCommand {
  public readonly id = `cmd-reorder-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly oldZIndex: number,
    public readonly newZIndex: number,
    private readonly setZIndexFn: (
      pageIndex: number,
      objectId: string,
      zIndex: number
    ) => Promise<void> | void
  ) {
    this.name = `Reorder object ${objectId} from z:${oldZIndex} to z:${newZIndex}`;
  }

  async apply(): Promise<void> {
    await this.setZIndexFn(this.pageIndex, this.objectId, this.newZIndex);
  }

  async revert(): Promise<void> {
    await this.setZIndexFn(this.pageIndex, this.objectId, this.oldZIndex);
  }
}

/**
 * PageOperationCommand
 * Handles page-level operations: insert, delete, rotate, move.
 */
export class PageOperationCommand implements EditCommand {
  public readonly id = `cmd-page-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly pageIndex: number;
  public readonly approximateBytes: number;

  constructor(
    public readonly params: PageOperationParams,
    private readonly executeFn: (p: PageOperationParams) => Promise<void> | void,
    private readonly revertFn: (p: PageOperationParams) => Promise<void> | void
  ) {
    this.pageIndex = params.pageIndex;
    this.approximateBytes = 512 + (params.pageData?.byteLength ?? 0);
    this.name = `Page operation: ${params.type} on page ${params.pageIndex + 1}`;
  }

  async apply(): Promise<void> {
    await this.executeFn(this.params);
  }

  async revert(): Promise<void> {
    await this.revertFn(this.params);
  }
}

/**
 * BatchCommand
 * Groups multiple commands into a single atomic undoable unit.
 */
export class BatchCommand implements EditCommand {
  public readonly id = `cmd-batch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly timestamp = Date.now();
  public readonly pageIndex: number;
  public readonly approximateBytes: number;

  constructor(
    public readonly name: string,
    public readonly commands: EditCommand[],
    pageIndex = 0
  ) {
    this.pageIndex = commands[0]?.pageIndex ?? pageIndex;
    this.approximateBytes = commands.reduce((sum, c) => sum + (c.approximateBytes ?? 256), 128);
  }

  async apply(): Promise<void> {
    for (const cmd of this.commands) {
      await cmd.apply();
    }
  }

  async revert(): Promise<void> {
    // Revert in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      const cmd = this.commands[i];
      if (cmd) {
        await cmd.revert();
      }
    }
  }
}
