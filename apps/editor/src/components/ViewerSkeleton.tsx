import React from 'react';
import { THEME_TOKENS } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';

interface ViewerSkeletonProps {
  wasmStatus: string;
  wasmProgress?: number;
  wasmPhase?: string;
}

export default function ViewerSkeleton({
  wasmStatus,
  wasmProgress = 100,
  wasmPhase = 'ready'
}: ViewerSkeletonProps): React.JSX.Element {
  const { t } = useTranslation();
  const isReady = wasmStatus.includes('initialized');

  return (
    <div
      data-testid="viewer-skeleton"
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: THEME_TOKENS.spacing.xl,
        backgroundColor: '#f1f5f9'
      }}
    >
      <div
        style={{
          width: 420,
          height: 594,
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          borderRadius: THEME_TOKENS.radius.sm,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: THEME_TOKENS.spacing.lg,
          textAlign: 'center'
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: THEME_TOKENS.typography.typeScale.lg,
            marginBottom: 8
          }}
        >
          {t('editor.viewer.viewportTitle')}
        </div>
        <p style={{ color: '#64748b', fontSize: THEME_TOKENS.typography.typeScale.sm, margin: 0 }}>
          {t('editor.viewer.renderSurface')}
        </p>

        {!isReady && (
          <div
            data-testid="wasm-loading-container"
            style={{
              marginTop: 16,
              width: 220,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: '100%',
                height: 6,
                backgroundColor: '#e2e8f0',
                borderRadius: 3,
                overflow: 'hidden'
              }}
            >
              <div
                data-testid="wasm-progress-bar"
                style={{
                  width: `${wasmProgress}%`,
                  height: '100%',
                  backgroundColor: '#2563eb',
                  transition: 'width 0.2s ease-in-out'
                }}
              />
            </div>
            <span
              data-testid="wasm-progress-text"
              style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}
            >
              {wasmPhase}: {wasmProgress}%
            </span>
          </div>
        )}

        <div
          data-testid="pdfium-status"
          style={{
            marginTop: THEME_TOKENS.spacing.md,
            padding: '6px 12px',
            borderRadius: THEME_TOKENS.radius.full,
            fontSize: THEME_TOKENS.typography.typeScale.xs,
            fontWeight: 600,
            backgroundColor: isReady ? '#dcfce7' : '#fef3c7',
            color: isReady ? '#166534' : '#92400e'
          }}
        >
          {t('editor.viewer.pdfiumStatus', { status: wasmStatus })}
        </div>
      </div>
    </div>
  );
}
