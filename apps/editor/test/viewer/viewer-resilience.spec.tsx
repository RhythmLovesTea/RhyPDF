import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import {
  saveViewerState,
  loadViewerState,
  clearViewerState,
  useViewerResilience
} from '../../src/features/viewer/useViewerResilience';
import { PdfViewer } from '../../src/features/viewer/PdfViewer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.15: Resize / orientation / DPR-change survival: keep scroll and zoom, no flash; restore last position per document', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
  });

  const renderWithI18n = (ui: React.ReactElement) => {
    act(() => {
      root.render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
    });
  };

  it('persists and restores document viewer state to/from localStorage', () => {
    const docId = 'doc-test-123';
    saveViewerState(docId, {
      currentPage: 5,
      scrollRatio: 0.42,
      scale: 1.5,
      fitMode: 'fitWidth',
      layoutMode: 'twoPage'
    });

    const loaded = loadViewerState(docId);
    expect(loaded).not.toBeNull();
    expect(loaded?.currentPage).toBe(5);
    expect(loaded?.scrollRatio).toBe(0.42);
    expect(loaded?.scale).toBe(1.5);
    expect(loaded?.fitMode).toBe('fitWidth');
    expect(loaded?.layoutMode).toBe('twoPage');

    clearViewerState(docId);
    expect(loadViewerState(docId)).toBeNull();
  });

  it('gracefully handles missing or corrupt localStorage state', () => {
    expect(loadViewerState('non-existent')).toBeNull();

    localStorage.setItem('rhypdf:viewer-state:corrupt', '{invalid json');
    expect(loadViewerState('corrupt')).toBeNull();

    localStorage.setItem('rhypdf:viewer-state:empty', '{}');
    const fallback = loadViewerState('empty');
    expect(fallback).not.toBeNull();
    expect(fallback?.currentPage).toBe(1);
    expect(fallback?.scale).toBe(1.0);
  });

  it('useViewerResilience restores saved state and manages scale and dimensions', () => {
    const docId = 'doc-resilience-1';
    saveViewerState(docId, {
      currentPage: 3,
      scale: 2.0,
      fitMode: 'custom',
      layoutMode: 'continuous',
      scrollRatio: 0.25
    });

    let hookResult: ReturnType<typeof useViewerResilience> | null = null;

    const TestComponent: React.FC = () => {
      const divRef = React.useRef<HTMLDivElement>(null);
      hookResult = useViewerResilience({
        docId,
        containerRef: divRef,
        activePageDimension: { width: 600, height: 800 }
      });
      return <div ref={divRef} style={{ width: 800, height: 600 }} />;
    };

    renderWithI18n(<TestComponent />);

    expect(hookResult).not.toBeNull();
    expect(hookResult?.currentPage).toBe(3);
    expect(hookResult?.scale).toBe(2.0);
    expect(hookResult?.layoutMode).toBe('continuous');
  });

  it('renders integrated PdfViewer with control bar, sidebar, and pages', () => {
    renderWithI18n(
      <PdfViewer
        docId="doc-integrated"
        pageCount={10}
        getPageMetric={() => ({ width: 595, height: 842, rotation: 0 })}
      />
    );

    const viewer = container.querySelector('[data-testid="pdf-viewer"]');
    const topBar = container.querySelector('[data-testid="viewer-top-bar"]');
    const sidebar = container.querySelector('[data-testid="thumbnail-sidebar"]');
    const pageNav = container.querySelector('[data-testid="page-navigation-container"]');
    const fitSelector = container.querySelector('[data-testid="fit-mode-selector"]');
    const layoutSelector = container.querySelector('[data-testid="layout-mode-selector"]');

    expect(viewer).not.toBeNull();
    expect(topBar).not.toBeNull();
    expect(sidebar).not.toBeNull();
    expect(pageNav).not.toBeNull();
    expect(fitSelector).not.toBeNull();
    expect(layoutSelector).not.toBeNull();
  });

  it('renders single-page and two-page spread layouts on layout mode switch', () => {
    const docId = 'doc-spread-test';
    saveViewerState(docId, {
      currentPage: 2,
      scale: 1.0,
      fitMode: 'custom',
      layoutMode: 'twoPage'
    });

    renderWithI18n(
      <PdfViewer
        docId={docId}
        pageCount={6}
        getPageMetric={() => ({ width: 500, height: 700, rotation: 0 })}
      />
    );

    const twoPageContainer = container.querySelector('[data-testid="two-page-layout-container"]');
    expect(twoPageContainer).not.toBeNull();
  });

  it('renders friendly error screen when error prop is passed to PdfViewer', () => {
    const onBackSpy = vi.fn();
    renderWithI18n(
      <PdfViewer
        docId="broken-doc"
        pageCount={0}
        error={{ code: 'Corrupt', message: 'Invalid PDF magic header' }}
        onBackToHome={onBackSpy}
      />
    );

    const errorScreen = container.querySelector('[data-testid="viewer-error-screen"]');
    expect(errorScreen).not.toBeNull();

    const backBtn = container.querySelector(
      '[data-testid="viewer-error-back-btn"]'
    ) as HTMLButtonElement;
    act(() => {
      backBtn.click();
    });
    expect(onBackSpy).toHaveBeenCalled();
  });

  it('renders password dialog when isPasswordRequired is true', () => {
    const submitSpy = vi.fn();
    renderWithI18n(
      <PdfViewer
        docId="encrypted-doc"
        pageCount={0}
        isPasswordRequired={true}
        onPasswordSubmit={submitSpy}
      />
    );

    const passwordForm = container.querySelector('[data-testid="password-dialog-form"]');
    expect(passwordForm).not.toBeNull();
  });
});
