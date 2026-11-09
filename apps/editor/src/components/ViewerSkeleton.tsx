import React from 'react';
import { THEME_TOKENS } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';

interface ViewerSkeletonProps {
  wasmStatus: string;
}

export default function ViewerSkeleton({ wasmStatus }: ViewerSkeletonProps): React.JSX.Element {
  const { t } = useTranslation();

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
        <div
          data-testid="pdfium-status"
          style={{
            marginTop: THEME_TOKENS.spacing.md,
            padding: '6px 12px',
            borderRadius: THEME_TOKENS.radius.full,
            fontSize: THEME_TOKENS.typography.typeScale.xs,
            fontWeight: 600,
            backgroundColor: wasmStatus.includes('initialized') ? '#dcfce7' : '#fef3c7',
            color: wasmStatus.includes('initialized') ? '#166534' : '#92400e'
          }}
        >
          {t('editor.viewer.pdfiumStatus', { status: wasmStatus })}
        </div>
      </div>
    </div>
  );
}
