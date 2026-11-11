import React, { useState } from 'react';
import { Dialog, Button } from '@rhypdf/ui';
import { splitPdf, zipFiles, type SplitPdfMode, type BookmarkItem } from '@rhypdf/edit-core';

export interface SplitPdfDialogProps {
  open: boolean;
  onClose: () => void;
  documentBytes: Uint8Array;
  totalPages: number;
  selectedPages?: number[];
  bookmarks?: BookmarkItem[];
}

export const SplitPdfDialog: React.FC<SplitPdfDialogProps> = ({
  open,
  onClose,
  documentBytes,
  totalPages,
  selectedPages = [],
  bookmarks = []
}) => {
  const [mode, setMode] = useState<SplitPdfMode>('everyN');
  const [everyN, setEveryN] = useState<number>(1);
  const [ranges, setRanges] = useState<string>('1-2; 3-4');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSplit = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const splitFiles = await splitPdf(documentBytes, {
        mode,
        everyN,
        ranges,
        selectedPages,
        bookmarks
      });

      if (splitFiles.length === 0) {
        setError('No pages found matching split criteria.');
        setIsProcessing(false);
        return;
      }

      // Package into ZIP using fflate
      const zipData = zipFiles(splitFiles.map((f) => ({ name: f.filename, bytes: f.bytes })));
      const blob = new Blob([zipData], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'document_split.zip';
      a.click();
      URL.revokeObjectURL(url);

      onClose();
    } catch {
      setError('An error occurred while splitting the document.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Split PDF">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 360 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Split Mode
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                data-testid="split-mode-every-n"
                type="radio"
                name="splitMode"
                value="everyN"
                checked={mode === 'everyN'}
                onChange={() => setMode('everyN')}
              />
              Every N pages
            </label>
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
                data-testid="split-mode-ranges"
                type="radio"
                name="splitMode"
                value="ranges"
                checked={mode === 'ranges'}
                onChange={() => setMode('ranges')}
              />
              By Page Ranges (e.g. 1-2; 3-5)
            </label>
            {selectedPages.length > 0 && (
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
                  data-testid="split-mode-selection"
                  type="radio"
                  name="splitMode"
                  value="selection"
                  checked={mode === 'selection'}
                  onChange={() => setMode('selection')}
                />
                Selected Pages ({selectedPages.length} selected)
              </label>
            )}
            {bookmarks.length > 0 && (
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
                  data-testid="split-mode-bookmarks"
                  type="radio"
                  name="splitMode"
                  value="bookmarks"
                  checked={mode === 'bookmarks'}
                  onChange={() => setMode('bookmarks')}
                />
                By Bookmarks ({bookmarks.length} chapters)
              </label>
            )}
          </div>
        </div>

        {mode === 'everyN' && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Split every
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                data-testid="split-every-n-input"
                type="number"
                min="1"
                max={totalPages}
                value={everyN}
                onChange={(e) => setEveryN(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: 80,
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--bg-border)',
                  backgroundColor: 'var(--bg-card)'
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--bg-muted-foreground)' }}>
                pages (Total {Math.ceil(totalPages / Math.max(1, everyN))} files)
              </span>
            </div>
          </div>
        )}

        {mode === 'ranges' && (
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Page Ranges (separated by semicolons)
            </label>
            <input
              data-testid="split-ranges-input"
              type="text"
              value={ranges}
              onChange={(e) => setRanges(e.target.value)}
              placeholder="e.g. 1-2; 3-5; 6"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', marginTop: 4 }}>
              Each semicolon-separated range produces a separate PDF file.
            </p>
          </div>
        )}

        {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            data-testid="split-confirm-button"
            variant="primary"
            onClick={handleSplit}
            disabled={isProcessing}
          >
            {isProcessing ? 'Splitting...' : 'Split & Download ZIP'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
