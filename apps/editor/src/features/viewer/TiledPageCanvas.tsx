import React, { useMemo } from 'react';
import type { Rect } from '@rhypdf/pdf-model';
import { PageCanvas } from './PageCanvas';
import { computePageTiles, PageTile } from './tile-utils';

export interface TiledPageCanvasProps {
  pageNumber: number;
  width: number; // PDF points
  height: number; // PDF points
  rotation?: 0 | 90 | 180 | 270;
  scale: number;
  dpr?: number;
  visibleRect?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  baseBitmap?: ImageBitmap | null;
  tileBitmaps?: Map<string, ImageBitmap>;
  isLoadingTiles?: boolean;
  theme?: 'light' | 'dark';
  children?: React.ReactNode;
  onTileNeeded?: (tile: PageTile, clipRect: Rect, scale: number) => void;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export const TiledPageCanvas: React.FC<TiledPageCanvasProps> = ({
  pageNumber,
  width,
  height,
  rotation = 0,
  scale,
  dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  visibleRect,
  baseBitmap,
  tileBitmaps,
  isLoadingTiles = false,
  theme = 'light',
  children,
  onTileNeeded,
  onClick
}) => {
  const { tiles, isHighZoom } = useMemo(() => {
    return computePageTiles({
      pageWidthPt: width,
      pageHeightPt: height,
      rotation,
      scale,
      tileSizePx: 512,
      visibleRect
    });
  }, [width, height, rotation, scale, visibleRect]);

  // Request any visible tiles that are not yet rendered in tileBitmaps
  React.useEffect(() => {
    if (!isHighZoom || !onTileNeeded) return;
    for (const tile of tiles) {
      if (!tileBitmaps?.has(tile.key)) {
        onTileNeeded(tile, tile.clipRect, scale);
      }
    }
  }, [isHighZoom, tiles, tileBitmaps, onTileNeeded, scale]);

  // If standard zoom (<= 200%), render single PageCanvas
  if (!isHighZoom) {
    return (
      <PageCanvas
        pageNumber={pageNumber}
        width={width}
        height={height}
        rotation={rotation}
        scale={scale}
        dpr={dpr}
        bitmap={baseBitmap}
        isLoading={!baseBitmap}
        theme={theme}
      >
        {children}
      </PageCanvas>
    );
  }

  // Sideways rotation handling
  const isSideways = rotation === 90 || rotation === 270;
  const effW = isSideways ? height : width;
  const effH = isSideways ? width : height;
  const cssWidth = Math.round(effW * scale);
  const cssHeight = Math.round(effH * scale);
  const isDark = theme === 'dark';

  return (
    <div
      data-testid={`tiled-page-container-${pageNumber}`}
      data-is-high-zoom="true"
      data-visible-tiles-count={tiles.length}
      onClick={onClick}
      style={{
        position: 'relative',
        width: cssWidth,
        height: cssHeight,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        overflow: 'hidden'
      }}
    >
      {/* Base preview layer (stretched low-res preview prevents white flashing) */}
      {baseBitmap && (
        <div
          data-testid={`base-preview-layer-${pageNumber}`}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.85,
            filter: 'blur(0.5px)'
          }}
        >
          <PageCanvas
            pageNumber={pageNumber}
            width={width}
            height={height}
            rotation={rotation}
            scale={scale}
            dpr={1}
            bitmap={baseBitmap}
            theme={theme}
          />
        </div>
      )}

      {/* High-res visible tiles overlay */}
      <div
        data-testid={`tiles-layer-${pageNumber}`}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none'
        }}
      >
        {tiles.map((tile) => {
          const tileBitmap = tileBitmaps?.get(tile.key);
          const tilePixelW = Math.round(tile.cssBounds.width * dpr);
          const tilePixelH = Math.round(tile.cssBounds.height * dpr);

          return (
            <div
              key={tile.key}
              data-testid={`tile-wrapper-${tile.key}`}
              data-tile-key={tile.key}
              data-has-bitmap={Boolean(tileBitmap)}
              style={{
                position: 'absolute',
                left: tile.cssBounds.left,
                top: tile.cssBounds.top,
                width: tile.cssBounds.width,
                height: tile.cssBounds.height,
                overflow: 'hidden'
              }}
            >
              {tileBitmap ? (
                <TileCanvasElement
                  bitmap={tileBitmap}
                  pixelWidth={tilePixelW}
                  pixelHeight={tilePixelH}
                />
              ) : (
                isLoadingTiles && (
                  <div
                    data-testid={`tile-loading-${tile.key}`}
                    className="page-shimmer"
                    style={{
                      width: '100%',
                      height: '100%',
                      backgroundColor: isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.4)'
                    }}
                  />
                )
              )}
            </div>
          );
        })}
      </div>

      {/* Overlay slot (for text selection, annotations, etc.) */}
      {children && (
        <div
          data-testid={`tiled-page-overlay-${pageNumber}`}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'auto'
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

interface TileCanvasElementProps {
  bitmap: ImageBitmap;
  pixelWidth: number;
  pixelHeight: number;
}

const TileCanvasElement: React.FC<TileCanvasElementProps> = ({
  bitmap,
  pixelWidth,
  pixelHeight
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) {
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  }, [bitmap]);

  return (
    <canvas
      ref={canvasRef}
      width={pixelWidth}
      height={pixelHeight}
      style={{
        display: 'block',
        width: '100%',
        height: '100%'
      }}
    />
  );
};
