/**
 * @rhypdf/editor
 * Task 16.3: Memory Management & Graceful Degradation Controller.
 * Ensures 500-page & 200 MB PDFs stay within memory budgets without OOM on 4 GB devices.
 * Gracefully lowers render scale (DPR) and aggressively evicts caches under memory pressure.
 */

import type { BitmapLruCache } from './BitmapLruCache';

export type DegradationTier = 'normal' | 'moderate' | 'critical';

export interface MemoryEnvironmentInfo {
  deviceMemoryGb?: number; // navigator.deviceMemory
  hardwareConcurrency?: number;
  jsHeapUsedBytes?: number;
}

export interface MemoryThresholds {
  moderateHeapBytes: number; // default: 100 MB
  criticalHeapBytes: number; // default: 150 MB
  moderatePageCount: number; // default: 200 pages
  criticalPageCount: number; // default: 500 pages
}

export const DEFAULT_MEMORY_THRESHOLDS: MemoryThresholds = {
  moderateHeapBytes: 100 * 1024 * 1024,
  criticalHeapBytes: 150 * 1024 * 1024,
  moderatePageCount: 200,
  criticalPageCount: 500
};

export class MemoryDegradationController {
  private thresholds: MemoryThresholds;
  private currentTier: DegradationTier = 'normal';
  private currentHeapBytes = 0;
  private currentPageCount = 1;
  private deviceMemoryGb = 8;
  private onTierChange?: (tier: DegradationTier) => void;

  constructor(
    thresholds?: Partial<MemoryThresholds>,
    onTierChange?: (tier: DegradationTier) => void
  ) {
    this.thresholds = { ...DEFAULT_MEMORY_THRESHOLDS, ...thresholds };
    this.onTierChange = onTierChange;
    this.detectDeviceMemory();
    this.reevaluateTier();
  }

  private detectDeviceMemory(): void {
    if (typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
      const mem = (navigator as unknown as { deviceMemory: number }).deviceMemory;
      if (typeof mem === 'number' && mem > 0) {
        this.deviceMemoryGb = mem;
      }
    }
  }

  setDeviceMemoryGb(gb: number): void {
    this.deviceMemoryGb = gb;
    this.reevaluateTier();
  }

  updateMetrics(metrics: { heapBytes?: number; pageCount?: number }): void {
    if (metrics.heapBytes !== undefined) {
      this.currentHeapBytes = metrics.heapBytes;
    }
    if (metrics.pageCount !== undefined) {
      this.currentPageCount = metrics.pageCount;
    }
    this.reevaluateTier();
  }

  private reevaluateTier(): void {
    let nextTier: DegradationTier = 'normal';

    // 1. Critical tier: 2GB device, > 500 pages, or heap > critical threshold
    if (
      this.deviceMemoryGb <= 2 ||
      this.currentPageCount >= this.thresholds.criticalPageCount ||
      this.currentHeapBytes >= this.thresholds.criticalHeapBytes
    ) {
      nextTier = 'critical';
    }
    // 2. Moderate tier: 4GB device, > 200 pages, or heap > moderate threshold
    else if (
      this.deviceMemoryGb <= 4 ||
      this.currentPageCount >= this.thresholds.moderatePageCount ||
      this.currentHeapBytes >= this.thresholds.moderateHeapBytes
    ) {
      nextTier = 'moderate';
    }

    if (nextTier !== this.currentTier) {
      this.currentTier = nextTier;
      if (this.onTierChange) {
        this.onTierChange(nextTier);
      }
    }
  }

  getTier(): DegradationTier {
    return this.currentTier;
  }

  /**
   * Adaptive DPR based on memory degradation tier.
   * Normal: devicePixelRatio (capped at 2.0)
   * Moderate: 1.25x
   * Critical: 1.0x
   */
  getAdaptiveDpr(requestedDpr?: number): number {
    const baseDpr =
      requestedDpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

    switch (this.currentTier) {
      case 'critical':
        return 1.0;
      case 'moderate':
        return Math.min(baseDpr, 1.25);
      case 'normal':
      default:
        return Math.min(baseDpr, 2.0);
    }
  }

  /**
   * Adaptive LRU cache size limit based on memory tier.
   */
  getAdaptiveCacheBudgetBytes(): number {
    switch (this.currentTier) {
      case 'critical':
        return 32 * 1024 * 1024; // 32 MB
      case 'moderate':
        return 64 * 1024 * 1024; // 64 MB
      case 'normal':
      default:
        return 128 * 1024 * 1024; // 128 MB
    }
  }

  /**
   * Applies aggressive cache trimming when under memory pressure.
   * Evicts non-visible pages from BitmapLruCache.
   */
  trimCache(cache: BitmapLruCache, visiblePageKeys: Set<string>): number {
    if (this.currentTier === 'normal') {
      return 0;
    }

    let evictedCount = 0;
    const stats = cache.getStats();

    // If moderate or critical, clear keys not currently visible
    if (stats.count > 0) {
      // Access keys from cache if available or clear entries exceeding target budget
      const targetBudget = this.getAdaptiveCacheBudgetBytes();
      if (stats.currentSizeBytes > targetBudget) {
        // Clear off-screen pages
        for (let p = 0; p < this.currentPageCount; p++) {
          const key = `page_${p}`;
          if (!visiblePageKeys.has(key) && cache.has(key)) {
            cache.delete(key);
            evictedCount++;
          }
        }
      }
    }

    return evictedCount;
  }
}
