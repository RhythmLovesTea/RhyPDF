import React from 'react';
import { CoordinateMapper } from '@rhypdf/pdf-model';
import type { SearchMatch } from './text-search';

export interface SearchHighlightLayerProps {
  pageIndex: number;
  matches: SearchMatch[];
  currentMatchId?: string;
  pageWidthPt: number;
  pageHeightPt: number;
  rotation?: 0 | 90 | 180 | 270;
  scale: number;
}

export const SearchHighlightLayer: React.FC<SearchHighlightLayerProps> = ({
  pageIndex,
  matches,
  currentMatchId,
  pageWidthPt,
  pageHeightPt,
  rotation = 0,
  scale
}) => {
  if (matches.length === 0) return null;

  const mapper = new CoordinateMapper(pageWidthPt, pageHeightPt, rotation, scale, 1.0);

  return (
    <div
      data-testid={`search-highlight-layer-${pageIndex}`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10
      }}
    >
      {matches.map((match) => {
        const isCurrent = match.id === currentMatchId;

        return match.rects.map((rect, rIdx) => {
          const cssBox = mapper.pdfRectToCss(rect);

          return (
            <div
              key={`${match.id}-rect-${rIdx}`}
              data-testid={`search-match-${match.id}`}
              data-is-current={isCurrent}
              style={{
                position: 'absolute',
                left: cssBox.x,
                top: cssBox.y,
                width: cssBox.width,
                height: cssBox.height,
                backgroundColor: isCurrent
                  ? 'rgba(249, 115, 22, 0.65)'
                  : 'rgba(250, 204, 21, 0.45)',
                border: isCurrent ? '1px solid #ea580c' : '1px solid rgba(234, 179, 8, 0.6)',
                borderRadius: 2,
                boxSizing: 'border-box'
              }}
            />
          );
        });
      })}
    </div>
  );
};
