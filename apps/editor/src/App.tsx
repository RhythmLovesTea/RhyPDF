import React, { useEffect, useState } from 'react';
import { THEME_TOKENS } from '@rhypdf/ui';
import { SUPPORTED_LOCALES } from '@rhypdf/i18n';
import { CoordinateMapper } from '@rhypdf/pdf-model';
import { SAMPLE_FIXTURES } from '@rhypdf/test-fixtures';

export function App(): React.JSX.Element {
  const [workerStatus, setWorkerStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [roundtripTime, setRoundtripTime] = useState<number | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    const startTime = performance.now();

    worker.onmessage = (e) => {
      if (e.data.type === 'PONG') {
        setRoundtripTime(Math.round(performance.now() - startTime));
        setWorkerStatus('connected');
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      setWorkerStatus('error');
    };

    worker.postMessage({ id: '1', type: 'PING' });

    return () => {
      worker.terminate();
    };
  }, []);

  const testMapper = new CoordinateMapper(595, 842, 0, 1.5, 1.0);
  const cssSize = testMapper.getCssSize();

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: THEME_TOKENS.colors.light.background,
        color: THEME_TOKENS.colors.light.foreground,
        fontFamily: THEME_TOKENS.typography.fontFamilySans,
        padding: THEME_TOKENS.spacing.lg
      }}
    >
      <header style={{ marginBottom: THEME_TOKENS.spacing.xl, borderBottom: '1px solid #e2e8f0', paddingBottom: THEME_TOKENS.spacing.md }}>
        <h1 style={{ fontSize: THEME_TOKENS.typography.typeScale['2xl'], margin: 0, fontWeight: 700 }}>
          RhyPDF Editor Shell
        </h1>
        <p style={{ color: THEME_TOKENS.colors.light.mutedForeground, marginTop: THEME_TOKENS.spacing.xs }}>
          Zero-server, 100% private, client-side PDF editing powered by WebAssembly.
        </p>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: THEME_TOKENS.spacing.md }}>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: THEME_TOKENS.radius.md, padding: THEME_TOKENS.spacing.md }}>
          <h2 style={{ fontSize: THEME_TOKENS.typography.typeScale.lg, marginTop: 0 }}>Worker Plumbing</h2>
          <div data-testid="worker-status" style={{ fontWeight: 600, color: workerStatus === 'connected' ? '#16a34a' : '#ea580c' }}>
            Worker status: {workerStatus}
          </div>
          {roundtripTime !== null && (
            <div data-testid="worker-latency" style={{ marginTop: THEME_TOKENS.spacing.xs, fontSize: THEME_TOKENS.typography.typeScale.sm }}>
              Ping-pong roundtrip: {roundtripTime}ms
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: THEME_TOKENS.radius.md, padding: THEME_TOKENS.spacing.md }}>
          <h2 style={{ fontSize: THEME_TOKENS.typography.typeScale.lg, marginTop: 0 }}>Coordinate Mapper</h2>
          <div data-testid="coord-mapper-test">
            A4 1.5x CSS Size: {cssSize.width}px &times; {cssSize.height}px
          </div>
        </div>

        <div style={{ border: '1px solid #e2e8f0', borderRadius: THEME_TOKENS.radius.md, padding: THEME_TOKENS.spacing.md }}>
          <h2 style={{ fontSize: THEME_TOKENS.typography.typeScale.lg, marginTop: 0 }}>Fixtures &amp; Locales</h2>
          <div data-testid="fixtures-count">
            Sample fixtures registered: {Object.keys(SAMPLE_FIXTURES).length}
          </div>
          <div data-testid="locales-count" style={{ marginTop: THEME_TOKENS.spacing.xs }}>
            Supported locales: {Object.keys(SUPPORTED_LOCALES).join(', ')}
          </div>
        </div>
      </main>
    </div>
  );
}
