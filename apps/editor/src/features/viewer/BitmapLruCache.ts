export interface BitmapCacheOptions {
  maxSizeBytes?: number;
  onEvict?: (key: string, bitmap: ImageBitmap) => void;
}

export interface BitmapCacheStats {
  count: number;
  currentSizeBytes: number;
  maxSizeBytes: number;
  hits: number;
  misses: number;
}

/**
 * Calculates adaptive memory budget based on navigator.deviceMemory when available.
 */
export function getDefaultMemoryBudget(): number {
  if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    const memoryGb = (navigator as unknown as { deviceMemory: number }).deviceMemory;
    if (memoryGb <= 2) {
      return 64 * 1024 * 1024; // 64 MB on low-memory mobile/devices
    }
    if (memoryGb <= 4) {
      return 128 * 1024 * 1024; // 128 MB on mid-range devices
    }
    return 256 * 1024 * 1024; // 256 MB on high-spec desktops
  }
  // Default fallback: 96 MB
  return 96 * 1024 * 1024;
}

interface CacheEntry {
  key: string;
  bitmap: ImageBitmap;
  byteSize: number;
}

export class BitmapLruCache {
  private cache = new Map<string, CacheEntry>();
  private maxSizeBytes: number;
  private currentSizeBytes = 0;
  private onEvict?: (key: string, bitmap: ImageBitmap) => void;
  private hits = 0;
  private misses = 0;

  constructor(options?: BitmapCacheOptions) {
    this.maxSizeBytes = options?.maxSizeBytes ?? getDefaultMemoryBudget();
    this.onEvict = options?.onEvict;
  }

  /**
   * Estimate byte size of an ImageBitmap (RGBA 4 bytes per pixel)
   */
  static estimateByteSize(bitmap: ImageBitmap): number {
    return Math.max(1, Math.round(bitmap.width * bitmap.height * 4));
  }

  get(key: string): ImageBitmap | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    this.hits++;
    // Re-insert to mark as most recently used (LRU in JS Map)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.bitmap;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  put(key: string, bitmap: ImageBitmap, customBytes?: number): void {
    const byteSize = customBytes ?? BitmapLruCache.estimateByteSize(bitmap);

    // If key already exists, close old bitmap first
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict least recently used entries if adding this item exceeds budget
    while (this.currentSizeBytes + byteSize > this.maxSizeBytes && this.cache.size > 0) {
      const oldestKey = this.cache.keys().next().value;
      if (!oldestKey) break;
      this.delete(oldestKey);
    }

    this.cache.set(key, { key, bitmap, byteSize });
    this.currentSizeBytes += byteSize;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.cache.delete(key);
    this.currentSizeBytes -= entry.byteSize;

    // Strict requirement: Always call ImageBitmap.close() on eviction to prevent GPU/memory leaks
    if (typeof entry.bitmap?.close === 'function') {
      try {
        entry.bitmap.close();
      } catch (err) {
        console.warn(`Failed to close ImageBitmap for key ${key}:`, err);
      }
    }

    if (this.onEvict) {
      this.onEvict(key, entry.bitmap);
    }

    return true;
  }

  clear(): void {
    for (const [, entry] of this.cache) {
      if (typeof entry.bitmap?.close === 'function') {
        try {
          entry.bitmap.close();
        } catch {
          // ignore
        }
      }
      if (this.onEvict) {
        this.onEvict(entry.key, entry.bitmap);
      }
    }
    this.cache.clear();
    this.currentSizeBytes = 0;
  }

  getStats(): BitmapCacheStats {
    return {
      count: this.cache.size,
      currentSizeBytes: this.currentSizeBytes,
      maxSizeBytes: this.maxSizeBytes,
      hits: this.hits,
      misses: this.misses
    };
  }
}
