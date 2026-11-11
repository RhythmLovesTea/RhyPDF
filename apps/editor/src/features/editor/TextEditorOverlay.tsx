import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CoordinateMapper, RotationAngle } from '@rhypdf/pdf-model';
import { SimpleTextLayoutEngine } from '@rhypdf/text-layout';
import type { TextBlock, CommitTextBlockOptions } from '@rhypdf/edit-core';
import { AlertTriangle, ArrowDown, Minimize2, Check, X } from 'lucide-react';

export interface TextEditorOverlayProps {
  block: TextBlock;
  pageWidthPt: number;
  pageHeightPt: number;
  rotation?: RotationAngle;
  scale?: number;
  dpr?: number;
  onCommit: (blockId: string, newLines: string[], options?: CommitTextBlockOptions) => void;
  onCancel: () => void;
  onGrowDownward?: (blockId: string, additionalHeightPt: number) => void;
  onShrinkToFit?: (blockId: string, newFontSize: number) => void;
}

const layoutEngine = new SimpleTextLayoutEngine();

export const TextEditorOverlay: React.FC<TextEditorOverlayProps> = ({
  block,
  pageWidthPt,
  pageHeightPt,
  rotation = 0,
  scale = 1.0,
  dpr = 1.0,
  onCommit,
  onCancel,
  onGrowDownward,
  onShrinkToFit
}) => {
  const mapper = new CoordinateMapper(pageWidthPt, pageHeightPt, rotation, scale, dpr);
  const boxCss = mapper.pdfRectToCss(block.bounds);

  const initialText = block.lines.map((l) => l.text).join('\n');
  const [text, setText] = useState(initialText);
  const [fontSize, setFontSize] = useState(block.primaryFontSize);
  const [fontFamily] = useState(
    !block.fontReusability.canReuseFont
      ? block.fontReusability.recommendedFallback
      : block.primaryFont
  );
  const [isComposing, setIsComposing] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [missingGlyphNotice, setMissingGlyphNotice] = useState<string | null>(
    !block.fontReusability.canReuseFont
      ? `Font changed to ${block.fontReusability.recommendedFallback} to keep all letters`
      : null
  );

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const originalHeightPt = block.bounds.top - block.bounds.bottom;
  const originalWidthPt = block.bounds.right - block.bounds.left;

  // Auto-focus and select all or caret at end on mount (Task 7.7)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(text.length, text.length);
    }
  }, []);

  // Live layout check for overflow (Task 7.10)
  const checkOverflow = useCallback(
    async (currentText: string, currentFontSize: number) => {
      try {
        const layout = await layoutEngine.layout(currentText, {
          fontSize: currentFontSize,
          maxWidth: originalWidthPt,
          lineHeight: 1.25
        });
        const exceeds = layout.height > originalHeightPt + 4;
        setIsOverflowing(exceeds);
      } catch {
        // Fallback
      }
    },
    [originalWidthPt, originalHeightPt]
  );

  useEffect(() => {
    void checkOverflow(text, fontSize);
  }, [text, fontSize, checkOverflow]);

  // Handle shrink to fit (Task 7.10)
  const handleShrinkToFit = async () => {
    const { fontSize: newSize } = await layoutEngine.calculateShrinkToFit(
      text,
      { fontSize, maxWidth: originalWidthPt, lineHeight: 1.25 },
      originalHeightPt,
      7
    );
    setFontSize(newSize);
    onShrinkToFit?.(block.id, newSize);
  };

  // Handle grow downward (Task 7.10)
  const handleGrowDownward = async () => {
    const layout = await layoutEngine.layout(text, {
      fontSize,
      maxWidth: originalWidthPt,
      lineHeight: 1.25
    });
    const extraHeight = Math.max(20, layout.height - originalHeightPt + 10);
    onGrowDownward?.(block.id, extraHeight);
    setIsOverflowing(false);
  };

  const handleCommit = () => {
    const lines = text.split('\n');
    onCommit(block.id, lines, {
      fontName: fontFamily,
      fontSize,
      color: block.primaryColor,
      alignment: block.alignment
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isComposing) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleCommit();
    }
  };

  const colorRgba = `rgba(${block.primaryColor.r}, ${block.primaryColor.g}, ${block.primaryColor.b}, ${block.primaryColor.a / 255})`;

  return (
    <div
      data-testid="text-editor-overlay"
      style={{
        position: 'absolute',
        left: boxCss.x - 2,
        top: boxCss.y - 2,
        width: Math.max(boxCss.width + 4, 100),
        minHeight: Math.max(boxCss.height + 4, 32),
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Missing glyph notice toast (Task 7.12) */}
      {missingGlyphNotice && (
        <div
          data-testid="notice-missing-glyph"
          style={{
            backgroundColor: '#fef3c7',
            color: '#92400e',
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 4,
            marginBottom: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <span>{missingGlyphNotice}</span>
          <button
            onClick={() => setMissingGlyphNotice(null)}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Primary In-Place Textarea (Task 7.7, 7.8, 7.9) */}
      <textarea
        ref={textareaRef}
        data-testid="inline-text-editor-surface"
        value={text}
        dir="auto"
        spellCheck={true}
        onChange={(e) => setText(e.target.value)}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onKeyDown={handleKeyDown}
        onPaste={(e) => {
          // Paste as plain text (Task 7.8)
          e.preventDefault();
          const plain = e.clipboardData.getData('text/plain');
          const el = textareaRef.current;
          if (el) {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const next = text.slice(0, start) + plain + text.slice(end);
            setText(next);
            setTimeout(() => {
              el.setSelectionRange(start + plain.length, start + plain.length);
            }, 0);
          }
        }}
        style={{
          width: '100%',
          minHeight: boxCss.height,
          padding: '2px 4px',
          fontFamily: fontFamily.includes('sans') ? 'sans-serif' : fontFamily.includes('mono') ? 'monospace' : fontFamily,
          fontSize: fontSize * scale,
          fontWeight: block.isBold ? 'bold' : 'normal',
          fontStyle: block.isItalic ? 'italic' : 'normal',
          textDecoration: [
            block.isUnderline ? 'underline' : '',
            block.isStrikethrough ? 'line-through' : ''
          ].filter(Boolean).join(' ') || 'none',
          letterSpacing: block.letterSpacing !== undefined ? `${block.letterSpacing}pt` : undefined,
          lineHeight: block.lineSpacing ? block.lineSpacing : 1.25,
          color: colorRgba,
          textAlign: block.alignment,
          backgroundColor: block.highlightColor
            ? `rgba(${block.highlightColor.r}, ${block.highlightColor.g}, ${block.highlightColor.b}, 0.35)`
            : 'rgba(255, 255, 255, 0.95)',
          opacity: block.opacity !== undefined ? block.opacity / 100 : 1,
          border: '1.5px solid #2563eb',
          borderRadius: 3,
          boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.2)',
          outline: 'none',
          resize: 'none',
          overflow: 'hidden',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          caretColor: '#2563eb'
        }}
      />

      {/* Overflow Indicator Bar (Task 7.10) */}
      {isOverflowing && (
        <div
          data-testid="text-overflow-indicator"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: 4,
            padding: '4px 8px',
            marginTop: 4,
            fontSize: 11,
            color: '#991b1b',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          <AlertTriangle size={14} color="#dc2626" />
          <span>Text overflows box</span>
          <button
            data-testid="btn-grow-downward"
            onClick={handleGrowDownward}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '2px 6px',
              backgroundColor: '#ffffff',
              border: '1px solid #fca5a5',
              borderRadius: 3,
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            <ArrowDown size={12} />
            Grow box
          </button>
          <button
            data-testid="btn-shrink-to-fit"
            onClick={handleShrinkToFit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              padding: '2px 6px',
              backgroundColor: '#ffffff',
              border: '1px solid #fca5a5',
              borderRadius: 3,
              fontSize: 11,
              cursor: 'pointer'
            }}
          >
            <Minimize2 size={12} />
            Shrink to fit
          </button>
        </div>
      )}

      {/* Action buttons (Commit / Cancel) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 6,
          marginTop: 4
        }}
      >
        <button
          data-testid="btn-cancel-edit"
          onClick={onCancel}
          style={{
            padding: '2px 8px',
            fontSize: 11,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--bg-border)',
            borderRadius: 3,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <X size={12} />
          Cancel
        </button>
        <button
          data-testid="btn-commit-edit"
          onClick={handleCommit}
          style={{
            padding: '2px 8px',
            fontSize: 11,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <Check size={12} />
          Done
        </button>
      </div>
    </div>
  );
};
