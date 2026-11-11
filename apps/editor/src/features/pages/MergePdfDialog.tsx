import React, { useState, useRef } from 'react';
import { Dialog, Button } from '@rhypdf/ui';
import { PDFDocument } from 'pdf-lib';
import { mergeMultiplePdfs, type MergePdfItem } from '@rhypdf/edit-core';
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';

export interface MergePdfDialogProps {
  open: boolean;
  onClose: () => void;
  currentDocumentBytes?: Uint8Array;
  currentDocumentName?: string;
  onMergeComplete?: (mergedBytes: Uint8Array, filename: string) => void;
}

export const MergePdfDialog: React.FC<MergePdfDialogProps> = ({
  open,
  onClose,
  currentDocumentBytes,
  currentDocumentName,
  onMergeComplete
}) => {
  const [items, setItems] = useState<MergePdfItem[]>(() => {
    if (currentDocumentBytes) {
      return [
        {
          id: 'cur_doc',
          name: currentDocumentName || 'Current Document.pdf',
          bytes: currentDocumentBytes
        }
      ];
    }
    return [];
  });
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesAdded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError(null);
    const newItems: MergePdfItem[] = [];

    for (const file of files) {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        const doc = await PDFDocument.load(bytes);
        newItems.push({
          id: `doc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          bytes,
          pageCount: doc.getPageCount()
        });
      } catch {
        setError(`Failed to read "${file.name}" as a valid PDF.`);
      }
    }

    setItems((prev) => [...prev, ...newItems]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setItems((prev) => {
      const copy = [...prev];
      const temp = copy[index]!;
      copy[index] = copy[index - 1]!;
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveDown = (index: number) => {
    setItems((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index]!;
      copy[index] = copy[index + 1]!;
      copy[index + 1] = temp;
      return copy;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMerge = async () => {
    if (items.length < 2) {
      setError('Please add at least 2 PDF documents to merge.');
      return;
    }

    setIsMerging(true);
    setError(null);
    try {
      const mergedBytes = await mergeMultiplePdfs(items);
      const filename = 'merged_document.pdf';

      if (onMergeComplete) {
        onMergeComplete(mergedBytes, filename);
      } else {
        // Trigger browser download
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      onClose();
    } catch {
      setError('Error merging documents.');
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Merge Multiple PDFs">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 380 }}>
        <p style={{ fontSize: 13, color: 'var(--bg-muted-foreground)', margin: 0 }}>
          Arrange the order of documents below. They will be merged in top-to-bottom sequence into a
          single PDF.
        </p>

        <input
          ref={fileInputRef}
          data-testid="merge-pdf-file-input"
          type="file"
          multiple
          accept="application/pdf"
          onChange={handleFilesAdded}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            data-testid="add-pdf-files-button"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus size={16} style={{ marginRight: 6 }} /> Add PDF Files...
          </Button>
        </div>

        <div
          data-testid="merge-items-list"
          style={{
            maxHeight: 240,
            overflowY: 'auto',
            border: '1px solid var(--bg-border)',
            borderRadius: 6,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 24,
                color: 'var(--bg-muted-foreground)',
                fontSize: 13
              }}
            >
              No PDF files added yet. Click "Add PDF Files..." to get started.
            </div>
          ) : (
            items.map((item, idx) => (
              <div
                key={item.id}
                data-testid={`merge-item-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 6,
                  border: '1px solid var(--bg-border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 12,
                      color: 'var(--bg-muted-foreground)',
                      minWidth: 20
                    }}
                  >
                    {idx + 1}.
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {item.name}
                  </span>
                  {item.pageCount !== undefined && (
                    <span style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>
                      ({item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    data-testid={`move-up-${idx}`}
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
                    data-testid={`move-down-${idx}`}
                    type="button"
                    onClick={() => moveDown(idx)}
                    disabled={idx === items.length - 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: idx === items.length - 1 ? 0.3 : 1,
                      padding: 4
                    }}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    data-testid={`remove-item-${idx}`}
                    type="button"
                    onClick={() => removeItem(item.id)}
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

        {error && <div style={{ color: '#ef4444', fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <Button variant="secondary" onClick={onClose} disabled={isMerging}>
            Cancel
          </Button>
          <Button
            data-testid="merge-confirm-button"
            variant="primary"
            onClick={handleMerge}
            disabled={items.length < 2 || isMerging}
          >
            {isMerging ? 'Merging...' : `Merge ${items.length} Documents`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
