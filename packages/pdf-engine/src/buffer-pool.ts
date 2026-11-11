/**
 * @rhypdf/pdf-engine
 * Task 16.4: Pixel Buffer Pool for reusable render buffers.
 * Avoids repeated large typed-array allocations during scrolling and continuous zoom.
 */

export interface BufferPoolOptions {
  maxPoolSize?: number; // Maximum number of buffers to retain in the pool (default 4)
  maxBufferBytes?: number; // Maximum bytes per pooled buffer (default 32 MB)
}

export class PixelBufferPool {
  private static instance: PixelBufferPool | null = null;
  private pool: Uint8ClampedArray[] = [];
  private maxPoolSize: number;
  private maxBufferBytes: number;
  private allocatedCount = 0;
  private reusedCount = 0;

  constructor(options?: BufferPoolOptions) {
    this.maxPoolSize = options?.maxPoolSize ?? 4;
    this.maxBufferBytes = options?.maxBufferBytes ?? 32 * 1024 * 1024; // 32 MB
  }

  static getInstance(): PixelBufferPool {
    if (!PixelBufferPool.instance) {
      PixelBufferPool.instance = new PixelBufferPool();
    }
    return PixelBufferPool.instance;
  }

  /**
   * Acquire a Uint8ClampedArray of at least the requested byteLength.
   * If a suitable pooled buffer is available, reuses it; otherwise allocates a new one.
   */
  acquire(byteLength: number): Uint8ClampedArray {
    if (byteLength <= 0) {
      return new Uint8ClampedArray(0);
    }

    // Find smallest available buffer that is >= byteLength
    let bestIndex = -1;
    let minExcess = Infinity;

    for (let i = 0; i < this.pool.length; i++) {
      const buf = this.pool[i]!;
      if (buf.byteLength >= byteLength) {
        const excess = buf.byteLength - byteLength;
        if (excess < minExcess) {
          minExcess = excess;
          bestIndex = i;
        }
      }
    }

    if (bestIndex !== -1) {
      const [reused] = this.pool.splice(bestIndex, 1);
      this.reusedCount++;
      return reused!;
    }

    this.allocatedCount++;
    return new Uint8ClampedArray(byteLength);
  }

  /**
   * Return a buffer to the pool for reuse if it fits pool constraints.
   */
  release(buffer: Uint8ClampedArray): boolean {
    if (!buffer || buffer.byteLength === 0 || buffer.byteLength > this.maxBufferBytes) {
      return false;
    }

    if (this.pool.length >= this.maxPoolSize) {
      // Evict smallest buffer if pool is full and new buffer is larger
      const minBuffer = this.pool.reduce(
        (min, b) => (b.byteLength < min.byteLength ? b : min),
        this.pool[0]!
      );
      if (buffer.byteLength > minBuffer.byteLength) {
        const idx = this.pool.indexOf(minBuffer);
        this.pool.splice(idx, 1);
        this.pool.push(buffer);
        return true;
      }
      return false;
    }

    this.pool.push(buffer);
    return true;
  }

  clear(): void {
    this.pool = [];
  }

  getStats(): {
    poolSize: number;
    allocatedCount: number;
    reusedCount: number;
    totalPooledBytes: number;
  } {
    const totalPooledBytes = this.pool.reduce((sum, b) => sum + b.byteLength, 0);
    return {
      poolSize: this.pool.length,
      allocatedCount: this.allocatedCount,
      reusedCount: this.reusedCount,
      totalPooledBytes
    };
  }
}
