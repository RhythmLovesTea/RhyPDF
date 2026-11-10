import { describe, it, expect, vi } from 'vitest';
import { BitmapLruCache, getDefaultMemoryBudget } from '../../src/features/viewer/BitmapLruCache';

function createMockBitmap(width: number, height: number): ImageBitmap {
  return {
    width,
    height,
    close: vi.fn()
  } as unknown as ImageBitmap;
}

describe('Task 3.5: Bitmap LRU cache with memory budget and ImageBitmap.close() eviction', () => {
  it('calculates adaptive memory budget based on deviceMemory', () => {
    // Default fallback when deviceMemory is undefined
    const budget = getDefaultMemoryBudget();
    expect(budget).toBeGreaterThanOrEqual(64 * 1024 * 1024);
    expect(budget).toBeLessThanOrEqual(256 * 1024 * 1024);
  });

  it('evicts least recently used items when memory budget is exceeded and calls ImageBitmap.close()', () => {
    // 10x10 bitmap = 10 * 10 * 4 = 400 bytes
    // Set budget to 900 bytes (fits exactly 2 bitmaps of 400 bytes)
    const onEvictSpy = vi.fn();
    const cache = new BitmapLruCache({
      maxSizeBytes: 900,
      onEvict: onEvictSpy
    });

    const bitmap1 = createMockBitmap(10, 10);
    const bitmap2 = createMockBitmap(10, 10);
    const bitmap3 = createMockBitmap(10, 10);

    cache.put('page-1', bitmap1);
    cache.put('page-2', bitmap2);

    expect(cache.getStats().count).toBe(2);
    expect(cache.getStats().currentSizeBytes).toBe(800);
    expect(bitmap1.close).not.toHaveBeenCalled();

    // Inserting 3rd bitmap exceeds 900 bytes budget (800 + 400 = 1200 > 900)
    // Oldest item 'page-1' must be evicted!
    cache.put('page-3', bitmap3);

    expect(cache.getStats().count).toBe(2);
    expect(cache.has('page-1')).toBe(false);
    expect(cache.has('page-2')).toBe(true);
    expect(cache.has('page-3')).toBe(true);

    // ImageBitmap.close() MUST have been called on evicted bitmap1!
    expect(bitmap1.close).toHaveBeenCalledTimes(1);
    expect(onEvictSpy).toHaveBeenCalledWith('page-1', bitmap1);
  });

  it('refreshes LRU priority on get() so recently read item is not evicted', () => {
    const cache = new BitmapLruCache({ maxSizeBytes: 900 });

    const bitmap1 = createMockBitmap(10, 10);
    const bitmap2 = createMockBitmap(10, 10);
    const bitmap3 = createMockBitmap(10, 10);

    cache.put('page-1', bitmap1);
    cache.put('page-2', bitmap2);

    // Access page-1: page-1 is now MRU, page-2 is LRU!
    const retrieved = cache.get('page-1');
    expect(retrieved).toBe(bitmap1);

    // Insert page-3: page-2 should be evicted, page-1 should remain!
    cache.put('page-3', bitmap3);

    expect(cache.has('page-1')).toBe(true);
    expect(cache.has('page-2')).toBe(false);
    expect(cache.has('page-3')).toBe(true);

    expect(bitmap2.close).toHaveBeenCalledTimes(1);
    expect(bitmap1.close).not.toHaveBeenCalled();
  });

  it('clear() closes all cached bitmaps and resets byte size to 0', () => {
    const cache = new BitmapLruCache({ maxSizeBytes: 2000 });
    const bitmap1 = createMockBitmap(10, 10);
    const bitmap2 = createMockBitmap(10, 10);

    cache.put('page-1', bitmap1);
    cache.put('page-2', bitmap2);

    expect(cache.getStats().count).toBe(2);

    cache.clear();

    expect(cache.getStats().count).toBe(0);
    expect(cache.getStats().currentSizeBytes).toBe(0);
    expect(bitmap1.close).toHaveBeenCalledTimes(1);
    expect(bitmap2.close).toHaveBeenCalledTimes(1);
  });
});
