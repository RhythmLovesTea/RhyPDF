import React from 'react';
import { THEME_TOKENS } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';

export default function ToolbarSkeleton(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      data-testid="toolbar-skeleton"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: THEME_TOKENS.spacing.sm,
        padding: `${THEME_TOKENS.spacing.xs}px ${THEME_TOKENS.spacing.md}px`,
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc'
      }}
    >
      <button
        style={{
          padding: '6px 12px',
          borderRadius: THEME_TOKENS.radius.sm,
          border: '1px solid #cbd5e1',
          cursor: 'pointer'
        }}
      >
        {t('editor.toolbar.openDoc')}
      </button>
      <button
        style={{
          padding: '6px 12px',
          borderRadius: THEME_TOKENS.radius.sm,
          border: '1px solid #cbd5e1',
          cursor: 'pointer'
        }}
      >
        {t('editor.toolbar.zoomIn')}
      </button>
      <button
        style={{
          padding: '6px 12px',
          borderRadius: THEME_TOKENS.radius.sm,
          border: '1px solid #cbd5e1',
          cursor: 'pointer'
        }}
      >
        {t('editor.toolbar.zoomOut')}
      </button>
      <button
        style={{
          padding: '6px 12px',
          borderRadius: THEME_TOKENS.radius.sm,
          border: '1px solid #cbd5e1',
          cursor: 'pointer'
        }}
      >
        {t('editor.toolbar.savePdf')}
      </button>
    </div>
  );
}
