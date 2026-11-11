import React from 'react';
import type { RotationAngle } from '@rhypdf/pdf-model';
import { CoordinateMapper } from '@rhypdf/pdf-model';

export interface RulerGridOverlayProps {
  pageWidthPt: number;
  pageHeightPt: number;
  scale?: number;
  rotation?: RotationAngle;
  showRuler?: boolean;
  showGrid?: boolean;
  gridSizePt?: number;
}

export const RulerGridOverlay: React.FC<RulerGridOverlayProps> = ({
  pageWidthPt,
  pageHeightPt,
  scale = 1.0,
  rotation = 0,
  showRuler = false,
  showGrid = false,
  gridSizePt = 20
}) => {
  const mapper = new CoordinateMapper(pageWidthPt, pageHeightPt, rotation, scale);
  const cssWidth = mapper.effectiveWidthPt * scale;
  const cssHeight = mapper.effectiveHeightPt * scale;
  const cssGridSize = gridSizePt * scale;

  if (!showRuler && !showGrid) {
    return null;
  }

  const rulerSize = 18; // thickness of ruler in CSS pixels

  return (
    <div
      data-testid="ruler-grid-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: cssWidth,
        height: cssHeight,
        pointerEvents: 'none',
        zIndex: 400
      }}
    >
      {/* Grid Canvas */}
      {showGrid && (
        <svg
          data-testid="grid-overlay-svg"
          width={cssWidth}
          height={cssHeight}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            <pattern
              id="grid-pattern"
              width={cssGridSize}
              height={cssGridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${cssGridSize} 0 L 0 0 0 ${cssGridSize}`}
                fill="none"
                stroke="rgba(59, 130, 246, 0.2)"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      )}

      {/* Top & Left Rulers */}
      {showRuler && (
        <>
          {/* Top Ruler */}
          <div
            data-testid="top-ruler"
            style={{
              position: 'absolute',
              top: -rulerSize,
              left: 0,
              width: cssWidth,
              height: rulerSize,
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--bg-border)',
              overflow: 'hidden'
            }}
          >
            <svg width={cssWidth} height={rulerSize}>
              {Array.from({ length: Math.ceil(pageWidthPt / 50) + 1 }).map((_, i) => {
                const pt = i * 50;
                const x = pt * scale;
                return (
                  <g key={`top-tick-${i}`}>
                    <line
                      x1={x}
                      y1={rulerSize - 6}
                      x2={x}
                      y2={rulerSize}
                      stroke="var(--bg-muted-foreground)"
                      strokeWidth="1"
                    />
                    <text
                      x={x + 2}
                      y={rulerSize - 8}
                      fontSize="9"
                      fill="var(--bg-muted-foreground)"
                    >
                      {pt}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Left Ruler */}
          <div
            data-testid="left-ruler"
            style={{
              position: 'absolute',
              top: 0,
              left: -rulerSize,
              width: rulerSize,
              height: cssHeight,
              backgroundColor: 'var(--bg-secondary)',
              borderRight: '1px solid var(--bg-border)',
              overflow: 'hidden'
            }}
          >
            <svg width={rulerSize} height={cssHeight}>
              {Array.from({ length: Math.ceil(pageHeightPt / 50) + 1 }).map((_, i) => {
                const pt = i * 50;
                const y = pt * scale;
                return (
                  <g key={`left-tick-${i}`}>
                    <line
                      x1={rulerSize - 6}
                      y1={y}
                      x2={rulerSize}
                      y2={y}
                      stroke="var(--bg-muted-foreground)"
                      strokeWidth="1"
                    />
                    <text
                      x={2}
                      y={y - 2}
                      fontSize="9"
                      fill="var(--bg-muted-foreground)"
                      transform={`rotate(-90, 2, ${y - 2})`}
                    >
                      {pt}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}
    </div>
  );
};
