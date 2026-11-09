import React from 'react';
import { THEME_TOKENS } from '@rhypdf/ui';
import { SAMPLE_FIXTURES } from '@rhypdf/test-fixtures';

export default function SidebarSkeleton(): React.JSX.Element {
  return (
    <aside
      data-testid="sidebar-skeleton"
      style={{
        width: 240,
        borderRight: '1px solid #e2e8f0',
        padding: THEME_TOKENS.spacing.md,
        backgroundColor: '#fafafa',
        overflowY: 'auto'
      }}
    >
      <h3
        style={{
          fontSize: THEME_TOKENS.typography.typeScale.sm,
          textTransform: 'uppercase',
          color: '#64748b',
          marginTop: 0
        }}
      >
        Pages &amp; Thumbnails
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {Object.entries(SAMPLE_FIXTURES)
          .slice(0, 5)
          .map(([key, item], idx) => (
            <li
              key={key}
              style={{
                padding: `${THEME_TOKENS.spacing.xs}px ${THEME_TOKENS.spacing.sm}px`,
                marginBottom: 4,
                borderRadius: THEME_TOKENS.radius.sm,
                backgroundColor: idx === 0 ? '#e0f2fe' : '#ffffff',
                border: '1px solid #e2e8f0',
                fontSize: THEME_TOKENS.typography.typeScale.xs,
                cursor: 'pointer'
              }}
            >
              Page {idx + 1}: {item.filename.replace('.pdf', '')}
            </li>
          ))}
      </ul>
    </aside>
  );
}
