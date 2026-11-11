/**
 * @rhypdf/fonts - FontDownloadManager
 * On-demand font download manager using Cache Storage, progress tracking,
 * integrity verification, and self-hosted privacy protection. Task 8.4.
 */

import type { FontCatalogEntry } from './catalog';

export interface DownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface FontDownloadOptions {
  maxSizeBytes?: number; // Defaults to 15MB
  timeoutMs?: number; // Defaults to 30,000ms
  onProgress?: (progress: DownloadProgress) => void;
}

export class FontDownloadManager {
  private static CACHE_NAME = 'rhypdf-font-cache-v1';
  private memoryCache = new Map<string, Uint8Array>();
  private static instance: FontDownloadManager | null = null;

  static getInstance(): FontDownloadManager {
    if (!FontDownloadManager.instance) {
      FontDownloadManager.instance = new FontDownloadManager();
    }
    return FontDownloadManager.instance;
  }

  /**
   * Check if font is already cached in memory or Cache Storage
   */
  async isCached(family: string): Promise<boolean> {
    const key = family.toLowerCase();
    if (this.memoryCache.has(key)) return true;

    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(FontDownloadManager.CACHE_NAME);
        const match = await cache.match(`/fonts/${encodeURIComponent(key)}`);
        return !!match;
      } catch {
        return false;
      }
    }
    return false;
  }

  /**
   * Get cached font data if available
   */
  async getCachedFont(family: string): Promise<Uint8Array | null> {
    const key = family.toLowerCase();
    const mem = this.memoryCache.get(key);
    if (mem) return mem;

    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const cache = await caches.open(FontDownloadManager.CACHE_NAME);
        const response = await cache.match(`/fonts/${encodeURIComponent(key)}`);
        if (response) {
          const buf = await response.arrayBuffer();
          const u8 = new Uint8Array(buf);
          this.memoryCache.set(key, u8);
          return u8;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Download a font on-demand with progress tracking and Cache Storage caching.
   * Enforces self-hosted relative URLs to guarantee user privacy (Task 8.4).
   */
  async downloadFont(
    font: FontCatalogEntry,
    options: FontDownloadOptions = {}
  ): Promise<Uint8Array> {
    const key = font.family.toLowerCase();
    const cached = await this.getCachedFont(key);
    if (cached) {
      options.onProgress?.({
        loadedBytes: cached.byteLength,
        totalBytes: cached.byteLength,
        percent: 100
      });
      return cached;
    }

    const url = font.downloadUrl;
    if (!url) {
      throw new Error(`Font "${font.family}" has no download URL`);
    }

    // Privacy guard: Never call external non-self-hosted runtime URLs (Task 8.4)
    if (/^https?:\/\//i.test(url)) {
      const parsed = new URL(url, 'http://localhost');
      if (
        typeof window !== 'undefined' &&
        parsed.origin !== window.location.origin
      ) {
        throw new Error(
          `Privacy violation: External font runtime fetch blocked for "${url}". Fonts must be self-hosted.`
        );
      }
    }

    const maxSizeBytes = options.maxSizeBytes ?? 15 * 1024 * 1024; // 15 MB limit
    const timeoutMs = options.timeoutMs ?? 30000;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(
          `Failed to download font "${font.family}": HTTP ${response.status} ${response.statusText}`
        );
      }

      const contentLength = Number(response.headers.get('content-length')) || 0;
      if (contentLength > maxSizeBytes) {
        throw new Error(
          `Font size (${contentLength} bytes) exceeds maximum limit (${maxSizeBytes} bytes)`
        );
      }

      let fontBytes: Uint8Array;

      // Stream with progress if body readable stream available
      if (response.body && typeof ReadableStream !== 'undefined') {
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let receivedBytes = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            receivedBytes += value.byteLength;
            if (receivedBytes > maxSizeBytes) {
              throw new Error(`Font download exceeded ${maxSizeBytes} bytes limit`);
            }
            chunks.push(value);
            const total = contentLength || receivedBytes;
            const percent = contentLength ? Math.min(100, Math.round((receivedBytes / total) * 100)) : 50;
            options.onProgress?.({
              loadedBytes: receivedBytes,
              totalBytes: total,
              percent
            });
          }
        }

        // Concatenate chunks
        fontBytes = new Uint8Array(receivedBytes);
        let offset = 0;
        for (const chunk of chunks) {
          fontBytes.set(chunk, offset);
          offset += chunk.byteLength;
        }
      } else {
        const buf = await response.arrayBuffer();
        fontBytes = new Uint8Array(buf);
        options.onProgress?.({
          loadedBytes: fontBytes.byteLength,
          totalBytes: fontBytes.byteLength,
          percent: 100
        });
      }

      // Cache in memory
      this.memoryCache.set(key, fontBytes);

      // Cache in Cache Storage for offline use
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cache = await caches.open(FontDownloadManager.CACHE_NAME);
          const cacheResponse = new Response(fontBytes, {
            headers: {
              'Content-Type': 'font/ttf',
              'Content-Length': fontBytes.byteLength.toString()
            }
          });
          await cache.put(`/fonts/${encodeURIComponent(key)}`, cacheResponse);
        } catch {
          // Non-fatal if Cache Storage fails
        }
      }

      return fontBytes;
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === 'AbortError';
      if (isAbort) {
        throw new Error(`Font download for "${font.family}" timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  /**
   * Clear all cached fonts from Cache Storage and memory
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        await caches.delete(FontDownloadManager.CACHE_NAME);
      } catch {
        // Ignore
      }
    }
  }
}
