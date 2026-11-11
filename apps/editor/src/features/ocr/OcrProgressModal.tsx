import React from 'react';
import { Loader2, XCircle } from 'lucide-react';
import type { OcrProgress } from '@rhypdf/ocr';

export interface OcrProgressModalProps {
  isOpen: boolean;
  progress: OcrProgress | null;
  onCancel: () => void;
}

export const OcrProgressModal: React.FC<OcrProgressModalProps> = ({
  isOpen,
  progress,
  onCancel
}) => {
  if (!isOpen) return null;

  const percent = Math.round((progress?.progress ?? 0) * 100);
  const statusMessage = progress?.message || 'Processing page with OCR...';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-progress-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-xl max-w-sm w-full p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>

        <div className="space-y-1">
          <h3 id="ocr-progress-title" className="font-semibold text-base">
            Optical Character Recognition
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{statusMessage}</p>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5 text-left">
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>Progress</span>
            <span>{percent}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors border border-destructive/20"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel OCR</span>
          </button>
        </div>
      </div>
    </div>
  );
};
