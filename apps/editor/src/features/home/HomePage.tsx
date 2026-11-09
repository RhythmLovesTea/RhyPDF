import React from 'react';
import { Button } from '@rhypdf/ui';
import { SAMPLE_FIXTURES } from '@rhypdf/test-fixtures';
import { useTranslation } from '@rhypdf/i18n';

interface HomePageProps {
  onNavigate: (route: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div data-testid="page-home" style={{ padding: 32, maxWidth: 800, marginInline: 'auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>{t('home.title')}</h1>
        <p style={{ color: 'var(--bg-muted-foreground)', margin: 0 }}>{t('home.subtitle')}</p>
      </header>

      <section
        style={{
          border: '2px dashed var(--bg-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 48,
          textAlign: 'center',
          backgroundColor: 'var(--bg-card)',
          marginBottom: 32
        }}
      >
        <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>{t('home.openDocumentTitle')}</h2>
        <p style={{ color: 'var(--bg-muted-foreground)', fontSize: 14, margin: '0 0 20px' }}>
          {t('home.openDocumentDesc')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <Button
            data-testid="btn-open-editor"
            variant="primary"
            onClick={() => onNavigate('/editor')}
          >
            {t('home.btnOpenEditor')}
          </Button>
          <Button
            data-testid="btn-open-organizer"
            variant="secondary"
            onClick={() => onNavigate('/pages')}
          >
            {t('home.btnOpenOrganizer')}
          </Button>
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 16, margin: '0 0 16px' }}>{t('home.quickStartTitle')}</h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12
          }}
        >
          {Object.entries(SAMPLE_FIXTURES)
            .slice(0, 4)
            .map(([key, info]) => (
              <div
                key={key}
                style={{
                  border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  backgroundColor: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{info.filename}</div>
                  <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', marginTop: 4 }}>
                    {info.description}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => onNavigate(`/editor?doc=${key}`)}
                >
                  {t('home.openSample')}
                </Button>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
