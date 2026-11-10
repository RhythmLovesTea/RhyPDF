import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import EditorPage from '../../src/features/editor/EditorPage';
import { useDocStore } from '../../src/stores/docStore';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 4.9: Editor layout (Section 3B): top bar, tool rail, canvas, contextual toolbar, properties panel, status bar', () => {
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

  it('renders complete Section 3B shell: top bar, tool rail, contextual toolbar, properties panel, status bar', async () => {
    act(() => {
      useDocStore.getState().setDoc('doc-layout-1', 'contract.pdf', 10);
    });

    renderWithI18n(<EditorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // 1. Top bar
    const topBar = container.querySelector('[data-testid="editor-top-bar"]');
    expect(topBar).not.toBeNull();
    expect(topBar?.textContent).toContain('contract.pdf');
    expect(topBar?.textContent).toContain('Saved on this device');
    expect(container.querySelector('[data-testid="btn-topbar-download"]')).not.toBeNull();

    // 2. Tool rail
    const toolRail = container.querySelector('[data-testid="editor-tool-rail"]');
    expect(toolRail).not.toBeNull();
    expect(container.querySelector('[data-testid="tool-rail-select"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tool-rail-text"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tool-rail-image"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tool-rail-annotate"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tool-rail-pages"]')).not.toBeNull();

    // 3. Contextual toolbar
    expect(container.querySelector('[data-testid="contextual-toolbar"]')).not.toBeNull();

    // 4. Properties panel
    const propPanel = container.querySelector('[data-testid="properties-panel"]');
    expect(propPanel).not.toBeNull();
    expect(container.querySelector('[data-testid="input-prop-x"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="input-prop-y"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="input-prop-w"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="input-prop-h"]')).not.toBeNull();

    // 5. Status bar
    const statusBar = container.querySelector('[data-testid="editor-status-bar"]');
    expect(statusBar).not.toBeNull();
    expect(statusBar?.textContent).toContain('100%');
  });

  it('allows renaming document in top bar by clicking title', async () => {
    act(() => {
      useDocStore.getState().setDoc('doc-rename-top', 'initial-name.pdf', 3);
    });

    renderWithI18n(<EditorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const titleSpan = container.querySelector('[data-testid="text-doc-title"]') as HTMLElement;
    expect(titleSpan).not.toBeNull();

    act(() => {
      titleSpan.click();
    });

    const input = container.querySelector('[data-testid="input-doc-title"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(input, 'final-name.pdf');
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(useDocStore.getState().filename).toBe('final-name.pdf');
    expect(useDocStore.getState().isDirty).toBe(true);
  });
});
