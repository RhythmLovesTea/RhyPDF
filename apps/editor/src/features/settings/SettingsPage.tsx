import React, { useState } from 'react';
import { Switch, Select, Slider, Button } from '@rhypdf/ui';
import { SUPPORTED_LOCALES, LocaleCode, useTranslation } from '@rhypdf/i18n';
import { useUIStore } from '../../stores/uiStore';
import { clearAllRecentFiles } from '../../lib/recentFiles';
import { clearAllWorkingCopies } from '../../lib/workingCopy';
import { clearRecoveryMetadata } from '../../lib/recovery';
import { setOnboardingCompleted } from '../../components/OnboardingModal';
import { MeasurementUnit } from '../../lib/blankPdf';
import { ShieldCheck, Trash2, BookOpen, RotateCcw } from 'lucide-react';

export default function SettingsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const locale = useUIStore((state) => state.locale);
  const setLocale = useUIStore((state) => state.setLocale);

  // Settings states stored in localStorage or defaults
  const [defaultFont, setDefaultFont] = useState<string>(() => {
    try {
      return localStorage.getItem('rhypdf_default_font') || 'Roboto';
    } catch {
      return 'Roboto';
    }
  });

  const [units, setUnits] = useState<MeasurementUnit>(() => {
    try {
      return (localStorage.getItem('rhypdf_units') as MeasurementUnit) || 'pt';
    } catch {
      return 'pt';
    }
  });

  const [saveBehavior, setSaveBehavior] = useState<'download' | 'inplace'>(() => {
    try {
      return (localStorage.getItem('rhypdf_save_behavior') as 'download' | 'inplace') || 'download';
    } catch {
      return 'download';
    }
  });

  const [ocrAuto, setOcrAuto] = useState(true);
  const [memoryWarningThreshold, setMemoryWarningThreshold] = useState(150);
  const [saved, setSaved] = useState(false);
  const [clearedToast, setClearedToast] = useState(false);
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error('Intentional crash test triggered for ErrorBoundary verification');
  }

  const handleSave = () => {
    try {
      localStorage.setItem('rhypdf_default_font', defaultFont);
      localStorage.setItem('rhypdf_units', units);
      localStorage.setItem('rhypdf_save_behavior', saveBehavior);
    } catch {
      // Ignore
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearAllLocalData = async () => {
    if (window.confirm(t('settings.clearConfirm'))) {
      await clearAllRecentFiles();
      await clearAllWorkingCopies();
      clearRecoveryMetadata();
      try {
        localStorage.clear();
      } catch {
        // Ignore
      }
      setClearedToast(true);
      setTimeout(() => setClearedToast(false), 3000);
    }
  };

  const handleRestartOnboarding = () => {
    setOnboardingCompleted(false);
    alert('Onboarding tour reset! Visit Home or reload to see the tour.');
  };

  const licenses = [
    {
      name: 'PDFium',
      license: 'Apache-2.0 / BSD-3-Clause',
      url: 'https://pdfium.googlesource.com/pdfium/'
    },
    { name: 'FreeType', license: 'FTL / GPL-2.0', url: 'https://freetype.org/' },
    { name: 'HarfBuzz', license: 'Old MIT', url: 'https://harfbuzz.github.io/' },
    { name: 'React & React-DOM', license: 'MIT', url: 'https://react.dev/' },
    { name: 'Zustand', license: 'MIT', url: 'https://github.com/pmndrs/zustand' },
    { name: 'Lucide Icons', license: 'ISC', url: 'https://lucide.dev/' },
    { name: 'Vite', license: 'MIT', url: 'https://vitejs.dev/' }
  ];

  return (
    <div
      data-testid="page-settings"
      style={{
        padding: '32px 24px',
        maxWidth: 720,
        marginInline: 'auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 32
      }}
    >
      <header
        style={{
          borderBottom: '1px solid var(--bg-border)',
          paddingBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}
      >
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>{t('settings.title')}</h1>
        <p style={{ color: 'var(--bg-muted-foreground)', fontSize: 14, margin: 0 }}>
          {t('settings.subtitle')}
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Theme Setting */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>{t('settings.themeTitle')}</label>
          <Select
            data-testid="select-theme"
            value={theme}
            onChange={(val) => setTheme(val as 'light' | 'dark' | 'system')}
            options={[
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
              { value: 'system', label: t('settings.themeSystem') }
            ]}
          />
        </section>

        {/* Language Setting */}
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

        {/* Default Font */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600 }}>
              {t('settings.defaultFontTitle')}
            </label>
            <p style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', margin: '2px 0 0' }}>
              {t('settings.defaultFontDesc')}
            </p>
          </div>
          <Select
            data-testid="select-default-font"
            value={defaultFont}
            onChange={(val) => setDefaultFont(val)}
            options={[
              { value: 'Roboto', label: 'Roboto (Google standard)' },
              { value: 'Open Sans', label: 'Open Sans' },
              { value: 'Inter', label: 'Inter' },
              { value: 'Liberation Sans', label: 'Liberation Sans (Arial compatible)' },
              { value: 'Merriweather', label: 'Merriweather (Serif)' }
            ]}
          />
        </section>

        {/* Measurement Units */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600 }}>{t('settings.unitsTitle')}</label>
            <p style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', margin: '2px 0 0' }}>
              {t('settings.unitsDesc')}
            </p>
          </div>
          <Select
            data-testid="select-units"
            value={units}
            onChange={(val) => setUnits(val as MeasurementUnit)}
            options={[
              { value: 'pt', label: 'Points (pt) - Standard PDF unit' },
              { value: 'mm', label: 'Millimeters (mm)' },
              { value: 'in', label: 'Inches (in)' },
              { value: 'px', label: 'Pixels (px) at 96 DPI' }
            ]}
          />
        </section>

        {/* Default Save Behavior */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label style={{ fontSize: 14, fontWeight: 600 }}>
              {t('settings.saveBehaviorTitle')}
            </label>
            <p style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', margin: '2px 0 0' }}>
              {t('settings.saveBehaviorDesc')}
            </p>
          </div>
          <Select
            data-testid="select-save-behavior"
            value={saveBehavior}
            onChange={(val) => setSaveBehavior(val as 'download' | 'inplace')}
            options={[
              { value: 'download', label: t('settings.saveDownload') },
              { value: 'inplace', label: t('settings.saveInPlace') }
            ]}
          />
        </section>

        {/* OCR Auto */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>{t('settings.ocrTitle')}</label>
          <Switch label={t('settings.ocrDesc')} checked={ocrAuto} onChange={setOcrAuto} />
        </section>

        {/* Memory Warning Threshold */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600 }}>{t('settings.memoryTitle')}</label>
          <Slider
            min={50}
            max={300}
            step={10}
            value={memoryWarningThreshold}
            onChange={setMemoryWarningThreshold}
          />
          <span style={{ fontSize: 12, color: 'var(--bg-muted-foreground)' }}>
            {t('settings.memoryDesc', { mb: memoryWarningThreshold })}
          </span>
        </section>

        {/* Clear Local Data (Task 4.13) */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            borderTop: '1px solid var(--bg-border)',
            paddingTop: 20
          }}
        >
          <div>
            <label style={{ fontSize: 14, fontWeight: 600, color: '#dc2626' }}>
              {t('settings.clearDataTitle')}
            </label>
            <p style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', margin: '2px 0 0' }}>
              {t('settings.clearDataDesc')}
            </p>
          </div>
          <div>
            <Button
              data-testid="btn-clear-local-data"
              variant="destructive"
              size="sm"
              onClick={handleClearAllLocalData}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Trash2 size={15} />
              <span>{t('settings.btnClearData')}</span>
            </Button>
            {clearedToast && (
              <span
                data-testid="toast-data-cleared"
                style={{ marginLeft: 12, color: '#16a34a', fontSize: 13, fontWeight: 500 }}
              >
                {t('settings.dataClearedToast')}
              </span>
            )}
          </div>
        </section>

        {/* Privacy Statement (Task 4.13) */}
        <section
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-lg)',
            padding: 16,
            border: '1px solid var(--bg-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}
          >
            <ShieldCheck size={18} color="#10b981" />
            <span>{t('settings.privacyTitle')}</span>
          </div>
          <p
            data-testid="privacy-statement-text"
            style={{
              fontSize: 13,
              color: 'var(--bg-muted-foreground)',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            {t('settings.privacyStatement')}
          </p>
        </section>

        {/* Open Source Licenses (Task 4.13) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14 }}
          >
            <BookOpen size={16} />
            <span>{t('settings.licensesTitle')}</span>
          </div>
          <div
            data-testid="licenses-list"
            style={{
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--bg-border)',
              overflow: 'hidden'
            }}
          >
            {licenses.map((lic, idx) => (
              <div
                key={lic.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 14px',
                  backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                  borderBottom: idx < licenses.length - 1 ? '1px solid var(--bg-border)' : 'none',
                  fontSize: 13
                }}
              >
                <a
                  href={lic.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--bg-primary)', textDecoration: 'none', fontWeight: 500 }}
                >
                  {lic.name}
                </a>
                <span style={{ color: 'var(--bg-muted-foreground)', fontSize: 12 }}>
                  {lic.license}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Onboarding Restart */}
        <section style={{ borderTop: '1px solid var(--bg-border)', paddingTop: 16 }}>
          <Button
            data-testid="btn-restart-onboarding"
            variant="secondary"
            size="sm"
            onClick={handleRestartOnboarding}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <RotateCcw size={14} />
            <span>{t('settings.btnRestartOnboarding')}</span>
          </Button>
        </section>

        {/* Save button & Crash simulator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
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
