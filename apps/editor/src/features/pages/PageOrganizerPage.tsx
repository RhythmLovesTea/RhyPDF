import React, { useState } from 'react';
import { Button } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';

interface PageItem {
  id: number;
  rotation: number;
}

export default function PageOrganizerPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [pages, setPages] = useState<PageItem[]>([
    { id: 1, rotation: 0 },
    { id: 2, rotation: 0 },
    { id: 3, rotation: 0 },
    { id: 4, rotation: 0 }
  ]);

  const rotatePage = (id: number) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const deletePage = (id: number) => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div data-testid="page-organizer" style={{ padding: 32, maxWidth: 900, marginInline: 'auto' }}>
      <header
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{t('pages.title')}</h1>
          <p style={{ color: 'var(--bg-muted-foreground)', fontSize: 14, margin: '4px 0 0' }}>
            {t('pages.subtitle')}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setPages((prev) => [...prev, { id: prev.length + 1, rotation: 0 }])}
        >
          + {t('editor.sidebar.page', { page: pages.length + 1 })}
        </Button>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 20
        }}
      >
        {pages.map((p, idx) => (
          <div
            key={p.id}
            data-testid={`page-card-${p.id}`}
            style={{
              border: '1px solid var(--bg-border)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              backgroundColor: 'var(--bg-card)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                width: 120,
                height: 160,
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                boxShadow: 'var(--shadow-sm)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                transform: `rotate(${p.rotation}deg)`,
                transition: 'transform 0.2s ease',
                marginBottom: 12
              }}
            >
              {t('pages.pageNumber', { page: idx + 1 })}
            </div>
            <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', marginBottom: 8 }}>
              {p.rotation}&deg;
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <Button size="sm" variant="secondary" onClick={() => rotatePage(p.id)}>
                {t('pages.rotateCw')}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => deletePage(p.id)}>
                {t('pages.deletePage')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
