import type { Rect, TextRun, ColorRGBA } from '@rhypdf/pdf-model';
import type { EditCommand } from '../types';
import type { TextBlock } from './types';

function clone<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

export interface CommitTextBlockOptions {
  fontName?: string;
  fontSize?: number;
  color?: ColorRGBA;
  alignment?: 'left' | 'center' | 'right' | 'justify';
}

/**
 * Task 7.11, 7.13, 7.14, 7.19:
 * Commit: remove original text objects of the block (including inside Form XObjects),
 * insert new text objects with correct baselines and chosen font, handle kerning and spacing.
 * Coalesces consecutive keystrokes within 1500ms.
 */
export class CommitTextBlockCommand implements EditCommand {
  public readonly id = `cmd-commit-text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes: number;

  public oldRunsSnapshot: TextRun[];
  public newLines: string[];
  public options?: CommitTextBlockOptions;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    originalBlock: TextBlock,
    newLines: string[],
    options?: CommitTextBlockOptions,
    private readonly commitFn?: (
      pageIndex: number,
      blockId: string,
      oldRuns: TextRun[],
      newLines: string[],
      options?: CommitTextBlockOptions
    ) => Promise<void> | void,
    private readonly revertFn?: (
      pageIndex: number,
      blockId: string,
      restoredRuns: TextRun[]
    ) => Promise<void> | void
  ) {
    this.oldRunsSnapshot = clone(originalBlock.runs);
    this.newLines = clone(newLines);
    this.options = options ? clone(options) : undefined;
    this.approximateBytes = JSON.stringify(this.oldRunsSnapshot).length + 256;
    this.name = `Commit text edit in block ${blockId}`;
  }

  async apply(): Promise<void> {
    if (this.commitFn) {
      await this.commitFn(
        this.pageIndex,
        this.blockId,
        this.oldRunsSnapshot,
        this.newLines,
        this.options
      );
    }
  }

  async revert(): Promise<void> {
    if (this.revertFn) {
      await this.revertFn(this.pageIndex, this.blockId, clone(this.oldRunsSnapshot));
    }
  }

  mergeWith(other: EditCommand): boolean {
    if (
      other instanceof CommitTextBlockCommand &&
      other.pageIndex === this.pageIndex &&
      other.blockId === this.blockId &&
      other.timestamp - this.timestamp < 1500
    ) {
      // Coalesce typing stream: retain initial oldRunsSnapshot, update target newLines and options
      this.newLines = clone(other.newLines);
      if (other.options) {
        this.options = clone(other.options);
      }
      return true;
    }
    return false;
  }
}

/**
 * Task 7.15: "Add text box": click to place or drag an area;
 * default font and size; resizable; auto-grow option.
 */
export class InsertTextBlockCommand implements EditCommand {
  public readonly id = `cmd-insert-text-box-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 512;

  public createdRun: TextRun;

  constructor(
    public readonly pageIndex: number,
    text: string,
    bounds: Rect,
    fontName = 'Roboto',
    fontSize = 14,
    color: ColorRGBA = { r: 0, g: 0, b: 0, a: 255 },
    private readonly insertFn?: (pageIndex: number, run: TextRun) => Promise<void> | void,
    private readonly deleteFn?: (pageIndex: number, runId: string) => Promise<void> | void
  ) {
    this.createdRun = {
      id: `text-box-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'text',
      text,
      fontName,
      fontSize,
      fillColor: color,
      bounds,
      matrix: [1, 0, 0, 1, bounds.left, bounds.bottom],
      zIndex: 999,
      isEmbeddedSubset: false,
      rotation: 0
    };
    this.name = `Add text box at (${Math.round(bounds.left)}, ${Math.round(bounds.bottom)})`;
  }

  async apply(): Promise<void> {
    if (this.insertFn) {
      await this.insertFn(this.pageIndex, clone(this.createdRun));
    }
  }

  async revert(): Promise<void> {
    if (this.deleteFn) {
      await this.deleteFn(this.pageIndex, this.createdRun.id);
    }
  }
}

/**
 * Task 7.16: Delete a text block (undoable).
 */
export class DeleteTextBlockCommand implements EditCommand {
  public readonly id = `cmd-delete-text-block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes: number;
  public readonly deletedRuns: TextRun[];

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    blockToDelete: TextBlock,
    private readonly deleteRunsFn?: (pageIndex: number, runIds: string[]) => Promise<void> | void,
    private readonly restoreRunsFn?: (pageIndex: number, runs: TextRun[]) => Promise<void> | void
  ) {
    this.deletedRuns = clone(blockToDelete.runs);
    this.approximateBytes = JSON.stringify(this.deletedRuns).length + 256;
    this.name = `Delete text block ${blockId}`;
  }

  async apply(): Promise<void> {
    if (this.deleteRunsFn) {
      await this.deleteRunsFn(
        this.pageIndex,
        this.deletedRuns.map((r) => r.id)
      );
    }
  }

  async revert(): Promise<void> {
    if (this.restoreRunsFn) {
      await this.restoreRunsFn(this.pageIndex, clone(this.deletedRuns));
    }
  }
}

/**
 * Task 7.17: Move text block (undoable).
 */
export class MoveTextBlockCommand implements EditCommand {
  public readonly id = `cmd-move-text-block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public dx: number,
    public dy: number,
    private readonly moveFn?: (
      pageIndex: number,
      blockId: string,
      dx: number,
      dy: number
    ) => Promise<void> | void
  ) {
    this.name = `Move text block ${blockId} by (${dx}, ${dy})`;
  }

  async apply(): Promise<void> {
    if (this.moveFn) {
      await this.moveFn(this.pageIndex, this.blockId, this.dx, this.dy);
    }
  }

  async revert(): Promise<void> {
    if (this.moveFn) {
      await this.moveFn(this.pageIndex, this.blockId, -this.dx, -this.dy);
    }
  }

  mergeWith(other: EditCommand): boolean {
    if (
      other instanceof MoveTextBlockCommand &&
      other.pageIndex === this.pageIndex &&
      other.blockId === this.blockId &&
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
 * Task 7.17: Resize block width and re-wrap text lines (undoable).
 */
export class ResizeTextBlockWidthCommand implements EditCommand {
  public readonly id = `cmd-resize-text-width-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public readonly oldWidth: number,
    public readonly newWidth: number,
    private readonly resizeFn?: (
      pageIndex: number,
      blockId: string,
      width: number
    ) => Promise<void> | void
  ) {
    this.name = `Resize text block ${blockId} width to ${Math.round(newWidth)}pt`;
  }

  async apply(): Promise<void> {
    if (this.resizeFn) {
      await this.resizeFn(this.pageIndex, this.blockId, this.newWidth);
    }
  }

  async revert(): Promise<void> {
    if (this.resizeFn) {
      await this.resizeFn(this.pageIndex, this.blockId, this.oldWidth);
    }
  }
}

/**
 * Task 7.17: Rotate text block (undoable).
 */
export class RotateTextBlockCommand implements EditCommand {
  public readonly id = `cmd-rotate-text-block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public readonly oldAngle: number,
    public readonly newAngle: number,
    private readonly rotateFn?: (
      pageIndex: number,
      blockId: string,
      angle: number
    ) => Promise<void> | void
  ) {
    this.name = `Rotate text block ${blockId} to ${newAngle}°`;
  }

  async apply(): Promise<void> {
    if (this.rotateFn) {
      await this.rotateFn(this.pageIndex, this.blockId, this.newAngle);
    }
  }

  async revert(): Promise<void> {
    if (this.rotateFn) {
      await this.rotateFn(this.pageIndex, this.blockId, this.oldAngle);
    }
  }
}

/**
 * Task 7.18: Batch find & replace command across multiple blocks/pages (undoable).
 */
export class BatchReplaceTextCommand implements EditCommand {
  public readonly id = `cmd-batch-replace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes: number;

  constructor(
    public readonly pageIndex: number,
    public readonly query: string,
    public readonly replacement: string,
    public readonly replacedCount: number,
    private readonly applyFn?: () => Promise<void> | void,
    private readonly revertFn?: () => Promise<void> | void
  ) {
    this.name = `Replace "${query}" with "${replacement}" (${replacedCount} instances)`;
    this.approximateBytes = 512;
  }

  async apply(): Promise<void> {
    if (this.applyFn) await this.applyFn();
  }

  async revert(): Promise<void> {
    if (this.revertFn) await this.revertFn();
  }
}

/**
 * Task 8.1, 8.2, 8.15, 8.16: Set Font Family Command
 * Updates block font family, records previous family, and tracks original detected font.
 */
export class SetFontFamilyCommand implements EditCommand {
  public readonly id = `cmd-set-font-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public readonly oldFontFamily: string,
    public readonly newFontFamily: string,
    public readonly originalFontName?: string,
    private readonly applyFn?: (family: string) => Promise<void> | void
  ) {
    this.name = `Change font of block ${blockId} from "${oldFontFamily}" to "${newFontFamily}"`;
  }

  async apply(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.newFontFamily);
  }

  async revert(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.oldFontFamily);
  }
}

/**
 * Task 8.8: Set Font Size Command
 */
export class SetFontSizeCommand implements EditCommand {
  public readonly id = `cmd-set-fontsize-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public readonly oldFontSize: number,
    public readonly newFontSize: number,
    private readonly applyFn?: (size: number) => Promise<void> | void
  ) {
    this.name = `Change font size of block ${blockId} from ${oldFontSize}pt to ${newFontSize}pt`;
  }

  async apply(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.newFontSize);
  }

  async revert(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.oldFontSize);
  }
}

export interface TextStyleOptions {
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  isStrikethrough?: boolean;
  isSuperscript?: boolean;
  isSubscript?: boolean;
  isSyntheticBold?: boolean;
  isSyntheticItalic?: boolean;
}

/**
 * Task 8.9, 8.12: Set Text Style Command (Bold, Italic, Underline, Strike, Super, Sub)
 */
export class SetTextStyleCommand implements EditCommand {
  public readonly id = `cmd-set-style-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public readonly oldStyle: TextStyleOptions,
    public readonly newStyle: TextStyleOptions,
    private readonly applyFn?: (style: TextStyleOptions) => Promise<void> | void
  ) {
    this.name = `Update text styles on block ${blockId}`;
  }

  async apply(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.newStyle);
  }

  async revert(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.oldStyle);
  }
}

/**
 * Task 8.10, 8.12: Set Text Color & Opacity Command
 */
export class SetTextColorCommand implements EditCommand {
  public readonly id = `cmd-set-color-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public readonly oldColor: ColorRGBA,
    public readonly newColor: ColorRGBA,
    public readonly oldOpacity?: number,
    public readonly newOpacity?: number,
    private readonly applyFn?: (color: ColorRGBA, opacity?: number) => Promise<void> | void
  ) {
    this.name = `Change text color on block ${blockId}`;
  }

  async apply(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.newColor, this.newOpacity);
  }

  async revert(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.oldColor, this.oldOpacity);
  }
}

/**
 * Task 8.10: Set Text Highlight Color Command
 */
export class SetTextHighlightColorCommand implements EditCommand {
  public readonly id = `cmd-set-highlight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public readonly oldHighlight: ColorRGBA | null,
    public readonly newHighlight: ColorRGBA | null,
    private readonly applyFn?: (highlight: ColorRGBA | null) => Promise<void> | void
  ) {
    this.name = `Change highlight color on block ${blockId}`;
  }

  async apply(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.newHighlight);
  }

  async revert(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.oldHighlight);
  }
}

/**
 * Task 8.11: Set Text Alignment Command
 */
export class SetTextAlignmentCommand implements EditCommand {
  public readonly id = `cmd-set-align-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public readonly oldAlign: 'left' | 'center' | 'right' | 'justify',
    public readonly newAlign: 'left' | 'center' | 'right' | 'justify',
    private readonly applyFn?: (
      align: 'left' | 'center' | 'right' | 'justify'
    ) => Promise<void> | void
  ) {
    this.name = `Set alignment of block ${blockId} to "${newAlign}"`;
  }

  async apply(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.newAlign);
  }

  async revert(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.oldAlign);
  }
}

export interface SpacingOptions {
  lineSpacing?: number;
  letterSpacing?: number;
  paragraphSpacing?: number;
}

/**
 * Task 8.11: Set Text Spacing Command (line spacing, character spacing, paragraph spacing)
 */
export class SetTextSpacingCommand implements EditCommand {
  public readonly id = `cmd-set-spacing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;

  constructor(
    public readonly pageIndex: number,
    public readonly blockId: string,
    public readonly oldSpacing: SpacingOptions,
    public readonly newSpacing: SpacingOptions,
    private readonly applyFn?: (spacing: SpacingOptions) => Promise<void> | void
  ) {
    this.name = `Update spacing on text block ${blockId}`;
  }

  async apply(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.newSpacing);
  }

  async revert(): Promise<void> {
    if (this.applyFn) await this.applyFn(this.oldSpacing);
  }
}
