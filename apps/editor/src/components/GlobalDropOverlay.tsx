import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { extractPdfFromDrop, extractPdfFromPaste } from '../lib/fileOpen';

export interface GlobalDropOverlayProps {
  onFileLoaded: (file: File) => void;
  children?: React.ReactNode;
}

export const GlobalDropOverlay: React.FC<GlobalDropOverlayProps> = ({ onFileLoaded, children }) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      const file = extractPdfFromDrop(e);
      if (file) {
        onFileLoaded(file);
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept paste inside active input / textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const file = extractPdfFromPaste(e);
      if (file) {
        e.preventDefault();
        onFileLoaded(file);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('paste', handlePaste);
    };
  }, [onFileLoaded]);

  return (
    <>
      {children}
      {isDragging && (
        <div
          data-testid="global-drop-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '4px dashed var(--bg-primary, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(2px)',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              padding: '24px 40px',
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: 'var(--radius-lg, 12px)',
              boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))',
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--bg-primary, #2563eb)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <span style={{ fontSize: 28 }}>📄</span>
            <span>{t('home.globalDropTitle')}</span>
          </div>
        </div>
      )}
    </>
  );
};
