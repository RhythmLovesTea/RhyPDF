/**
 * @rhypdf/edit-core
 * Task 11.13: Alignment and distribution tools.
 * Align: left, center, right, top, middle, bottom.
 * Distribute: horizontally, vertically.
 */

import type { Rect, BasePageObject } from '@rhypdf/pdf-model';
import type { EditCommand } from './types';

export type AlignmentMode =
  | 'left'
  | 'center'
  | 'right'
  | 'top'
  | 'middle'
  | 'bottom';

export type DistributionMode = 'horizontal' | 'vertical';

export interface ObjectBoundsDelta {
  id: string;
  prevBounds: Rect;
  newBounds: Rect;
}

/**
 * Aligns two or more objects to each other (or to targetBounds if provided).
 */
export function alignObjects(
  objects: BasePageObject[],
  mode: AlignmentMode,
  targetBounds?: Rect
): ObjectBoundsDelta[] {
  if (objects.length < 2 && !targetBounds) {
    return [];
  }

  // Calculate enclosing bounds of the group if targetBounds not specified
  const groupBounds: Rect = targetBounds ?? {
    left: Math.min(...objects.map(o => o.bounds.left)),
    bottom: Math.min(...objects.map(o => o.bounds.bottom)),
    right: Math.max(...objects.map(o => o.bounds.right)),
    top: Math.max(...objects.map(o => o.bounds.top))
  };

  const groupCenterX = (groupBounds.left + groupBounds.right) / 2;
  const groupCenterY = (groupBounds.bottom + groupBounds.top) / 2;

  const deltas: ObjectBoundsDelta[] = [];

  for (const obj of objects) {
    const prev = obj.bounds;
    const width = prev.right - prev.left;
    const height = prev.top - prev.bottom;
    let newLeft = prev.left;
    let newBottom = prev.bottom;

    switch (mode) {
      case 'left':
        newLeft = groupBounds.left;
        break;
      case 'center':
        newLeft = groupCenterX - width / 2;
        break;
      case 'right':
        newLeft = groupBounds.right - width;
        break;
      case 'top':
        newBottom = groupBounds.top - height;
        break;
      case 'middle':
        newBottom = groupCenterY - height / 2;
        break;
      case 'bottom':
        newBottom = groupBounds.bottom;
        break;
    }

    const newBounds: Rect = {
      left: newLeft,
      bottom: newBottom,
      right: newLeft + width,
      top: newBottom + height
    };

    deltas.push({
      id: obj.id,
      prevBounds: { ...prev },
      newBounds
    });
  }

  return deltas;
}

/**
 * Evenly distributes 3 or more objects along the horizontal or vertical axis.
 */
export function distributeObjects(
  objects: BasePageObject[],
  axis: DistributionMode
): ObjectBoundsDelta[] {
  if (objects.length < 3) {
    return [];
  }

  const deltas: ObjectBoundsDelta[] = [];

  if (axis === 'horizontal') {
    // Sort left to right
    const sorted = [...objects].sort((a, b) => a.bounds.left - b.bounds.left);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;

    const spanStart = first.bounds.left;
    const spanEnd = last.bounds.right;
    const totalObjectWidth = sorted.reduce((sum, o) => sum + (o.bounds.right - o.bounds.left), 0);
    const totalGap = (spanEnd - spanStart) - totalObjectWidth;
    const gap = totalGap / (sorted.length - 1);

    let currentX = spanStart;
    for (const obj of sorted) {
      const prev = obj.bounds;
      const width = prev.right - prev.left;
      const height = prev.top - prev.bottom;

      const newBounds: Rect = {
        left: currentX,
        bottom: prev.bottom,
        right: currentX + width,
        top: prev.bottom + height
      };

      deltas.push({
        id: obj.id,
        prevBounds: { ...prev },
        newBounds
      });

      currentX += width + gap;
    }
  } else {
    // Sort bottom to top
    const sorted = [...objects].sort((a, b) => a.bounds.bottom - b.bounds.bottom);
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;

    const spanStart = first.bounds.bottom;
    const spanEnd = last.bounds.top;
    const totalObjectHeight = sorted.reduce((sum, o) => sum + (o.bounds.top - o.bounds.bottom), 0);
    const totalGap = (spanEnd - spanStart) - totalObjectHeight;
    const gap = totalGap / (sorted.length - 1);

    let currentY = spanStart;
    for (const obj of sorted) {
      const prev = obj.bounds;
      const width = prev.right - prev.left;
      const height = prev.top - prev.bottom;

      const newBounds: Rect = {
        left: prev.left,
        bottom: currentY,
        right: prev.left + width,
        top: currentY + height
      };

      deltas.push({
        id: obj.id,
        prevBounds: { ...prev },
        newBounds
      });

      currentY += height + gap;
    }
  }

  return deltas;
}

export class AlignObjectsCommand implements EditCommand {
  public readonly id = `cmd-align-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  public readonly name: string;
  public readonly timestamp = Date.now();
  public readonly approximateBytes: number;

  constructor(
    public readonly pageIndex: number,
    public readonly deltas: ObjectBoundsDelta[],
    description: string,
    private readonly applyFn?: (pageIndex: number, deltas: ObjectBoundsDelta[]) => Promise<void> | void,
    private readonly revertFn?: (pageIndex: number, deltas: ObjectBoundsDelta[]) => Promise<void> | void
  ) {
    this.name = description;
    this.approximateBytes = 128 + deltas.length * 64;
  }

  async apply(): Promise<void> {
    if (this.applyFn) {
      await this.applyFn(this.pageIndex, this.deltas);
    }
  }

  async revert(): Promise<void> {
    if (this.revertFn) {
      const inverted = this.deltas.map(d => ({
        id: d.id,
        prevBounds: d.newBounds,
        newBounds: d.prevBounds
      }));
      await this.revertFn(this.pageIndex, inverted);
    }
  }
}
