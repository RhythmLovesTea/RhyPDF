import React, { useState, useRef } from 'react';
import { Dialog, Button } from '@rhypdf/ui';
import { imagesToPdf, type ImagesToPdfItem, type PageSizePreset } from '@rhypdf/edit-core';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';

export interface ImagesToPdfDialogProps {
  open: boolean;
  onClose: () => void;
  onPdfCreated?: (pdfBytes: Uint8Array, filename: string) => void;
}

export const ImagesToPdfDialog: React.FC<ImagesToPdfDialogProps> = ({
  open,
  onClose,
  onPdfCreated
}) => {
  const [images, setImages] = useState<ImagesToPdfItem[]>([]);
  const [pageSize, setPageSize] = useState<PageSizePreset>('A4');
  const [margin, setMargin] = useState(20);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesAdded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError(null);
    const newItems: ImagesToPdfItem[] = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        const format = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
        newItems.push({
          name: file.name,
          data,
          format
        });
      } catch {
        setError(`Failed to read image file "${file.name}".`);
      }
    }

    setImages((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index]!;
      copy[index] = copy[index - 1]!;
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    if (index >= images.length - 1) return;
    setImages((prev) => {
      const copy = [...prev];
      const temp = copy[index]!;
      copy[index] = copy[index + 1]!;
      copy[index + 1] = temp;
      return copy;
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePdf = async () => {
    if (images.length === 0) {
      setError('Please add at least one image.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const pdfBytes = await imagesToPdf({
        images,
        pageSize,
        margin
      });

      const filename = 'images_combined.pdf';
      if (onPdfCreated) {
        onPdfCreated(pdfBytes, filename);
      } else {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      onClose();
    } catch {
      setError('Failed to create PDF from images.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Convert Images to PDF">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 380 }}>
        <p style={{ fontSize: 13, color: 'var(--bg-muted-foreground)', margin: 0 }}>
          Select and arrange images (PNG, JPG) to compile into a multi-page PDF document.
        </p>

        <input
          ref={fileInputRef}
          data-testid="images-file-input"
          type="file"
          multiple
          accept="image/png, image/jpeg, image/webp"
          onChange={handleFilesAdded}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            data-testid="add-images-button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={16} style={{ marginRight: 6 }} /> Add Images...
          </Button>
        </div>

        <div
          data-testid="images-list"
          style={{
            maxHeight: 200,
            overflowY: 'auto',
            border: '1px solid var(--bg-border)',
            borderRadius: 6,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          {images.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--bg-muted-foreground)', fontSize: 13 }}>
              No images added. Click "Add Images..." to select photos or scans.
            </div>
          ) : (
            images.map((img, idx) => (
              <div
                key={idx}
                data-testid={`image-item-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 6,
                  border: '1px solid var(--bg-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--bg-muted-foreground)' }}>
                    {idx + 1}.
                  </span>
                  <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {img.name}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--bg-muted-foreground)', textTransform: 'uppercase' }}>
                    [{img.format}]
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    data-testid={`img-move-up-${idx}`}
                    type="button"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      opacity: idx === 0 ? 0.3 : 1,
                      padding: 4
                    }}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    data-testid={`img-move-down-${idx}`}
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === images.length - 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: idx === images.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: idx === images.length - 1 ? 0.3 : 1,
                      padding: 4
                    }}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    data-testid={`img-remove-${idx}`}
                    type="button"
                    onClick={() => removeImage(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      padding: 4
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Page Size
            </label>
            <select
              data-testid="img-page-size-select"
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value as PageSizePreset)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-card)'
              }}
            >
              <option value="A4">A4 (Standard)</option>
              <option value="Letter">US Letter</option>
              <option value="Custom">Fit Exactly to Image</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
              Margin (pt)
            </label>
            <input
              data-testid="img-margin-input"
              type="number"
              min="0"
              max="100"
              value={margin}
              onChange={(e) => setMargin(Math.max(0, parseInt(e.target.value, 10) || 0))}
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

        {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            data-testid="create-pdf-confirm"
            variant="primary"
            onClick={handleCreatePdf}
            disabled={images.length === 0 || isProcessing}
          >
            {isProcessing ? 'Generating PDF...' : `Create PDF (${images.length} pages)`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
