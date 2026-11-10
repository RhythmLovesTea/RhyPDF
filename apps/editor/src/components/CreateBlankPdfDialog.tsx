import React, { useState } from 'react';
import { Dialog, Button, Select } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';
import {
  createBlankPdfBytes,
  PageSizePreset,
  PageOrientation,
  MeasurementUnit
} from '../lib/blankPdf';

export interface CreateBlankPdfDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (bytes: Uint8Array, filename: string, pageCount: number) => void;
}

export const CreateBlankPdfDialog: React.FC<CreateBlankPdfDialogProps> = ({
  open,
  onClose,
  onCreate
}) => {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState<PageSizePreset>('A4');
  const [orientation, setOrientation] = useState<PageOrientation>('portrait');
  const [pageCount, setPageCount] = useState<number>(1);
  const [unit, setUnit] = useState<MeasurementUnit>('pt');
  const [customWidth, setCustomWidth] = useState<number>(595.28);
  const [customHeight, setCustomHeight] = useState<number>(841.89);

  if (!open) return null;

  const handleCreate = () => {
    const bytes = createBlankPdfBytes({
      pageSize,
      orientation,
      pageCount,
      customWidth,
      customHeight,
      unit
    });
    const filename = `Untitled-${pageSize.toLowerCase()}.pdf`;
    onCreate(bytes, filename, pageCount);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('blankPdf.title')}
      description={t('blankPdf.subtitle')}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
        {/* Page Size */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>{t('blankPdf.pageSize')}</label>
          <Select
            value={pageSize}
            onChange={(val) => setPageSize(val as PageSizePreset)}
            options={[
              { value: 'A4', label: 'A4 (210 × 297 mm / 595 × 842 pt)' },
              { value: 'Letter', label: 'Letter (8.5 × 11 in / 612 × 792 pt)' },
              { value: 'Legal', label: 'Legal (8.5 × 14 in / 612 × 1008 pt)' },
              { value: 'Custom', label: 'Custom Dimensions' }
            ]}
          />
        </div>

        {/* Custom Dimensions */}
        {pageSize === 'Custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--bg-muted-foreground)' }}>
                {t('blankPdf.customWidth')}
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                value={customWidth}
                onChange={(e) => setCustomWidth(parseFloat(e.target.value) || 100)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'inherit'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--bg-muted-foreground)' }}>
                {t('blankPdf.customHeight')}
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                value={customHeight}
                onChange={(e) => setCustomHeight(parseFloat(e.target.value) || 100)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)',
                  color: 'inherit'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--bg-muted-foreground)' }}>
                {t('blankPdf.units')}
              </label>
              <Select
                value={unit}
                onChange={(val) => setUnit(val as MeasurementUnit)}
                options={[
                  { value: 'pt', label: 'pt (points)' },
                  { value: 'mm', label: 'mm (millimeter)' },
                  { value: 'in', label: 'in (inch)' },
                  { value: 'px', label: 'px (pixels)' }
                ]}
              />
            </div>
          </div>
        )}

        {/* Orientation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>{t('blankPdf.orientation')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button
              variant={orientation === 'portrait' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setOrientation('portrait')}
              style={{ flex: 1 }}
            >
              {t('blankPdf.portrait')}
            </Button>
            <Button
              variant={orientation === 'landscape' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setOrientation('landscape')}
              style={{ flex: 1 }}
            >
              {t('blankPdf.landscape')}
            </Button>
          </div>
        </div>

        {/* Page Count */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>{t('blankPdf.pageCount')}</label>
          <input
            type="number"
            min="1"
            max="100"
            value={pageCount}
            onChange={(e) => setPageCount(Math.max(1, parseInt(e.target.value) || 1))}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              color: 'inherit'
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="ghost" onClick={onClose}>
            {t('blankPdf.btnCancel')}
          </Button>
          <Button data-testid="btn-create-blank-submit" variant="primary" onClick={handleCreate}>
            {t('blankPdf.btnCreate')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
