import React, { useState, useRef } from 'react';
import { Dialog, Button } from '@rhypdf/ui';
import { PDFDocument } from 'pdf-lib';

export interface InsertPagesFromPdfDialogProps {
  open: boolean;
  onClose: () => void;
  currentPageIndex: number;
  totalPages: number;
  onInsertPages: (params: { sourceBytes: Uint8Array; pageRange: string; targetIndex: number }) => void;
}

export const InsertPagesFromPdfDialog: React.FC<InsertPagesFromPdfDialogProps> = ({
  open,
  onClose,
  currentPageIndex,
  totalPages,
  onInsertPages
}) => {
  const [sourceFile, setSourceFile] = useState<{ name: string; bytes: Uint8Array; pageCount: number } | null>(null);
  const [pageRange, setPageRange] = useState('All');
  const [position, setPosition] = useState<'after' | 'before' | 'start' | 'end'>('after');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const doc = await PDFDocument.load(bytes);
      setSourceFile({
        name: file.name,
        bytes,
        pageCount: doc.getPageCount()
      });
    } catch {
      setError('Failed to read or parse the selected PDF file.');
    }
  };

  const handleConfirm = () => {
    if (!sourceFile) {
      setError('Please select a PDF file first.');
      return;
    }

    let targetIndex = currentPageIndex + 1;
    if (position === 'before') {
      targetIndex = currentPageIndex;
    } else if (position === 'start') {
      targetIndex = 0;
    } else if (position === 'end') {
      targetIndex = totalPages;
    }

    onInsertPages({
      sourceBytes: sourceFile.bytes,
      pageRange: pageRange.trim() || 'All',
      targetIndex
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Insert Pages from PDF">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 340 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            Source PDF File
          </label>
          <input
            ref={fileInputRef}
            data-testid="source-pdf-file-input"
            type="file"
            accept="application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose PDF File...
            </Button>
            {sourceFile && (
              <span style={{ fontSize: 13, color: 'var(--bg-muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {sourceFile.name} ({sourceFile.pageCount} pages)
              </span>
            )}
          </div>
        </div>

        {sourceFile && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Pages to Insert
            </label>
            <input
              data-testid="insert-page-range-input"
              type="text"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="e.g. All, or 1, 3-5, 8"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', marginTop: 4 }}>
              Enter "All" or comma-separated page numbers and ranges (1 to {sourceFile.pageCount}).
            </p>
          </div>
        )}

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
            Insert Position
          </label>
          <select
            data-testid="insert-pdf-position-select"
            value={position}
            onChange={(e) => setPosition(e.target.value as 'after' | 'before' | 'start' | 'end')}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 6,
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)'
            }}
          >
            <option value="after">After Page {currentPageIndex + 1}</option>
            <option value="before">Before Page {currentPageIndex + 1}</option>
            <option value="start">At Document Beginning</option>
            <option value="end">At Document End</option>
          </select>
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="insert-pages-confirm"
            variant="primary"
            onClick={handleConfirm}
            disabled={!sourceFile}
          >
            Insert Pages
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
