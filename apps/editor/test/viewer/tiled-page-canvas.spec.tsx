import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { computePageTiles } from '../../src/features/viewer/tile-utils';
import { TiledPageCanvas } from '../../src/features/viewer/TiledPageCanvas';

// Enable React act() environment for happy-dom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.3: Tile-based rendering for high zoom (800% zoom with bounded memory)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('determines high zoom threshold correctly', () => {
    const lowZoom = computePageTiles({
      pageWidthPt: 595,
      pageHeightPt: 842,
      scale: 1.0
    });
    expect(lowZoom.isHighZoom).toBe(false);

    const highZoom = computePageTiles({
      pageWidthPt: 595,
      pageHeightPt: 842,
      scale: 8.0
    });
    expect(highZoom.isHighZoom).toBe(true);
  });

  it('bounds memory at 800% zoom by returning only visible tiles intersecting viewport', () => {
    const pageWidthPt = 595;
    const pageHeightPt = 842;
    const scale = 8.0; // 800% zoom!
    const tileSizePx = 512;

    // Viewport is 800x600 px (standard laptop viewport focused at top-left of page)
    const visibleRect = {
      left: 0,
      top: 0,
      right: 800,
      bottom: 600
    };

    const result = computePageTiles({
      pageWidthPt,
      pageHeightPt,
      scale,
      tileSizePx,
      visibleRect
    });

    // The whole page at 800% has 10 cols x 14 rows = 140 tiles
    expect(result.totalCols).toBe(10);
    expect(result.totalRows).toBe(14);

    // But ONLY tiles intersecting 800x600 viewport are returned:
    // col 0 (0..512), col 1 (512..1024) and row 0 (0..512), row 1 (512..1024) = 4 tiles!
    expect(result.tiles.length).toBe(4);

    // Verify clipRect coordinate bounds in PDF points for tile (0, 0)
    const tile0 = result.tiles[0];
    expect(tile0).toBeDefined();
    if (tile0) {
      expect(tile0.clipRect.left).toBe(0);
      expect(tile0.clipRect.right).toBeCloseTo(595 / 10, 1);
      expect(tile0.clipRect.top).toBe(842);
      expect(tile0.clipRect.bottom).toBeCloseTo(842 - 842 / 14, 1);
    }
  });

  it('renders single canvas at standard zoom and tiled overlay at 800% zoom', () => {
    // 1) Standard zoom
    act(() => {
      root.render(<TiledPageCanvas pageNumber={1} width={595} height={842} scale={1.0} />);
    });

    expect(container.querySelector('[data-testid="page-canvas-container-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tiled-page-container-1"]')).toBeNull();

    // 2) 800% high zoom with visible viewport
    act(() => {
      root.render(
        <TiledPageCanvas
          pageNumber={1}
          width={595}
          height={842}
          scale={8.0}
          visibleRect={{ left: 0, top: 0, right: 600, bottom: 600 }}
        />
      );
    });

    const tiledContainer = container.querySelector(
      '[data-testid="tiled-page-container-1"]'
    ) as HTMLElement;
    expect(tiledContainer).not.toBeNull();
    expect(tiledContainer.getAttribute('data-is-high-zoom')).toBe('true');

    // Number of mounted tiles is strictly bounded to the visible window (4 tiles)
    const mountedTiles = container.querySelectorAll('[data-tile-key]');
    expect(mountedTiles.length).toBe(4);
  });
});
