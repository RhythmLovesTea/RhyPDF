import type { PageObject, Point, Rect } from '@rhypdf/pdf-model';
import type { HitTestResult } from './types';

/**
 * Checks if a point in PDF points is inside a Rect with optional tolerance in points.
 */
export function isPointInRect(point: Point, rect: Rect, tolerancePt = 4): boolean {
  return (
    point.x >= rect.left - tolerancePt &&
    point.x <= rect.right + tolerancePt &&
    point.y >= rect.bottom - tolerancePt &&
    point.y <= rect.top + tolerancePt
  );
}

/**
 * Hit tests page objects against a point in PDF points.
 * Returns the topmost object and all candidates ordered from topmost to bottommost (descending zIndex).
 */
export function hitTestObjects(
  objects: PageObject[],
  pointPdf: Point,
  tolerancePt = 4
): HitTestResult {
  const matches: PageObject[] = [];

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (obj && obj.bounds && isPointInRect(pointPdf, obj.bounds, tolerancePt)) {
      matches.push(obj);
    }
  }

  // Sort descending by zIndex (higher zIndex = on top)
  matches.sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));

  return {
    topmost: matches[0],
    candidates: matches
  };
}

/**
 * Cycles through overlapping candidate objects.
 * When Alt-clicking or long-pressing, this returns the next object in the overlapping stack.
 */
export function cycleHitTest(
  candidates: PageObject[],
  currentSelectedId?: string
): PageObject | undefined {
  if (candidates.length === 0) return undefined;
  if (!currentSelectedId) return candidates[0];

  const currentIndex = candidates.findIndex((obj) => obj.id === currentSelectedId);
  if (currentIndex === -1) {
    return candidates[0];
  }

  const nextIndex = (currentIndex + 1) % candidates.length;
  return candidates[nextIndex];
}
