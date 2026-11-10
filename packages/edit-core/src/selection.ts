import type { PageObject, Rect } from '@rhypdf/pdf-model';

/**
 * Computes the union bounding box enclosing all selected objects.
 */
export function computeSelectionBounds(
  objects: PageObject[],
  selectedIds: string[]
): Rect | undefined {
  if (selectedIds.length === 0) return undefined;

  const idSet = new Set(selectedIds);
  const selectedObjects = objects.filter((o) => idSet.has(o.id) && o.bounds);

  if (selectedObjects.length === 0) return undefined;

  let left = Infinity;
  let bottom = Infinity;
  let right = -Infinity;
  let top = -Infinity;

  for (const obj of selectedObjects) {
    if (!obj.bounds) continue;
    left = Math.min(left, obj.bounds.left);
    bottom = Math.min(bottom, obj.bounds.bottom);
    right = Math.max(right, obj.bounds.right);
    top = Math.max(top, obj.bounds.top);
  }

  if (left === Infinity) return undefined;

  return { left, bottom, right, top };
}

/**
 * Checks if two rectangles intersect.
 */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return !(a.right < b.left || a.left > b.right || a.top < b.bottom || a.bottom > b.top);
}

/**
 * Checks if rect 'a' completely contains rect 'b'.
 */
export function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.left >= outer.left &&
    inner.right <= outer.right &&
    inner.bottom >= outer.bottom &&
    inner.top <= outer.top
  );
}

/**
 * Finds all objects matching a marquee selection rectangle in PDF space.
 */
export function marqueeSelect(
  objects: PageObject[],
  marqueeRectPdf: Rect,
  mode: 'intersect' | 'contain' = 'intersect'
): string[] {
  const result: string[] = [];

  for (const obj of objects) {
    if (!obj.bounds) continue;
    const match =
      mode === 'contain'
        ? rectContains(marqueeRectPdf, obj.bounds)
        : rectsIntersect(marqueeRectPdf, obj.bounds);

    if (match) {
      result.push(obj.id);
    }
  }

  return result;
}

/**
 * Toggles an ID in the selection list (for Shift-click).
 */
export function toggleSelectedId(currentIds: string[], id: string): string[] {
  if (currentIds.includes(id)) {
    return currentIds.filter((item) => item !== id);
  }
  return [...currentIds, id];
}
