import React from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { THEME_TOKENS } from '@rhypdf/ui';
import type { PageLayoutMode } from './layout-modes';

export interface LayoutModeSelectorProps {
  currentMode: PageLayoutMode;
  onModeChange: (mode: PageLayoutMode) => void;
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

export const LayoutModeSelector: React.FC<LayoutModeSelectorProps> = ({
  currentMode,
  onModeChange,
  theme = 'light',
  className = '',
  style
}) => {
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const modes: { id: PageLayoutMode; labelKey: string; defaultLabel: string }[] = [
    {
      id: 'continuous',
      labelKey: 'editor.viewer.continuousMode',
      defaultLabel: 'Continuous'
    },
    {
      id: 'single',
      labelKey: 'editor.viewer.singlePageMode',
      defaultLabel: 'Single Page'
    },
    {
      id: 'twoPage',
      labelKey: 'editor.viewer.twoPageMode',
      defaultLabel: 'Two Pages'
    }
  ];

  return (
    <div
      data-testid="layout-mode-selector"
      role="radiogroup"
      aria-label="Page layout modes"
      className={`layout-mode-selector ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: 2,
        borderRadius: THEME_TOKENS.radius.sm,
        backgroundColor: isDark ? '#1e293b' : '#f1f5f9',
        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        ...style
      }}
    >
      {modes.map((mode) => {
        const isActive = currentMode === mode.id;

        return (
          <button
            key={mode.id}
            data-testid={`layout-mode-button-${mode.id}`}
            data-is-active={isActive}
            role="radio"
            aria-checked={isActive}
            type="button"
            onClick={() => onModeChange(mode.id)}
            style={{
              padding: '3px 8px',
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              borderRadius: 3,
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isActive ? (isDark ? '#334155' : '#ffffff') : 'transparent',
              color: isActive ? (isDark ? '#f8fafc' : '#0f172a') : isDark ? '#94a3b8' : '#64748b',
              boxShadow: isActive ? '0 1px 2px rgba(0, 0, 0, 0.08)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {t(mode.labelKey, { defaultValue: mode.defaultLabel })}
          </button>
        );
      })}
    </div>
  );
};
