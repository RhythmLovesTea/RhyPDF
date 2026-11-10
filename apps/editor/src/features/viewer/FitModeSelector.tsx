import React from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { THEME_TOKENS } from '@rhypdf/ui';
import type { FitMode } from './fit-mode';

export interface FitModeSelectorProps {
  currentMode: FitMode;
  onModeChange: (mode: FitMode) => void;
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

export const FitModeSelector: React.FC<FitModeSelectorProps> = ({
  currentMode,
  onModeChange,
  theme = 'light',
  className = '',
  style
}) => {
  const { t } = useTranslation();
  const isDark = theme === 'dark';

  const modes: { id: FitMode; labelKey: string; defaultLabel: string }[] = [
    { id: 'fitWidth', labelKey: 'editor.viewer.fitWidth', defaultLabel: 'Fit Width' },
    { id: 'fitPage', labelKey: 'editor.viewer.fitPage', defaultLabel: 'Fit Page' },
    { id: 'actualSize', labelKey: 'editor.viewer.actualSize', defaultLabel: '100%' }
  ];

  return (
    <div
      data-testid="fit-mode-selector"
      role="group"
      aria-label="Fit mode options"
      className={`fit-mode-selector ${className}`}
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
            data-testid={`fit-mode-button-${mode.id}`}
            data-is-active={isActive}
            aria-pressed={isActive}
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
