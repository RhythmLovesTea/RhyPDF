import React, { useState } from 'react';
import { Dialog, Button } from '@rhypdf/ui';
import { parsePageRange, zipFiles } from '@rhypdf/edit-core';

export interface PdfToImagesDialogProps {
  open: boolean;
  onClose: () => void;
  currentPageIndex: number;
  totalPages: number;
  onRenderPageToImage?: (
    pageIndex: number,
    dpi: number,
    format: 'png' | 'jpeg' | 'webp'
  ) => Promise<Uint8Array>;
}

export const PdfToImagesDialog: React.FC<PdfToImagesDialogProps> = ({
  open,
  onClose,
  currentPageIndex,
  totalPages,
  onRenderPageToImage
}) => {
  const [scope, setScope] = useState<'current' | 'all' | 'custom'>('all');
  const [rangeStr, setRangeStr] = useState(`1-${totalPages}`);
  const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [dpi, setDpi] = useState<72 | 150 | 300>(150);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setProgress('Preparing pages...');

    try {
      let pageIndices: number[] = [];
      if (scope === 'current') {
        pageIndices = [currentPageIndex];
      } else if (scope === 'all') {
        pageIndices = Array.from({ length: totalPages }, (_, i) => i);
      } else {
        pageIndices = parsePageRange(rangeStr, totalPages);
      }

      if (pageIndices.length === 0) {
        setError('No pages selected.');
        setIsExporting(false);
        return;
      }

      const files: Array<{ name: string; bytes: Uint8Array }> = [];

      for (let i = 0; i < pageIndices.length; i++) {
        const p = pageIndices[i]!;
        setProgress(`Rendering page ${p + 1} (${i + 1}/${pageIndices.length})...`);

        let imageBytes: Uint8Array;
        if (onRenderPageToImage) {
          imageBytes = await onRenderPageToImage(p, dpi, format);
        } else {
          // Fallback / mock canvas rendering
          const canvas = document.createElement('canvas');
          const scale = dpi / 72;
          canvas.width = Math.round(595 * scale);
          canvas.height = Math.round(842 * scale);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#000000';
            ctx.font = `${Math.round(24 * scale)}px sans-serif`;
            ctx.fillText(`Page ${p + 1}`, 50 * scale, 100 * scale);
          }
          const mimeType =
            format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mimeType));
          const buf = blob ? await blob.arrayBuffer() : new ArrayBuffer(0);
          imageBytes = new Uint8Array(buf);
        }

        const ext = format === 'jpeg' ? 'jpg' : format;
        files.push({
          name: `page_${p + 1}.${ext}`,
          bytes: imageBytes
        });
      }

      if (files.length === 1 && files[0]) {
        // Direct image download
        const mimeType =
          format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        const blob = new Blob([files[0].bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = files[0].name;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Bundle into ZIP via fflate
        setProgress('Compressing images into ZIP...');
        const zipBytes = zipFiles(files);
        const blob = new Blob([zipBytes], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pdf_pages_images.zip';
        a.click();
        URL.revokeObjectURL(url);
      }

      onClose();
    } catch {
      setError('An error occurred during image export.');
    } finally {
      setIsExporting(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Export PDF to Images">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 340 }}>
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
            Pages to Export
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
                data-testid="export-scope-all"
                type="radio"
                name="exportScope"
                value="all"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
              />
              All Pages ({totalPages} pages)
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
                data-testid="export-scope-current"
                type="radio"
                name="exportScope"
                value="current"
                checked={scope === 'current'}
                onChange={() => setScope('current')}
              />
              Current Page (Page {currentPageIndex + 1})
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
                data-testid="export-scope-custom"
                type="radio"
                name="exportScope"
                value="custom"
                checked={scope === 'custom'}
                onChange={() => setScope('custom')}
              />
              Custom Page Range
            </label>
          </div>
        </div>

        {scope === 'custom' && (
          <div>
            <input
              data-testid="export-range-input"
              type="text"
              value={rangeStr}
              onChange={(e) => setRangeStr(e.target.value)}
              placeholder="e.g. 1, 3-5, 8"
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Format
            </label>
            <select
              data-testid="export-format-select"
              value={format}
              onChange={(e) => setFormat(e.target.value as 'png' | 'jpeg' | 'webp')}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            >
              <option value="png">PNG (Lossless)</option>
              <option value="jpeg">JPEG (Compressed)</option>
              <option value="webp">WebP (Modern)</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Resolution / DPI
            </label>
            <select
              data-testid="export-dpi-select"
              value={dpi}
              onChange={(e) => setDpi(parseInt(e.target.value, 10) as 72 | 150 | 300)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            >
              <option value={72}>72 DPI (Web)</option>
              <option value={150}>150 DPI (Standard)</option>
              <option value={300}>300 DPI (High Print)</option>
            </select>
          </div>
        </div>

        {progress && <div style={{ fontSize: 12, color: 'var(--color-primary)' }}>{progress}</div>}

        {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            data-testid="export-images-confirm"
            variant="primary"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Images'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
