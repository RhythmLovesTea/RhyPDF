import React, { useState } from 'react';
import { Layers, Download, Play, X, FileText } from 'lucide-react';
import { getSupportedOcrLanguages, type OcrOutputMode } from '@rhypdf/ocr';

export interface BatchOcrDialogProps {
  isOpen: boolean;
  totalPages: number;
  currentPage: number;
  onStartBatch: (options: {
    pageIndices: number[];
    language: string;
    outputMode: OcrOutputMode;
    downloadAfter: boolean;
  }) => void;
  onClose: () => void;
}

export const BatchOcrDialog: React.FC<BatchOcrDialogProps> = ({
  isOpen,
  totalPages,
  currentPage,
  onStartBatch,
  onClose
}) => {
  const [rangeMode, setRangeMode] = useState<'all' | 'current' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('');
  const [language, setLanguage] = useState('eng');
  const [outputMode, setOutputMode] = useState<OcrOutputMode>('searchable');

  if (!isOpen) return null;

  const languages = getSupportedOcrLanguages();

  const parsePageIndices = (): number[] => {
    if (rangeMode === 'current') return [currentPage];
    if (rangeMode === 'all') return Array.from({ length: totalPages }, (_, i) => i);

    // Custom range parser: e.g. "1-3, 5"
    const indices: number[] = [];
    const parts = customRange.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => s.trim());
        const start = parseInt(startStr || '1', 10) - 1;
        const end = parseInt(endStr || String(totalPages), 10) - 1;
        for (let i = Math.max(0, start); i <= Math.min(totalPages - 1, end); i++) {
          if (!indices.includes(i)) indices.push(i);
        }
      } else {
        const num = parseInt(part, 10) - 1;
        if (!isNaN(num) && num >= 0 && num < totalPages && !indices.includes(num)) {
          indices.push(num);
        }
      }
    }
    return indices.length > 0 ? indices : [currentPage];
  };

  const handleStart = (downloadAfter: boolean) => {
    const pageIndices = parsePageIndices();
    onStartBatch({
      pageIndices,
      language,
      outputMode,
      downloadAfter
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="batch-ocr-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h3 id="batch-ocr-title" className="font-semibold text-base">
              Batch OCR Documents
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Page Range Selection */}
        <div className="space-y-2 text-xs">
          <label className="font-medium text-foreground block">Pages to Process</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setRangeMode('all')}
              className={`px-3 py-2 rounded-md border text-center transition-colors ${
                rangeMode === 'all'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              All Pages ({totalPages})
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('current')}
              className={`px-3 py-2 rounded-md border text-center transition-colors ${
                rangeMode === 'current'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              Page {currentPage + 1} Only
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('custom')}
              className={`px-3 py-2 rounded-md border text-center transition-colors ${
                rangeMode === 'custom'
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              Custom Range
            </button>
          </div>

          {rangeMode === 'custom' && (
            <input
              type="text"
              value={customRange}
              onChange={(e) => setCustomRange(e.target.value)}
              placeholder="e.g. 1-4, 7, 10"
              className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground mt-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          )}
        </div>

        {/* Language Selection */}
        <div className="space-y-1.5 text-xs">
          <label htmlFor="batch-ocr-lang" className="font-medium text-foreground block">
            Recognition Language
          </label>
          <select
            id="batch-ocr-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-background border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name} ({l.nativeName}) — {l.sizeLabel}
              </option>
            ))}
          </select>
        </div>

        {/* Output Mode Selection */}
        <div className="space-y-1.5 text-xs">
          <label className="font-medium text-foreground block">Output Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOutputMode('searchable')}
              className={`p-2.5 rounded-md border text-left space-y-0.5 transition-colors ${
                outputMode === 'searchable'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              <div className="font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Searchable Layer</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Preserves scan appearance; adds invisible text under image.
              </div>
            </button>

            <button
              type="button"
              onClick={() => setOutputMode('editable')}
              className={`p-2.5 rounded-md border text-left space-y-0.5 transition-colors ${
                outputMode === 'editable'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              <div className="font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Fully Editable</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                Erases original glyph pixels and replaces with editable text.
              </div>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted transition-colors border border-border"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => handleStart(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors border border-border"
          >
            <Download className="w-3.5 h-3.5" />
            <span>OCR & Download</span>
          </button>

          <button
            type="button"
            onClick={() => handleStart(false)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Batch OCR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
