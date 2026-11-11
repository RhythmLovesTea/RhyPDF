import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCheck, X } from 'lucide-react';
import type { OcrPageResult, OcrOutputMode } from '@rhypdf/ocr';

export interface OcrReviewDialogProps {
  isOpen: boolean;
  result: OcrPageResult | null;
  outputMode: OcrOutputMode;
  onConfirm: (updatedResult: OcrPageResult) => void;
  onCancel: () => void;
}

export const OcrReviewDialog: React.FC<OcrReviewDialogProps> = ({
  isOpen,
  result,
  outputMode,
  onConfirm,
  onCancel
}) => {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [editedBlocks, setEditedBlocks] = useState(result?.blocks || []);

  if (!isOpen || !result) return null;

  const blocks = editedBlocks.length > 0 ? editedBlocks : result.blocks;
  const currentBlock = blocks[currentBlockIndex] || blocks[0];
  const meanConfidence = Math.round(result.meanConfidence);

  const handleTextChange = (text: string) => {
    if (!currentBlock) return;
    const updated = [...blocks];
    updated[currentBlockIndex] = {
      ...currentBlock,
      text
    };
    setEditedBlocks(updated);
  };

  const handleNext = () => {
    if (currentBlockIndex < blocks.length - 1) {
      setCurrentBlockIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    onConfirm({
      ...result,
      blocks
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ocr-review-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
    >
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-2xl max-w-lg w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <h3 id="ocr-review-title" className="font-semibold text-base">
              Review OCR Text
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                meanConfidence >= 85
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : meanConfidence >= 60
                    ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
              }`}
            >
              {meanConfidence}% Confidence
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Task 10.14: Handwriting Warning Notice */}
        {result.isHandwritingSuspected && (
          <div className="flex items-start gap-2.5 p-3 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <span className="font-semibold">Handwritten content detected:</span> Handwriting OCR
              is not supported in v1.0. Results may contain inaccuracies. Please review the text
              carefully.
            </div>
          </div>
        )}

        {/* Current Block Inspection */}
        {currentBlock && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Block {currentBlockIndex + 1} of {blocks.length}
              </span>
              <span
                className={`font-medium ${
                  currentBlock.confidence < 70
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-muted-foreground'
                }`}
              >
                Block Confidence: {Math.round(currentBlock.confidence)}%
                {currentBlock.confidence < 70 ? ' (Low)' : ''}
              </span>
            </div>

            <textarea
              value={currentBlock.text}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={4}
              className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              placeholder="OCR extracted text..."
            />
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">
            Mode: <span className="font-medium capitalize">{outputMode}</span>
          </div>

          <div className="flex items-center gap-2">
            {blocks.length > 1 && currentBlockIndex < blocks.length - 1 && (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors border border-border"
              >
                <span>Accept & Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleComplete}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Apply to Document</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
