import React, { useEffect, useState, lazy, Suspense } from 'react';
import { THEME_TOKENS } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';
import '@rhypdf/ui/styles.css';
import { useRouter } from './router';

// Lazy-loaded routes
const HomePage = lazy(() => import('./features/home/HomePage'));
const EditorPage = lazy(() => import('./features/editor/EditorPage'));
const PageOrganizerPage = lazy(() => import('./features/pages/PageOrganizerPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));
const StyleGuide = lazy(() =>
  import('./components/StyleGuide').then((m) => ({ default: m.StyleGuide }))
);

export function App(): React.JSX.Element {
  const { t } = useTranslation();
  const { currentRoute, navigate } = useRouter();
  const [workerStatus, setWorkerStatus] = useState<'connecting' | 'connected' | 'error'>(
    'connecting'
  );
  const [wasmStatus, setWasmStatus] = useState<string>('loading');
  const [wasmProgress, setWasmProgress] = useState<number>(0);
  const [wasmPhase, setWasmPhase] = useState<string>('idle');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    // Dedicated worker instantiation via standard ESM URL
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const startTime = performance.now();

    worker.onmessage = (e: MessageEvent) => {
      const { type, payload } = e.data;

      if (type === 'PONG') {
        setLatency(Math.round(performance.now() - startTime));
        setWorkerStatus('connected');
        worker.postMessage({ id: '2', type: 'INIT_PDFIUM', payload: { wasmUrl: '/pdfium.wasm' } });
      }

      if (type === 'INIT_PDFIUM_PROGRESS') {
        setWasmProgress(payload?.percent || 0);
        setWasmPhase(payload?.phase || 'fetching');
      }

      if (type === 'INIT_PDFIUM_SUCCESS') {
        setWasmProgress(100);
        setWasmPhase('ready');
        setWasmStatus(`initialized (hasExtInit=${payload?.hasExtInit})`);
      }

      if (type === 'INIT_PDFIUM_ERROR') {
        setWasmPhase('error');
        setWasmStatus(`error: ${e.data.error}`);
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      setWorkerStatus('error');
      setWasmStatus('worker_error');
    };

    worker.postMessage({ id: '1', type: 'PING' });

    return () => {
      worker.terminate();
    };
  }, []);

  const navLinks = [
    { path: '/', label: t('nav.home'), testId: 'nav-home' },
    { path: '/editor', label: t('nav.editor'), testId: 'nav-editor' },
    { path: '/pages', label: t('nav.pages'), testId: 'nav-pages' },
    { path: '/settings', label: t('nav.settings'), testId: 'nav-settings' },
    { path: '/styleguide', label: t('nav.styleGuide'), testId: 'nav-styleguide' }
  ];

  const workerStatusText =
    workerStatus === 'connected'
      ? `${t('app.workerStatusConnected')} ${latency !== null ? `(${latency}ms)` : ''}`
      : workerStatus === 'error'
        ? t('app.workerStatusError')
        : t('app.workerStatusConnecting');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: 'var(--bg-background)',
        color: 'var(--bg-foreground)',
        fontFamily: THEME_TOKENS.typography.fontFamilySans,
        overflow: 'hidden'
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 24px',
          borderBottom: '1px solid var(--bg-border)',
          backgroundColor: 'var(--bg-card)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span
            style={{ fontSize: 18, fontWeight: 700, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            {t('app.title')}
          </span>

          <nav style={{ display: 'flex', gap: 4 }}>
            {navLinks.map((link) => {
              const isActive = currentRoute === link.path;
              return (
                <button
                  key={link.path}
                  data-testid={link.testId}
                  onClick={() => navigate(link.path)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--bg-secondary)' : 'transparent',
                    color: isActive ? 'var(--bg-primary)' : 'var(--bg-foreground)',
                    fontWeight: isActive ? 600 : 400,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  {link.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            data-testid="worker-status-badge"
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              backgroundColor: workerStatus === 'connected' ? '#dcfce7' : '#fee2e2',
              color: workerStatus === 'connected' ? '#166534' : '#991b1b'
            }}
          >
            {workerStatusText}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--bg-muted-foreground)' }}>
            {t('app.clientSideBadge')}
          </span>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <Suspense
          fallback={<div style={{ padding: 24, textAlign: 'center' }}>{t('app.loadingView')}</div>}
        >
          {currentRoute === '/' && <HomePage onNavigate={navigate} />}
          {currentRoute === '/editor' && (
            <EditorPage wasmStatus={wasmStatus} wasmProgress={wasmProgress} wasmPhase={wasmPhase} />
          )}
          {currentRoute === '/pages' && <PageOrganizerPage />}
          {currentRoute === '/settings' && <SettingsPage />}
          {currentRoute === '/styleguide' && <StyleGuide />}
        </Suspense>
      </main>
    </div>
  );
}
