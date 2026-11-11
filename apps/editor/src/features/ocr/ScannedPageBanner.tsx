import React from 'react';
import { Scan, Sparkles, X, ChevronRight } from 'lucide-react';
import { getSupportedOcrLanguages, type OcrOutputMode } from '@rhypdf/ocr';

export interface ScannedPageBannerProps {
  pageIndex: number;
  reason: string;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  onStartOcr: (mode: OcrOutputMode) => void;
  onDismiss: () => void;
}

export const ScannedPageBanner: React.FC<ScannedPageBannerProps> = ({
  pageIndex,
  reason,
  selectedLanguage,
  onSelectLanguage,
  onStartOcr,
  onDismiss
}) => {
  const languages = getSupportedOcrLanguages();

  return (
    <div
      role="region"
      aria-label="Scanned Page Notice"
      className="bg-primary/10 border-b border-primary/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm text-foreground animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-2.5 min-w-[280px]">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-primary">
          <Scan className="w-4 h-4" />
        </div>
        <div>
          <div className="font-medium flex items-center gap-1.5">
            <span>This page looks scanned</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-normal">
              Page {pageIndex + 1}
            </span>
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1">{reason}</div>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-2">
        <label htmlFor="ocr-lang-select" className="sr-only">
          OCR Language
        </label>
        <select
          id="ocr-lang-select"
          value={selectedLanguage}
          onChange={(e) => onSelectLanguage(e.target.value)}
          className="bg-background border border-border rounded-md px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary h-8"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.name} ({l.sizeLabel})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => onStartOcr('editable')}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm h-8"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Make Text Editable</span>
        </button>

        <button
          type="button"
          onClick={() => onStartOcr('searchable')}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors border border-border h-8"
        >
          <span>Make Searchable</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss banner"
          className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
