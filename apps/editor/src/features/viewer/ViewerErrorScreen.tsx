import React from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { Button } from '@rhypdf/ui';
import type { PdfErrorCode } from '@rhypdf/pdf-engine';

export interface ViewerErrorScreenProps {
  code?: PdfErrorCode | string;
  message?: string;
  fileName?: string;
  onBackToHome?: () => void;
  onRetry?: () => void;
  onOpenFile?: () => void;
}

export const ViewerErrorScreen: React.FC<ViewerErrorScreenProps> = ({
  code = 'Corrupt',
  message,
  fileName,
  onBackToHome,
  onRetry,
  onOpenFile
}) => {
  const { t } = useTranslation();

  const getErrorMessage = () => {
    switch (code) {
      case 'Corrupt':
        return t('editor.viewer.errorCorrupt');
      case 'Unsupported':
        return t('editor.viewer.errorUnsupported');
      case 'OutOfMemory':
        return t('editor.viewer.errorOutOfMemory');
      case 'IO':
        return t('editor.viewer.errorIO');
      default:
        return message || t('editor.viewer.errorCorrupt');
    }
  };

  const handleBackToHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      data-testid="viewer-error-screen"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
        width: '100%',
        padding: 'var(--space-4)',
        boxSizing: 'border-box',
        backgroundColor: 'var(--bg-canvas)'
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          color: 'var(--bg-card-foreground)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--bg-border)',
          boxShadow: 'var(--shadow-md)',
          maxWidth: 480,
          width: '100%',
          padding: 'var(--space-4)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-3)'
        }}
      >
        {/* Warning / Error Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--bg-destructive)'
          }}
          aria-hidden="true"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h2
            data-testid="viewer-error-title"
            style={{
              margin: 0,
              fontSize: 'var(--text-xl)',
              fontWeight: 600,
              color: 'var(--bg-foreground)'
            }}
          >
            {t('editor.viewer.errorTitle')}
          </h2>

          {fileName && (
            <span
              data-testid="viewer-error-filename"
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--bg-muted-foreground)',
                wordBreak: 'break-all'
              }}
            >
              {fileName}
            </span>
          )}

          <p
            data-testid="viewer-error-desc"
            style={{
              margin: 0,
              fontSize: 'var(--text-sm)',
              color: 'var(--bg-muted-foreground)',
              lineHeight: 1.5
            }}
          >
            {getErrorMessage()}
          </p>
        </div>

        {/* Technical Details Accordion */}
        {message && (
          <details
            data-testid="viewer-error-details"
            style={{
              width: '100%',
              textAlign: 'left',
              fontSize: 'var(--text-xs)',
              color: 'var(--bg-muted-foreground)',
              backgroundColor: 'var(--bg-muted)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              boxSizing: 'border-box'
            }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: 500 }}>
              {t('editor.viewer.technicalDetails')} ({code})
            </summary>
            <pre
              style={{
                marginTop: 8,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}
            >
              {message}
            </pre>
          </details>
        )}

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '8px',
            width: '100%'
          }}
        >
          {onRetry && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              data-testid="viewer-error-retry-btn"
              onClick={onRetry}
            >
              {t('editor.viewer.tryAgain')}
            </Button>
          )}

          {onOpenFile && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              data-testid="viewer-error-open-btn"
              onClick={onOpenFile}
            >
              {t('editor.viewer.openAnotherFile')}
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="md"
            data-testid="viewer-error-back-btn"
            onClick={handleBackToHome}
          >
            {t('editor.viewer.backToHome')}
          </Button>
        </div>
      </div>
    </div>
  );
};
