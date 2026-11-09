import React, { useState } from 'react';
import { Switch, Select, Slider, Button } from '@rhypdf/ui';
import { SUPPORTED_LOCALES, LocaleCode } from '@rhypdf/i18n';

export default function SettingsPage(): React.JSX.Element {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [locale, setLocale] = useState<LocaleCode>('en');
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
    <div data-testid="page-settings" style={{ padding: 32, maxWidth: 680, margin: '0 auto' }}>
      <header
        style={{ marginBottom: 24, borderBottom: '1px solid var(--bg-border)', paddingBottom: 16 }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Application Settings</h1>
        <p style={{ color: 'var(--bg-muted-foreground)', fontSize: 14, margin: '4px 0 0' }}>
          Configure appearance, performance thresholds, and OCR defaults.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Theme Appearance</label>
          <Select
            value={theme}
            onChange={(val) => setTheme(val as 'light' | 'dark' | 'system')}
            options={[
              { value: 'light', label: 'Light Mode' },
              { value: 'dark', label: 'Dark Mode' },
              { value: 'system', label: 'Match System' }
            ]}
          />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Language &amp; Region</label>
          <Select
            value={locale}
            onChange={(val) => setLocale(val as LocaleCode)}
            options={Object.entries(SUPPORTED_LOCALES).map(([code, meta]) => ({
              value: code,
              label: `${meta.label} (${meta.dir.toUpperCase()})`
            }))}
          />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>OCR Auto-Detection</label>
          <Switch
            label="Automatically scan imported images for editable text"
            checked={ocrAuto}
            onChange={setOcrAuto}
          />
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>Memory Warning Threshold (MB)</label>
          <Slider
            min={20}
            max={150}
            step={5}
            value={memoryWarningThreshold}
            onChange={setMemoryWarningThreshold}
          />
          <span style={{ fontSize: 12, color: 'var(--bg-muted-foreground)' }}>
            Alert user when document memory exceeds {memoryWarningThreshold} MB.
          </span>
        </section>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
          <Button data-testid="btn-save-settings" variant="primary" onClick={handleSave}>
            Save Preferences
          </Button>
          <Button
            data-testid="btn-crash-trigger"
            variant="destructive"
            onClick={() => setShouldCrash(true)}
          >
            Simulate Crash Error
          </Button>
          {saved && <span style={{ color: '#16a34a', fontSize: 14, fontWeight: 500 }}>Saved!</span>}
        </div>
      </div>
    </div>
  );
}
