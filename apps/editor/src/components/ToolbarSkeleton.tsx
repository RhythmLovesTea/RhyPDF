import React from 'react';
import { THEME_TOKENS } from '@rhypdf/ui';

export default function ToolbarSkeleton(): React.JSX.Element {
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
      <button style={{ padding: '6px 12px', borderRadius: THEME_TOKENS.radius.sm, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
        Open Document
      </button>
      <button style={{ padding: '6px 12px', borderRadius: THEME_TOKENS.radius.sm, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
        Zoom In (+)
      </button>
      <button style={{ padding: '6px 12px', borderRadius: THEME_TOKENS.radius.sm, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
        Zoom Out (-)
      </button>
      <button style={{ padding: '6px 12px', borderRadius: THEME_TOKENS.radius.sm, border: '1px solid #cbd5e1', cursor: 'pointer' }}>
        Save PDF
      </button>
    </div>
  );
}
