import React, { useEffect, useState, lazy, Suspense } from 'react';
import { THEME_TOKENS } from '@rhypdf/ui';

// Code splitting via React.lazy
const ToolbarSkeleton = lazy(() => import('./components/ToolbarSkeleton'));
const SidebarSkeleton = lazy(() => import('./components/SidebarSkeleton'));
const ViewerSkeleton = lazy(() => import('./components/ViewerSkeleton'));

export function App(): React.JSX.Element {
  const [workerStatus, setWorkerStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [wasmStatus, setWasmStatus] = useState<string>('loading');
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
        // Now initialize PDFium WASM inside the worker
        worker.postMessage({ id: '2', type: 'INIT_PDFIUM', payload: { wasmUrl: '/pdfium.wasm' } });
      }

      if (type === 'INIT_PDFIUM_SUCCESS') {
        setWasmStatus(`initialized (hasExtInit=${payload?.hasExtInit})`);
      }

      if (type === 'INIT_PDFIUM_ERROR') {
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: THEME_TOKENS.colors.light.background,
        color: THEME_TOKENS.colors.light.foreground,
        fontFamily: THEME_TOKENS.typography.fontFamilySans,
        overflow: 'hidden'
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${THEME_TOKENS.spacing.xs}px ${THEME_TOKENS.spacing.md}px`,
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#ffffff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: THEME_TOKENS.typography.typeScale.base, fontWeight: 700, margin: 0 }}>
            RhyPDF Editor
          </h1>
          <span
            data-testid="worker-status-badge"
            style={{
              padding: '2px 8px',
              borderRadius: THEME_TOKENS.radius.full,
              fontSize: THEME_TOKENS.typography.typeScale.xs,
              fontWeight: 600,
              backgroundColor: workerStatus === 'connected' ? '#dcfce7' : '#fee2e2',
              color: workerStatus === 'connected' ? '#166534' : '#991b1b'
            }}
          >
            Worker: {workerStatus}
          </span>
          {latency !== null && (
            <span style={{ fontSize: THEME_TOKENS.typography.typeScale.xs, color: '#64748b' }}>
              ({latency}ms)
            </span>
          )}
        </div>

        <div style={{ fontSize: THEME_TOKENS.typography.typeScale.xs, color: '#64748b' }}>
          Zero-Server &bull; 100% Private Client-Side
        </div>
      </header>

      <Suspense fallback={<div style={{ padding: 8, fontSize: 12 }}>Loading toolbar...</div>}>
        <ToolbarSkeleton />
      </Suspense>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Suspense fallback={<div style={{ width: 240, padding: 8, fontSize: 12 }}>Loading sidebar...</div>}>
          <SidebarSkeleton />
        </Suspense>

        <Suspense fallback={<div style={{ flex: 1, padding: 16 }}>Loading viewport...</div>}>
          <ViewerSkeleton wasmStatus={wasmStatus} />
        </Suspense>
      </div>
    </div>
  );
}
