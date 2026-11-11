import { describe, it, expect, beforeEach } from 'vitest';
import { PixelBufferPool } from '../src/buffer-pool';

describe('Task 16.4: PixelBufferPool (buffer reuse & bounded allocations)', () => {
  let pool: PixelBufferPool;

  beforeEach(() => {
    pool = new PixelBufferPool({ maxPoolSize: 3, maxBufferBytes: 1024 * 1024 });
    pool.clear();
  });

  it('acquires and releases buffers correctly', () => {
    const buf1 = pool.acquire(1024);
    expect(buf1).toBeInstanceOf(Uint8ClampedArray);
    expect(buf1.byteLength).toBe(1024);

    const released = pool.release(buf1);
    expect(released).toBe(true);

    const stats = pool.getStats();
    expect(stats.poolSize).toBe(1);
    expect(stats.allocatedCount).toBe(1);

    // Reusing the pooled buffer
    const buf2 = pool.acquire(512);
    expect(buf2).toBe(buf1);
    expect(pool.getStats().reusedCount).toBe(1);
    expect(pool.getStats().poolSize).toBe(0);
  });

  it('respects maxPoolSize constraint', () => {
    const b1 = pool.acquire(100);
    const b2 = pool.acquire(200);
    const b3 = pool.acquire(300);
    const b4 = pool.acquire(400);

    pool.release(b1);
    pool.release(b2);
    pool.release(b3);
    // Pool is full (max 3), releasing smaller buffer b4 should be handled safely
    pool.release(b4);

    expect(pool.getStats().poolSize).toBeLessThanOrEqual(3);
  });

  it('rejects buffers exceeding maxBufferBytes', () => {
    const hugeBuf = new Uint8ClampedArray(2 * 1024 * 1024); // 2 MB > 1 MB limit
    const released = pool.release(hugeBuf);
    expect(released).toBe(false);
    expect(pool.getStats().poolSize).toBe(0);
  });

  it('handles empty buffer acquisition gracefully', () => {
    const empty = pool.acquire(0);
    expect(empty.byteLength).toBe(0);
    expect(pool.release(empty)).toBe(false);
  });
});
