import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@rhypdf/ui';
import { Copy, Download, Check } from 'lucide-react';
import type { AnnotationObject } from '@rhypdf/pdf-model';
import type { AnnotationSummaryFormat } from '@rhypdf/edit-core';
import { generateAnnotationSummary } from '@rhypdf/edit-core';

export interface AnnotationSummaryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  annotationsByPage: Map<number, AnnotationObject[]>;
  documentName?: string;
}

export const AnnotationSummaryDialog: React.FC<AnnotationSummaryDialogProps> = ({
  isOpen,
  onClose,
  annotationsByPage,
  documentName = 'document'
}) => {
  const { t } = useTranslation();
  const [format, setFormat] = useState<AnnotationSummaryFormat>('markdown');
  const [copied, setCopied] = useState(false);

  const report = useMemo(() => generateAnnotationSummary(annotationsByPage, format), [annotationsByPage, format]);

  const handleCopy = () => {
    navigator.clipboard.writeText(report.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const ext = format === 'markdown' ? 'md' : format === 'json' ? 'json' : 'txt';
    const mime = format === 'json' ? 'application/json' : 'text/plain';
    const blob = new Blob([report.content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentName}-annotations.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={t('editor.annotations.summaryTitle', { defaultValue: 'Export Annotation Summary' })}
    >
      <div data-testid="annotation-summary-dialog" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Top Stats & Format Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: 'var(--bg-muted)' }}>
            <span>{report.totalAnnotations} annotations across {report.pagesWithAnnotations.length} pages</span>
          </div>

          <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg-secondary)', padding: 3, borderRadius: 'var(--radius-sm)' }}>
            {(['markdown', 'text', 'json'] as AnnotationSummaryFormat[]).map((fmt) => (
              <button
                key={fmt}
                data-testid={`btn-format-${fmt}`}
                onClick={() => setFormat(fmt)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: format === fmt ? 600 : 400,
                  backgroundColor: format === fmt ? 'var(--bg-card)' : 'transparent',
                  color: format === fmt ? 'var(--bg-primary)' : 'inherit',
                  cursor: 'pointer'
                }}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Preview box */}
        <textarea
          data-testid="textarea-summary-preview"
          readOnly
          value={report.content}
          rows={12}
          style={{
            width: '100%',
            padding: 10,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--bg-border)',
            backgroundColor: 'var(--bg-secondary)',
            fontFamily: format === 'json' ? 'monospace' : 'inherit',
            fontSize: 12,
            lineHeight: 1.5,
            resize: 'vertical',
            boxSizing: 'border-box'
          }}
        />

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            data-testid="btn-copy-summary"
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            {copied ? <Check size={15} color="#16a34a" /> : <Copy size={15} />}
            <span>{copied ? 'Copied!' : t('common.copy', { defaultValue: 'Copy' })}</span>
          </button>

          <button
            data-testid="btn-download-summary"
            onClick={handleDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--bg-primary)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            <Download size={15} />
            <span>{t('common.download', { defaultValue: 'Download Summary' })}</span>
          </button>
        </div>
      </div>
    </Dialog>
  );
};
