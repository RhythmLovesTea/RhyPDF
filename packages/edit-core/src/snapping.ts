import type { PageObject, Rect } from '@rhypdf/pdf-model';
import type { SnapGuide, SnapResult } from './types';

export interface SnapOptions {
  enabled?: boolean;
  snapThresholdPt?: number;
  snapToPageCenter?: boolean;
  snapToMargins?: boolean;
  snapToObjects?: boolean;
  marginPt?: number;
}

export function calculateSnap(
  movingBounds: Rect,
  pageSize: { width: number; height: number },
  siblingObjects: PageObject[] = [],
  options: SnapOptions = {}
): SnapResult {
  const {
    enabled = true,
    snapThresholdPt = 5,
    snapToPageCenter = true,
    snapToMargins = true,
    snapToObjects = true,
    marginPt = 36
  } = options;

  if (!enabled) {
    return {
      x: movingBounds.left,
      y: movingBounds.bottom,
      snappedX: false,
      snappedY: false,
      guides: []
    };
  }

  const width = movingBounds.right - movingBounds.left;
  const height = movingBounds.top - movingBounds.bottom;

  let bestDeltaX = 0;
  let minDiffX = snapThresholdPt + 1;
  let snapGuideX: SnapGuide | null = null;

  let bestDeltaY = 0;
  let minDiffY = snapThresholdPt + 1;
  let snapGuideY: SnapGuide | null = null;

  // X-axis snap targets (vertical guide lines)
  const xTargets: Array<{ pos: number; source: SnapGuide['source']; label?: string }> = [];

  if (snapToPageCenter) {
    xTargets.push({ pos: pageSize.width / 2, source: 'page-center', label: 'Center' });
  }

  if (snapToMargins) {
    xTargets.push({ pos: marginPt, source: 'margin', label: 'Margin' });
    xTargets.push({ pos: pageSize.width - marginPt, source: 'margin', label: 'Margin' });
  }

  if (snapToObjects) {
    for (const obj of siblingObjects) {
      if (!obj.bounds) continue;
      xTargets.push({ pos: obj.bounds.left, source: 'object-edge' });
      xTargets.push({ pos: obj.bounds.right, source: 'object-edge' });
      xTargets.push({
        pos: (obj.bounds.left + obj.bounds.right) / 2,
        source: 'object-center'
      });
    }
  }

  // Points of moving bounds to test: left, center, right
  const movingXPoints = [
    { pos: movingBounds.left, offsetFromLeft: 0 },
    { pos: movingBounds.left + width / 2, offsetFromLeft: width / 2 },
    { pos: movingBounds.right, offsetFromLeft: width }
  ];

  for (const moving of movingXPoints) {
    for (const target of xTargets) {
      const diff = Math.abs(moving.pos - target.pos);
      if (diff <= snapThresholdPt && diff < minDiffX) {
        minDiffX = diff;
        bestDeltaX = target.pos - moving.pos;
        snapGuideX = {
          type: 'vertical',
          position: target.pos,
          source: target.source,
          label: target.label
        };
      }
    }
  }

  // Y-axis snap targets (horizontal guide lines)
  const yTargets: Array<{ pos: number; source: SnapGuide['source']; label?: string }> = [];

  if (snapToPageCenter) {
    yTargets.push({ pos: pageSize.height / 2, source: 'page-center', label: 'Center' });
  }

  if (snapToMargins) {
    yTargets.push({ pos: marginPt, source: 'margin', label: 'Margin' });
    yTargets.push({ pos: pageSize.height - marginPt, source: 'margin', label: 'Margin' });
  }

  if (snapToObjects) {
    for (const obj of siblingObjects) {
      if (!obj.bounds) continue;
      yTargets.push({ pos: obj.bounds.bottom, source: 'object-edge' });
      yTargets.push({ pos: obj.bounds.top, source: 'object-edge' });
      yTargets.push({
        pos: (obj.bounds.bottom + obj.bounds.top) / 2,
        source: 'object-center'
      });
    }
  }

  // Points of moving bounds to test: bottom, center, top
  const movingYPoints = [
    { pos: movingBounds.bottom, offsetFromBottom: 0 },
    { pos: movingBounds.bottom + height / 2, offsetFromBottom: height / 2 },
    { pos: movingBounds.top, offsetFromBottom: height }
  ];

  for (const moving of movingYPoints) {
    for (const target of yTargets) {
      const diff = Math.abs(moving.pos - target.pos);
      if (diff <= snapThresholdPt && diff < minDiffY) {
        minDiffY = diff;
        bestDeltaY = target.pos - moving.pos;
        snapGuideY = {
          type: 'horizontal',
          position: target.pos,
          source: target.source,
          label: target.label
        };
      }
    }
  }

  const guides: SnapGuide[] = [];
  if (snapGuideX) guides.push(snapGuideX);
  if (snapGuideY) guides.push(snapGuideY);

  return {
    x: movingBounds.left + bestDeltaX,
    y: movingBounds.bottom + bestDeltaY,
    snappedX: snapGuideX !== null,
    snappedY: snapGuideY !== null,
    guides
  };
}
