import type { ImageObject, Rect, Matrix2D } from '@rhypdf/pdf-model';
import type { EditCommand } from '../types';
import { cloneObject } from '../commands';
import type { ImageAdjustments } from './types';

/**
 * CropImageCommand
 * Applies non-destructive or destructive crop bounds to an ImageObject.
 */
export class CropImageCommand implements EditCommand {
  public readonly id = `cmd-crop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
    this.name = `Crop image ${objectId}`;
  }

  async apply(): Promise<void> {
    await this.setBoundsFn(this.pageIndex, this.objectId, this.newBounds);
  }

  async revert(): Promise<void> {
    await this.setBoundsFn(this.pageIndex, this.objectId, this.oldBounds);
  }
}

/**
 * ReplaceImageCommand
 * Replaces an existing image with a new image object (fresh bitmap / dimensions / bounds).
 */
export class ReplaceImageCommand implements EditCommand {
  public readonly id = `cmd-replace-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes: number;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly oldImage: ImageObject,
    public readonly newImage: ImageObject,
    private readonly updateImageFn: (
      pageIndex: number,
      objectId: string,
      image: ImageObject
    ) => Promise<void> | void
  ) {
    this.name = `Replace image ${objectId}`;
    this.approximateBytes = 512;
  }

  async apply(): Promise<void> {
    await this.updateImageFn(this.pageIndex, this.objectId, cloneObject(this.newImage));
  }

  async revert(): Promise<void> {
    await this.updateImageFn(this.pageIndex, this.objectId, cloneObject(this.oldImage));
  }
}

/**
 * AdjustImageCommand
 * Modifies an image's opacity, brightness, contrast, and grayscale.
 */
export class AdjustImageCommand implements EditCommand {
  public readonly id = `cmd-adjust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 256;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly oldAdjustments: ImageAdjustments,
    public readonly newAdjustments: ImageAdjustments,
    private readonly setAdjustmentsFn: (
      pageIndex: number,
      objectId: string,
      adj: ImageAdjustments
    ) => Promise<void> | void
  ) {
    this.name = `Adjust image ${objectId} (opacity: ${newAdjustments.opacity}%, brightness: ${newAdjustments.brightness}%)`;
  }

  async apply(): Promise<void> {
    await this.setAdjustmentsFn(this.pageIndex, this.objectId, this.newAdjustments);
  }

  async revert(): Promise<void> {
    await this.setAdjustmentsFn(this.pageIndex, this.objectId, this.oldAdjustments);
  }
}

/**
 * FlipImageCommand
 * Flips an image horizontally or vertically by adjusting its affine transform matrix.
 */
export class FlipImageCommand implements EditCommand {
  public readonly id = `cmd-flip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes = 128;
  public readonly newMatrix: Matrix2D;

  constructor(
    public readonly pageIndex: number,
    public readonly objectId: string,
    public readonly oldMatrix: Matrix2D,
    public readonly direction: 'horizontal' | 'vertical',
    private readonly setMatrixFn: (
      pageIndex: number,
      objectId: string,
      matrix: Matrix2D
    ) => Promise<void> | void
  ) {
    this.name = `Flip image ${objectId} ${direction}`;
    const [a, b, c, d, e, f] = oldMatrix;
    if (direction === 'horizontal') {
      this.newMatrix = [-a, b, -c, d, e, f];
    } else {
      this.newMatrix = [a, -b, c, -d, e, f];
    }
  }

  async apply(): Promise<void> {
    await this.setMatrixFn(this.pageIndex, this.objectId, this.newMatrix);
  }

  async revert(): Promise<void> {
    await this.setMatrixFn(this.pageIndex, this.objectId, this.oldMatrix);
  }
}
