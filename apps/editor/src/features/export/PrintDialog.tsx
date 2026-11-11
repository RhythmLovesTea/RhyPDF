import React, { useState } from 'react';
import { Button } from '@rhypdf/ui';
import { Printer, X } from 'lucide-react';
import type { PrintOptions } from '@rhypdf/edit-core';

export interface PrintDialogProps {
  isOpen: boolean;
  pageCount: number;
  currentPageIndex: number;
  onClose: () => void;
  onPrint: (options: PrintOptions) => void;
}

export const PrintDialog: React.FC<PrintDialogProps> = ({
  isOpen,
  pageCount,
  currentPageIndex,
  onClose,
  onPrint
}) => {
  const [rangeMode, setRangeMode] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('1');
  const [copies, setCopies] = useState(1);

  if (!isOpen) return null;

  const handlePrintSubmit = () => {
    let resolvedRange = 'all';
    if (rangeMode === 'current') {
      resolvedRange = `${currentPageIndex + 1}`;
    } else if (rangeMode === 'custom') {
      resolvedRange = customRange.trim() || 'all';
    }

    onPrint({
      pageRange: resolvedRange,
      copies: Math.max(1, Math.min(99, copies))
    });
  };

  return (
    <div
      data-testid="dialog-print"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--bg-foreground, #0f172a)',
          borderRadius: 12,
          padding: 24,
          width: '90%',
          maxWidth: 420,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={20} color="var(--bg-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Print Document</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bg-muted-foreground, #64748b)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {/* Page Range */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Pages to Print (Total {pageCount})
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="printRange"
                  value="all"
                  checked={rangeMode === 'all'}
                  onChange={() => setRangeMode('all')}
                />
                <span>All pages</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="printRange"
                  value="current"
                  checked={rangeMode === 'current'}
                  onChange={() => setRangeMode('current')}
                />
                <span>Current page ({currentPageIndex + 1})</span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <input
                  type="radio"
                  name="printRange"
                  value="custom"
                  checked={rangeMode === 'custom'}
                  onChange={() => setRangeMode('custom')}
                />
                <span>Custom range</span>
              </label>

              {rangeMode === 'custom' && (
                <input
                  data-testid="input-print-custom-range"
                  type="text"
                  placeholder="e.g. 1-3, 5"
                  value={customRange}
                  onChange={(e) => setCustomRange(e.target.value)}
                  style={{
                    marginLeft: 24,
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--bg-border, #cbd5e1)',
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    color: 'inherit',
                    fontSize: 13,
                    maxWidth: 200
                  }}
                />
              )}
            </div>
          </div>

          {/* Copies */}
          <div>
            <label
              htmlFor="input-print-copies"
              style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}
            >
              Copies
            </label>
            <input
              id="input-print-copies"
              data-testid="input-print-copies"
              type="number"
              min={1}
              max={99}
              value={copies}
              onChange={(e) => setCopies(parseInt(e.target.value, 10) || 1)}
              style={{
                width: 80,
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'inherit',
                fontSize: 13
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="btn-confirm-print"
            variant="primary"
            onClick={handlePrintSubmit}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Printer size={16} />
            <span>Print</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
