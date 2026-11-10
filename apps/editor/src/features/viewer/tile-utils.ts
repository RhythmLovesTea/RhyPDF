import type { Rect } from '@rhypdf/pdf-model';

export interface PageTile {
  key: string;
  col: number;
  row: number;
  clipRect: Rect; // in PDF points
  cssBounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

export interface TileGridOptions {
  pageWidthPt: number;
  pageHeightPt: number;
  rotation?: 0 | 90 | 180 | 270;
  scale: number;
  tileSizePx?: number; // default 512px CSS
  visibleRect?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

/**
 * Computes grid of tiles for high-zoom rendering.
 * When visibleRect is provided, returns ONLY tiles that intersect the visible viewport.
 */
export function computePageTiles(options: TileGridOptions): {
  tiles: PageTile[];
  totalCols: number;
  totalRows: number;
  isHighZoom: boolean;
} {
  const { pageWidthPt, pageHeightPt, rotation = 0, scale, tileSizePx = 512, visibleRect } = options;

  // High zoom threshold: scale > 2.0 (200%)
  const isHighZoom = scale > 2.0;

  const isSideways = rotation === 90 || rotation === 270;
  const effW = isSideways ? pageHeightPt : pageWidthPt;
  const effH = isSideways ? pageWidthPt : pageHeightPt;

  const totalCssWidth = effW * scale;
  const totalCssHeight = effH * scale;

  const cols = Math.max(1, Math.ceil(totalCssWidth / tileSizePx));
  const rows = Math.max(1, Math.ceil(totalCssHeight / tileSizePx));

  const tiles: PageTile[] = [];

  // Tile size in PDF points
  const tileWPt = pageWidthPt / cols;
  const tileHPt = pageHeightPt / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tileCssLeft = c * tileSizePx;
      const tileCssTop = r * tileSizePx;
      const tileCssW = Math.min(tileSizePx, totalCssWidth - tileCssLeft);
      const tileCssH = Math.min(tileSizePx, totalCssHeight - tileCssTop);

      // Check visibility intersection if visibleRect is specified
      if (visibleRect) {
        const intersects =
          tileCssLeft < visibleRect.right &&
          tileCssLeft + tileCssW > visibleRect.left &&
          tileCssTop < visibleRect.bottom &&
          tileCssTop + tileCssH > visibleRect.top;

        if (!intersects) {
          continue; // Skip off-screen tiles to bound memory
        }
      }

      // Compute PDF clipRect (PDF points: origin at bottom-left, Y going up)
      const pdfLeft = c * tileWPt;
      const pdfRight = Math.min(pageWidthPt, (c + 1) * tileWPt);
      const pdfBottom = Math.max(0, pageHeightPt - (r + 1) * tileHPt);
      const pdfTop = pageHeightPt - r * tileHPt;

      tiles.push({
        key: `tile-${c}-${r}`,
        col: c,
        row: r,
        clipRect: {
          left: pdfLeft,
          bottom: pdfBottom,
          right: pdfRight,
          top: pdfTop
        },
        cssBounds: {
          left: tileCssLeft,
          top: tileCssTop,
          width: tileCssW,
          height: tileCssH
        }
      });
    }
  }

  return {
    tiles,
    totalCols: cols,
    totalRows: rows,
    isHighZoom
  };
}
