import React, { useState } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { Table } from 'lucide-react';
import { Dialog } from '@rhypdf/ui';
import type { GeneratedTable, TableOptions } from '@rhypdf/edit-core';
import { createTable } from '@rhypdf/edit-core';

export interface InsertTableDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTable: (table: GeneratedTable) => void;
  pageIndex: number;
  pageWidthPt?: number;
  pageHeightPt?: number;
}

export const InsertTableDialog: React.FC<InsertTableDialogProps> = ({
  isOpen,
  onClose,
  onInsertTable,
  pageIndex,
  pageWidthPt = 612,
  pageHeightPt = 792
}) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [headerRow, setHeaderRow] = useState(true);
  const [borderColor, setBorderColor] = useState('#64748b');

  const hexToRgba = (hex: string) => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return { r, g, b, a: 255 };
  };

  const handleConfirm = () => {
    const tableWidth = Math.min(pageWidthPt * 0.8, cols * 100);
    const tableHeight = rows * 28;
    const cx = pageWidthPt / 2;
    const cy = pageHeightPt / 2;

    const bounds = {
      left: cx - tableWidth / 2,
      bottom: cy - tableHeight / 2,
      right: cx + tableWidth / 2,
      top: cy + tableHeight / 2
    };

    const options: TableOptions = {
      headerRow,
      borderColor: hexToRgba(borderColor),
      borderWidth: 1,
      fontSize: 10
    };

    const generated = createTable(pageIndex, bounds, rows, cols, options);
    onInsertTable(generated);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title={t('editor.tables.insertTable', 'Insert Table')}>
      <div
        data-testid="dialog-insert-table"
        style={{
          padding: 20,
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600 }}
        >
          <Table size={20} />
          <span>{t('editor.tables.insertTable', 'Insert Table')}</span>
        </div>

        {/* Row and Col pickers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Rows:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                data-testid="btn-table-dec-rows"
                onClick={() => setRows(Math.max(1, rows - 1))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  border: '1px solid var(--bg-border)',
                  cursor: 'pointer'
                }}
              >
                -
              </button>
              <input
                data-testid="input-table-rows"
                type="number"
                min="1"
                max="25"
                value={rows}
                onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: 48, textAlign: 'center', padding: '4px 0' }}
              />
              <button
                data-testid="btn-table-inc-rows"
                onClick={() => setRows(Math.min(25, rows + 1))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  border: '1px solid var(--bg-border)',
                  cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Columns:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                data-testid="btn-table-dec-cols"
                onClick={() => setCols(Math.max(1, cols - 1))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  border: '1px solid var(--bg-border)',
                  cursor: 'pointer'
                }}
              >
                -
              </button>
              <input
                data-testid="input-table-cols"
                type="number"
                min="1"
                max="12"
                value={cols}
                onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
                style={{ width: 48, textAlign: 'center', padding: '4px 0' }}
              />
              <button
                data-testid="btn-table-inc-cols"
                onClick={() => setCols(Math.min(12, cols + 1))}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 4,
                  border: '1px solid var(--bg-border)',
                  cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <input
              type="checkbox"
              data-testid="checkbox-table-header"
              checked={headerRow}
              onChange={(e) => setHeaderRow(e.target.checked)}
            />
            First row is header
          </label>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 13
            }}
          >
            <span>Border color:</span>
            <input
              type="color"
              data-testid="input-table-border-color"
              value={borderColor}
              onChange={(e) => setBorderColor(e.target.value)}
              style={{
                width: 28,
                height: 28,
                border: 'none',
                cursor: 'pointer',
                background: 'transparent'
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button
            data-testid="btn-cancel-table"
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            data-testid="btn-confirm-insert-table"
            onClick={handleConfirm}
            style={{
              padding: '6px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--bg-primary)',
              color: '#ffffff',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Insert Table
          </button>
        </div>
      </div>
    </Dialog>
  );
};
