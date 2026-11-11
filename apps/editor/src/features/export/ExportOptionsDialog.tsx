import React, { useState, useMemo } from 'react';
import { Button } from '@rhypdf/ui';
import { X, Sliders, CheckSquare, Layers, FileText } from 'lucide-react';
import type { ExportOptions } from '@rhypdf/edit-core';
import { estimateExportSize } from '@rhypdf/edit-core';

export interface ExportOptionsDialogProps {
  isOpen: boolean;
  currentFileSize?: number;
  onClose: () => void;
  onExport: (options: ExportOptions) => void;
}

export const ExportOptionsDialog: React.FC<ExportOptionsDialogProps> = ({
  isOpen,
  currentFileSize = 1024 * 500, // default 500 KB fallback
  onClose,
  onExport
}) => {
  const [imageQuality, setImageQuality] = useState(0.85);
  const [flattenAnnotations, setFlattenAnnotations] = useState(false);
  const [flattenForms, setFlattenForms] = useState(false);
  const [embedFonts, setEmbedFonts] = useState<'subset' | 'full' | 'standard'>('subset');
  const [optimizeSize, setOptimizeSize] = useState(true);
  const [pdfVersion, setPdfVersion] = useState<'1.4' | '1.5' | '1.6' | '1.7' | '2.0'>('1.7');

  const estimatedSize = useMemo(() => {
    return estimateExportSize(currentFileSize, {
      optimizeSize,
      flattenAnnotations,
      flattenForms,
      quality: imageQuality
    });
  }, [currentFileSize, optimizeSize, flattenAnnotations, flattenForms, imageQuality]);

  const formatSize = (bytes: number): string => {
    if (bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="dialog-export-options"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--bg-foreground, #0f172a)',
          borderRadius: 12,
          padding: 24,
          width: '90%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sliders size={20} color="var(--bg-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>PDF Export Options</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bg-muted-foreground, #64748b)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Size Estimate Banner */}
        <div
          data-testid="export-size-estimate-banner"
          style={{
            padding: '10px 14px',
            backgroundColor: 'var(--bg-secondary, #f1f5f9)',
            borderRadius: 8,
            marginBottom: 18,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 13
          }}
        >
          <span>Estimated Export Size:</span>
          <span style={{ fontWeight: 600, color: 'var(--bg-primary, #2563eb)' }}>
            ~{formatSize(estimatedSize)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Image Quality */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label htmlFor="range-image-quality" style={{ fontSize: 13, fontWeight: 500 }}>
                Image Quality ({Math.round(imageQuality * 100)}%)
              </label>
              <span style={{ fontSize: 12, color: 'var(--bg-muted-foreground, #64748b)' }}>
                {imageQuality >= 0.85 ? 'High' : imageQuality >= 0.7 ? 'Medium' : 'Low'}
              </span>
            </div>
            <input
              id="range-image-quality"
              data-testid="input-image-quality"
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={imageQuality}
              onChange={(e) => setImageQuality(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* PDF Version */}
          <div>
            <label htmlFor="select-pdf-version" style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              PDF Specification Version
            </label>
            <select
              id="select-pdf-version"
              data-testid="select-pdf-version"
              value={pdfVersion}
              onChange={(e) => setPdfVersion(e.target.value as '1.4' | '1.5' | '1.6' | '1.7' | '2.0')}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'inherit',
                fontSize: 13
              }}
            >
              <option value="1.4">PDF 1.4 (Acrobat 5 - Maximum compatibility)</option>
              <option value="1.5">PDF 1.5 (Acrobat 6 - Object Streams enabled)</option>
              <option value="1.6">PDF 1.6 (Acrobat 7 - AES support)</option>
              <option value="1.7">PDF 1.7 (ISO 32000-1 - Recommended)</option>
              <option value="2.0">PDF 2.0 (ISO 32000-2 - Modern standard)</option>
            </select>
          </div>

          {/* Font Embedding */}
          <div>
            <label htmlFor="select-embed-fonts" style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
              Font Embedding
            </label>
            <select
              id="select-embed-fonts"
              data-testid="select-embed-fonts"
              value={embedFonts}
              onChange={(e) => setEmbedFonts(e.target.value as 'subset' | 'full' | 'standard')}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'inherit',
                fontSize: 13
              }}
            >
              <option value="subset">Subset only used glyphs (Recommended - smallest size)</option>
              <option value="full">Full font program embedding</option>
              <option value="standard">Standard 14 Base fonts without embedding</option>
            </select>
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                data-testid="toggle-optimize-size"
                type="checkbox"
                checked={optimizeSize}
                onChange={(e) => setOptimizeSize(e.target.checked)}
              />
              <Layers size={16} />
              <span>Compress streams with Object Streams (PDF 1.5+)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                data-testid="toggle-flatten-annotations"
                type="checkbox"
                checked={flattenAnnotations}
                onChange={(e) => setFlattenAnnotations(e.target.checked)}
              />
              <FileText size={16} />
              <span>Flatten annotations into static vector graphics</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input
                data-testid="toggle-flatten-forms"
                type="checkbox"
                checked={flattenForms}
                onChange={(e) => setFlattenForms(e.target.checked)}
              />
              <CheckSquare size={16} />
              <span>Flatten interactive form fields into static text</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="btn-confirm-export"
            variant="primary"
            onClick={() => {
              onExport({
                imageQuality,
                flattenAnnotations,
                flattenForms,
                embedFonts,
                optimizeSize,
                pdfVersion
              });
            }}
          >
            Export PDF
          </Button>
        </div>
      </div>
    </div>
  );
};
