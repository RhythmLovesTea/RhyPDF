import type { Rect, BookmarkItem } from '@rhypdf/pdf-model';
import type { EditCommand } from '../types';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export class DeletePagesCommand implements EditCommand {
  readonly id: string;
  readonly name = 'Delete Pages';
  readonly pageIndex: number;
  readonly timestamp = Date.now();

  constructor(
    public readonly pageIndices: number[],
    private readonly onApply: (indices: number[]) => Promise<void> | void,
    private readonly onRevert: (indices: number[]) => Promise<void> | void
  ) {
    this.id = generateId('delete_pages');
    this.pageIndex = pageIndices[0] ?? 0;
  }

  async apply(): Promise<void> {
    await this.onApply(this.pageIndices);
  }

  async revert(): Promise<void> {
    await this.onRevert(this.pageIndices);
  }
}

export class RotatePagesCommand implements EditCommand {
  readonly id: string;
  readonly name = 'Rotate Pages';
  readonly pageIndex: number;
  readonly timestamp = Date.now();

  constructor(
    public readonly pageIndices: number[],
    public readonly angleDelta: number,
    private readonly onRotate: (indices: number[], delta: number) => Promise<void> | void
  ) {
    this.id = generateId('rotate_pages');
    this.pageIndex = pageIndices[0] ?? 0;
  }

  async apply(): Promise<void> {
    await this.onRotate(this.pageIndices, this.angleDelta);
  }

  async revert(): Promise<void> {
    await this.onRotate(this.pageIndices, -this.angleDelta);
  }
}

export class InsertBlankPageCommand implements EditCommand {
  readonly id: string;
  readonly name = 'Insert Blank Page';
  readonly pageIndex: number;
  readonly timestamp = Date.now();

  constructor(
    public readonly targetIndex: number,
    public readonly width: number,
    public readonly height: number,
    private readonly onInsert: (index: number, width: number, height: number) => Promise<void> | void,
    private readonly onRemove: (index: number) => Promise<void> | void
  ) {
    this.id = generateId('insert_blank_page');
    this.pageIndex = targetIndex;
  }

  async apply(): Promise<void> {
    await this.onInsert(this.targetIndex, this.width, this.height);
  }

  async revert(): Promise<void> {
    await this.onRemove(this.targetIndex);
  }
}

export class DuplicatePageCommand implements EditCommand {
  readonly id: string;
  readonly name = 'Duplicate Page';
  readonly pageIndex: number;
  readonly timestamp = Date.now();

  constructor(
    public readonly sourceIndex: number,
    public readonly targetIndex: number,
    private readonly onDuplicate: (source: number, target: number) => Promise<void> | void,
    private readonly onRemove: (target: number) => Promise<void> | void
  ) {
    this.id = generateId('duplicate_page');
    this.pageIndex = targetIndex;
  }

  async apply(): Promise<void> {
    await this.onDuplicate(this.sourceIndex, this.targetIndex);
  }

  async revert(): Promise<void> {
    await this.onRemove(this.targetIndex);
  }
}

export class ReorderPagesCommand implements EditCommand {
  readonly id: string;
  readonly name = 'Reorder Pages';
  readonly pageIndex = 0;
  readonly timestamp = Date.now();

  constructor(
    public readonly previousOrder: number[],
    public readonly newOrder: number[],
    private readonly onReorder: (order: number[]) => Promise<void> | void
  ) {
    this.id = generateId('reorder_pages');
  }

  async apply(): Promise<void> {
    await this.onReorder(this.newOrder);
  }

  async revert(): Promise<void> {
    await this.onReorder(this.previousOrder);
  }
}

export class CropPageCommand implements EditCommand {
  readonly id: string;
  readonly name = 'Crop Page';
  readonly timestamp = Date.now();

  constructor(
    public readonly pageIndex: number,
    public readonly previousCropBox: Rect | undefined,
    public readonly newCropBox: Rect,
    private readonly onCrop: (index: number, cropBox?: Rect) => Promise<void> | void
  ) {
    this.id = generateId('crop_page');
  }

  async apply(): Promise<void> {
    await this.onCrop(this.pageIndex, this.newCropBox);
  }

  async revert(): Promise<void> {
    await this.onCrop(this.pageIndex, this.previousCropBox);
  }
}

export class ResizePageCommand implements EditCommand {
  readonly id: string;
  readonly name = 'Resize Page';
  readonly timestamp = Date.now();

  constructor(
    public readonly pageIndex: number,
    public readonly previousSize: { width: number; height: number },
    public readonly newSize: { width: number; height: number },
    public readonly scaleContent = false,
    private readonly onResize: (index: number, width: number, height: number, scaleContent?: boolean) => Promise<void> | void
  ) {
    this.id = generateId('resize_page');
  }

  async apply(): Promise<void> {
    await this.onResize(this.pageIndex, this.newSize.width, this.newSize.height, this.scaleContent);
  }

  async revert(): Promise<void> {
    await this.onResize(this.pageIndex, this.previousSize.width, this.previousSize.height, this.scaleContent);
  }
}

export class InsertPagesCommand implements EditCommand {
  readonly id: string;
  readonly name = 'Insert Pages from PDF';
  readonly pageIndex: number;
  readonly timestamp = Date.now();

  constructor(
    public readonly targetIndex: number,
    public readonly insertedCount: number,
    private readonly onInsert: () => Promise<void> | void,
    private readonly onRemove: (fromIndex: number, count: number) => Promise<void> | void
  ) {
    this.id = generateId('insert_pages');
    this.pageIndex = targetIndex;
  }

  async apply(): Promise<void> {
    await this.onInsert();
  }

  async revert(): Promise<void> {
    await this.onRemove(this.targetIndex, this.insertedCount);
  }
}

export class UpdateBookmarksCommand implements EditCommand {
  readonly id: string;
  readonly name = 'Update Bookmarks';
  readonly pageIndex = 0;
  readonly timestamp = Date.now();

  constructor(
    public readonly previousBookmarks: BookmarkItem[],
    public readonly newBookmarks: BookmarkItem[],
    private readonly onUpdate: (bookmarks: BookmarkItem[]) => Promise<void> | void
  ) {
    this.id = generateId('update_bookmarks');
  }

  async apply(): Promise<void> {
    await this.onUpdate(this.newBookmarks);
  }

  async revert(): Promise<void> {
    await this.onUpdate(this.previousBookmarks);
  }
}
