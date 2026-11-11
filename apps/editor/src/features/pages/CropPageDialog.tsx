import React, { useState } from 'react';
import { Dialog, Button } from '@rhypdf/ui';
import type { Rect } from '@rhypdf/pdf-model';

export interface CropPageDialogProps {
  open: boolean;
  onClose: () => void;
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
  initialCropBox?: Rect;
  onApplyCrop: (pageIndex: number, cropBox: Rect) => void;
}

export const CropPageDialog: React.FC<CropPageDialogProps> = ({
  open,
  onClose,
  pageIndex,
  pageWidth,
  pageHeight,
  initialCropBox,
  onApplyCrop
}) => {
  const [leftMargin, setLeftMargin] = useState(() => initialCropBox?.left ?? 36);
  const [rightMargin, setRightMargin] = useState(() =>
    initialCropBox ? Math.max(0, pageWidth - initialCropBox.right) : 36
  );
  const [topMargin, setTopMargin] = useState(() =>
    initialCropBox ? Math.max(0, pageHeight - initialCropBox.top) : 36
  );
  const [bottomMargin, setMarginBottom] = useState(() => initialCropBox?.bottom ?? 36);

  const croppedWidth = Math.max(10, pageWidth - leftMargin - rightMargin);
  const croppedHeight = Math.max(10, pageHeight - topMargin - bottomMargin);

  const handleApply = () => {
    const cropBox: Rect = {
      left: leftMargin,
      bottom: bottomMargin,
      right: pageWidth - rightMargin,
      top: pageHeight - topMargin
    };
    onApplyCrop(pageIndex, cropBox);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Crop Page Margins (Page ${pageIndex + 1})`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 340 }}>
        <p style={{ fontSize: 13, color: 'var(--bg-muted-foreground)', margin: 0 }}>
          Adjust the margins to crop the page boundaries. Dimensions in points (1 pt = 1/72 inch).
        </p>

        {/* Visual Preview Box */}
        <div
          style={{
            height: 160,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-muted)',
            borderRadius: 8,
            padding: 12
          }}
        >
          <div
            style={{
              width: 100,
              height: 130,
              backgroundColor: '#ffffff',
              border: '2px solid #94a3b8',
              borderRadius: 4,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: `${(leftMargin / pageWidth) * 100}%`,
                right: `${(rightMargin / pageWidth) * 100}%`,
                top: `${(topMargin / pageHeight) * 100}%`,
                bottom: `${(bottomMargin / pageHeight) * 100}%`,
                border: '2px dashed #3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.15)'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Left Margin (pt)
            </label>
            <input
              data-testid="crop-left-input"
              type="number"
              min="0"
              max={pageWidth - 20}
              value={leftMargin}
              onChange={(e) => setLeftMargin(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Right Margin (pt)
            </label>
            <input
              data-testid="crop-right-input"
              type="number"
              min="0"
              max={pageWidth - 20}
              value={rightMargin}
              onChange={(e) => setRightMargin(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Top Margin (pt)
            </label>
            <input
              data-testid="crop-top-input"
              type="number"
              min="0"
              max={pageHeight - 20}
              value={topMargin}
              onChange={(e) => setTopMargin(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Bottom Margin (pt)
            </label>
            <input
              data-testid="crop-bottom-input"
              type="number"
              min="0"
              max={pageHeight - 20}
              value={bottomMargin}
              onChange={(e) => setMarginBottom(Math.max(0, parseInt(e.target.value, 10) || 0))}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            />
          </div>
        </div>

        <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground)' }}>
          Cropped Size: {Math.round(croppedWidth)} × {Math.round(croppedHeight)} pt
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button data-testid="apply-crop-button" variant="primary" onClick={handleApply}>
            Apply Crop
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
