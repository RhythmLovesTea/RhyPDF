import React, { useState } from 'react';
import { Switch, Select, Slider, Button } from '@rhypdf/ui';
import { SUPPORTED_LOCALES, LocaleCode, useTranslation } from '@rhypdf/i18n';
import { useUIStore } from '../../stores/uiStore';

export default function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const locale = useUIStore((state) => state.locale);
  const setLocale = useUIStore((state) => state.setLocale);

  const [ocrAuto, setOcrAuto] = useState(true);
  const [memoryWarningThreshold, setMemoryWarningThreshold] = useState(50);
  const [saved, setSaved] = useState(false);
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error('Intentional crash test triggered for ErrorBoundary verification');
  }

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div data-testid="page-settings" style={{ padding: 32, maxWidth: 680, marginInline: 'auto' }}>
      <header
        style={{ marginBottom: 24, borderBottom: '1px solid var(--bg-border)', paddingBottom: 16 }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t('settings.title')}</h1>
        <p style={{ color: 'var(--bg-muted-foreground)', fontSize: 14, margin: '4px 0 0' }}>
          {t('settings.subtitle')}
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>{t('settings.themeTitle')}</label>
          <Select
            value={theme}
            onChange={(val) => setTheme(val as 'light' | 'dark' | 'system')}
            options={[
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'system', label: t('settings.themeSystem') }
            ]}
          />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>{t('settings.languageTitle')}</label>
          <Select
            data-testid="select-language"
            value={locale}
            onChange={(val) => setLocale(val as LocaleCode)}
            options={Object.entries(SUPPORTED_LOCALES).map(([code, meta]) => ({
              value: code,
              label: `${meta.label} (${meta.dir.toUpperCase()})`
            }))}
          />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>{t('settings.ocrTitle')}</label>
          <Switch label={t('settings.ocrDesc')} checked={ocrAuto} onChange={setOcrAuto} />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>{t('settings.memoryTitle')}</label>
          <Slider
            min={20}
            max={150}
            step={5}
            value={memoryWarningThreshold}
            onChange={setMemoryWarningThreshold}
          />
          <span style={{ fontSize: 12, color: 'var(--bg-muted-foreground)' }}>
            {t('settings.memoryDesc', { mb: memoryWarningThreshold })}
          </span>
        </section>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <Button data-testid="btn-save-settings" variant="primary" onClick={handleSave}>
            {t('settings.btnSave')}
          </Button>
          <Button
            data-testid="btn-crash-trigger"
            variant="destructive"
            onClick={() => setShouldCrash(true)}
          >
            {t('settings.btnCrash')}
          </Button>
          {saved && (
            <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 500 }}>
              {t('settings.savedToast')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
