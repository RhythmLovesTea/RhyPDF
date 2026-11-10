import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import EditorPage from '../../src/features/editor/EditorPage';
import { useDocStore } from '../../src/stores/docStore';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 4.10: Mode switcher: View · Edit Text · Edit Images · Annotate · Pages', () => {
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

  it('renders all 5 mode buttons with clear active state', async () => {
    act(() => {
      useDocStore.getState().setDoc('doc-mode-test', 'sample.pdf', 1);
    });

    renderWithI18n(<EditorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const switcher = container.querySelector('[data-testid="mode-switcher"]');
    expect(switcher).not.toBeNull();

    expect(container.querySelector('[data-testid="mode-tab-view"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mode-tab-edit-text"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mode-tab-edit-images"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mode-tab-annotate"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="mode-tab-pages"]')).not.toBeNull();

    // Default mode is 'view'
    expect(useDocStore.getState().activeMode).toBe('view');
  });

  it('switches to Edit Text mode and displays text formatting contextual controls', async () => {
    act(() => {
      useDocStore.getState().setDoc('doc-mode-test-2', 'sample.pdf', 1);
    });

    renderWithI18n(<EditorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const textTab = container.querySelector(
      '[data-testid="mode-tab-edit-text"]'
    ) as HTMLButtonElement;

    act(() => {
      textTab.click();
    });

    expect(useDocStore.getState().activeMode).toBe('edit-text');

    // Contextual toolbar now shows text controls
    expect(container.querySelector('[data-testid="contextual-text-tools"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="select-font-family"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="btn-style-bold"]')).not.toBeNull();
  });

  it('switches to Edit Images mode and displays image contextual controls', async () => {
    act(() => {
      useDocStore.getState().setDoc('doc-mode-test-3', 'sample.pdf', 1);
    });

    renderWithI18n(<EditorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const imgTab = container.querySelector(
      '[data-testid="mode-tab-edit-images"]'
    ) as HTMLButtonElement;

    act(() => {
      imgTab.click();
    });

    expect(useDocStore.getState().activeMode).toBe('edit-images');
    expect(container.querySelector('[data-testid="contextual-image-tools"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="btn-image-crop"]')).not.toBeNull();
  });

  it('switches to Annotate mode and displays drawing tools', async () => {
    act(() => {
      useDocStore.getState().setDoc('doc-mode-test-4', 'sample.pdf', 1);
    });

    renderWithI18n(<EditorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const annTab = container.querySelector(
      '[data-testid="mode-tab-annotate"]'
    ) as HTMLButtonElement;

    act(() => {
      annTab.click();
    });

    expect(useDocStore.getState().activeMode).toBe('annotate');
    expect(container.querySelector('[data-testid="contextual-annotate-tools"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="btn-annotate-pen"]')).not.toBeNull();
  });

  it('switches mode via tool rail clicks', async () => {
    act(() => {
      useDocStore.getState().setDoc('doc-mode-test-rail', 'sample.pdf', 1);
    });

    renderWithI18n(<EditorPage />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const railPagesBtn = container.querySelector(
      '[data-testid="tool-rail-pages"]'
    ) as HTMLButtonElement;

    act(() => {
      railPagesBtn.click();
    });

    expect(useDocStore.getState().activeMode).toBe('pages');
    expect(container.querySelector('[data-testid="contextual-pages-tools"]')).not.toBeNull();
  });
});
