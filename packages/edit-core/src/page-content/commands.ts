/**
 * @rhypdf/edit-core
 * Tasks 11.8 - 11.11: Page content commands (Header/Footer, Bates, Watermark, Background).
 */

import type { PathObject } from '@rhypdf/pdf-model';
import type { EditCommand } from '../types';
import type { TextBlock } from '../text/types';
import type { WatermarkObject } from './watermark';

export class ApplyHeaderFooterCommand implements EditCommand {
  public readonly id = `cmd-header-footer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name = 'Apply Header & Footer';
  public readonly timestamp = Date.now();
  public readonly pageIndex: number;
  public readonly approximateBytes: number;

  constructor(
    public readonly generatedBlocks: TextBlock[],
    private readonly insertFn?: (blocks: TextBlock[]) => Promise<void> | void,
    private readonly removeFn?: (blockIds: string[]) => Promise<void> | void
  ) {
    this.pageIndex = generatedBlocks[0]?.pageIndex ?? 0;
    this.approximateBytes = 512 + generatedBlocks.length * 256;
  }

  async apply(): Promise<void> {
    if (this.insertFn) {
      await this.insertFn(this.generatedBlocks);
    }
  }

  async revert(): Promise<void> {
    if (this.removeFn) {
      await this.removeFn(this.generatedBlocks.map((b) => b.id));
    }
  }
}

export class ApplyBatesNumberingCommand implements EditCommand {
  public readonly id = `cmd-bates-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name = 'Apply Bates Numbering';
  public readonly timestamp = Date.now();
  public readonly pageIndex: number;
  public readonly approximateBytes: number;

  constructor(
    public readonly batesBlocks: TextBlock[],
    private readonly insertFn?: (blocks: TextBlock[]) => Promise<void> | void,
    private readonly removeFn?: (blockIds: string[]) => Promise<void> | void
  ) {
    this.pageIndex = batesBlocks[0]?.pageIndex ?? 0;
    this.approximateBytes = 512 + batesBlocks.length * 256;
  }

  async apply(): Promise<void> {
    if (this.insertFn) {
      await this.insertFn(this.batesBlocks);
    }
  }

  async revert(): Promise<void> {
    if (this.removeFn) {
      await this.removeFn(this.batesBlocks.map((b) => b.id));
    }
  }
}

export class ApplyWatermarkCommand implements EditCommand {
  public readonly id = `cmd-watermark-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name = 'Apply Watermark';
  public readonly timestamp = Date.now();
  public readonly pageIndex: number;
  public readonly approximateBytes: number;

  constructor(
    public readonly watermarkObjects: WatermarkObject[],
    private readonly insertFn?: (objs: WatermarkObject[]) => Promise<void> | void,
    private readonly removeFn?: (objIds: string[]) => Promise<void> | void
  ) {
    const first = watermarkObjects[0];
    this.pageIndex = first && 'pageIndex' in first ? (first.pageIndex as number) : 0;
    this.approximateBytes = 512 + watermarkObjects.length * 256;
  }

  async apply(): Promise<void> {
    if (this.insertFn) {
      await this.insertFn(this.watermarkObjects);
    }
  }

  async revert(): Promise<void> {
    if (this.removeFn) {
      await this.removeFn(this.watermarkObjects.map((o) => o.id));
    }
  }
}

export class SetPageBackgroundCommand implements EditCommand {
  public readonly id = `cmd-page-bg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name = 'Set Page Background';
  public readonly timestamp = Date.now();
  public readonly pageIndex: number;
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndices: number[],
    public readonly backgroundPaths: PathObject[],
    private readonly insertFn?: (
      pageIndices: number[],
      paths: PathObject[]
    ) => Promise<void> | void,
    private readonly removeFn?: (pageIndices: number[], pathIds: string[]) => Promise<void> | void
  ) {
    this.pageIndex = pageIndices[0] ?? 0;
  }

  async apply(): Promise<void> {
    if (this.insertFn) {
      await this.insertFn(this.pageIndices, this.backgroundPaths);
    }
  }

  async revert(): Promise<void> {
    if (this.removeFn) {
      await this.removeFn(
        this.pageIndices,
        this.backgroundPaths.map((p) => p.id)
      );
    }
  }
}
