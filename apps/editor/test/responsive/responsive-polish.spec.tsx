import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import EditorPage from '../../src/features/editor/EditorPage';
import { useDocStore } from '../../src/stores/docStore';
import { useUIStore } from '../../src/stores/uiStore';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 4.14: Responsive layouts, touch-friendly targets, light/dark polish, reduced motion', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    useDocStore.getState().closeDoc();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderWithI18n = (ui: React.ReactElement) => {
    act(() => {
      root.render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
    });
  };

  it('provides touch targets of at least 44x44px for rail tool buttons', async () => {
    act(() => {
      useDocStore.getState().setDoc('doc-touch-test', 'touch.pdf', 1);
    });

    renderWithI18n(<EditorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const railSelect = container.querySelector('[data-testid="tool-rail-select"]') as HTMLElement;
    expect(railSelect).not.toBeNull();
    // Verify width/height styling matches touch target minimum 44px
    expect(railSelect.style.width).toBe('44px');
    expect(railSelect.style.height).toBe('44px');

    const railText = container.querySelector('[data-testid="tool-rail-text"]') as HTMLElement;
    expect(railText.style.width).toBe('44px');
    expect(railText.style.height).toBe('44px');

    const railToggle = container.querySelector(
      '[data-testid="tool-rail-toggle-sidebar"]'
    ) as HTMLElement;
    expect(railToggle.style.width).toBe('44px');
    expect(railToggle.style.height).toBe('44px');
  });

  it('supports light and dark theme mode switching via uiStore', async () => {
    act(() => {
      useUIStore.getState().setTheme('light');
    });
    expect(useUIStore.getState().theme).toBe('light');

    act(() => {
      useUIStore.getState().setTheme('dark');
    });
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('supports collapsible properties panel for tablet and mobile viewports', async () => {
    act(() => {
      useDocStore.getState().setDoc('doc-responsive-panel', 'mobile.pdf', 1);
    });

    renderWithI18n(<EditorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Close properties panel
    const closeBtn = container.querySelector(
      '[data-testid="btn-toggle-properties-close"]'
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();

    act(() => {
      closeBtn.click();
    });

    // When closed, panel collapses and reveals open button
    expect(container.querySelector('[data-testid="properties-panel"]')).toBeNull();
    const openBtn = container.querySelector(
      '[data-testid="btn-toggle-properties-open"]'
    ) as HTMLButtonElement;
    expect(openBtn).not.toBeNull();

    act(() => {
      openBtn.click();
    });

    // Re-opened
    expect(container.querySelector('[data-testid="properties-panel"]')).not.toBeNull();
  });
});
