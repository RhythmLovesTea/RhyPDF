import React, { useState, useMemo } from 'react';
import { Button } from '@rhypdf/ui';
import { X, Minimize2, Check } from 'lucide-react';
import type { CompressPdfOptions } from '@rhypdf/edit-core';
import { estimateExportSize } from '@rhypdf/edit-core';

export interface CompressPdfDialogProps {
  isOpen: boolean;
  currentFileSize?: number;
  onClose: () => void;
  onCompress: (options: CompressPdfOptions) => void;
}

export const CompressPdfDialog: React.FC<CompressPdfDialogProps> = ({
  isOpen,
  currentFileSize = 1024 * 1024 * 2, // default 2MB
  onClose,
  onCompress
}) => {
  const [selectedPreset, setSelectedPreset] = useState<'high' | 'medium' | 'low'>('medium');
  const [removeMetadata, setRemoveMetadata] = useState(true);

  const estimatedSize = useMemo(() => {
    return estimateExportSize(currentFileSize, {
      quality: selectedPreset,
      removeMetadata,
      useObjectStreams: true
    });
  }, [currentFileSize, selectedPreset, removeMetadata]);

  const savingsPercent = useMemo(() => {
    if (currentFileSize <= 0) return 0;
    return Math.max(0, Math.round(((currentFileSize - estimatedSize) / currentFileSize) * 100));
  }, [currentFileSize, estimatedSize]);

  const formatSize = (bytes: number): string => {
    if (bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="dialog-compress-pdf"
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
          maxWidth: 460,
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Minimize2 size={20} color="var(--bg-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Compress PDF</h3>
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

        {/* Comparison card */}
        <div
          data-testid="compress-comparison-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: 'var(--bg-secondary, #f8fafc)',
            borderRadius: 8,
            marginBottom: 20
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground, #64748b)' }}>
              Current Size
            </div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{formatSize(currentFileSize)}</div>
          </div>
          <div style={{ fontSize: 20, color: 'var(--bg-muted-foreground, #94a3b8)' }}>→</div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground, #64748b)' }}>
              Estimated Size
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#10b981' }}>
              {formatSize(estimatedSize)} (-{savingsPercent}%)
            </div>
          </div>
        </div>

        {/* Compression Presets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <label
            data-testid="preset-extreme"
            onClick={() => setSelectedPreset('low')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${selectedPreset === 'low' ? 'var(--bg-primary, #2563eb)' : 'var(--bg-border, #e2e8f0)'}`,
              backgroundColor: selectedPreset === 'low' ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
              cursor: 'pointer'
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Extreme Compression</div>
              <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground, #64748b)' }}>
                Lowest file size, reduced image resolution
              </div>
            </div>
            {selectedPreset === 'low' && <Check size={18} color="var(--bg-primary, #2563eb)" />}
          </label>

          <label
            data-testid="preset-recommended"
            onClick={() => setSelectedPreset('medium')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${selectedPreset === 'medium' ? 'var(--bg-primary, #2563eb)' : 'var(--bg-border, #e2e8f0)'}`,
              backgroundColor:
                selectedPreset === 'medium' ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
              cursor: 'pointer'
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Recommended Compression</div>
              <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground, #64748b)' }}>
                Balanced quality and size reduction
              </div>
            </div>
            {selectedPreset === 'medium' && <Check size={18} color="var(--bg-primary, #2563eb)" />}
          </label>

          <label
            data-testid="preset-mild"
            onClick={() => setSelectedPreset('high')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${selectedPreset === 'high' ? 'var(--bg-primary, #2563eb)' : 'var(--bg-border, #e2e8f0)'}`,
              backgroundColor:
                selectedPreset === 'high' ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
              cursor: 'pointer'
            }}
          >
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>High Quality</div>
              <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground, #64748b)' }}>
                Mild compression, sharpest images
              </div>
            </div>
            {selectedPreset === 'high' && <Check size={18} color="var(--bg-primary, #2563eb)" />}
          </label>
        </div>

        {/* Options */}
        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <input
              data-testid="toggle-remove-metadata"
              type="checkbox"
              checked={removeMetadata}
              onChange={(e) => setRemoveMetadata(e.target.checked)}
            />
            <span>Strip unneeded metadata & unreferenced objects</span>
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            data-testid="btn-confirm-compress"
            variant="primary"
            onClick={() => {
              onCompress({
                quality: selectedPreset,
                removeMetadata,
                useObjectStreams: true
              });
            }}
          >
            Compress & Download
          </Button>
        </div>
      </div>
    </div>
  );
};
