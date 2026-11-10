import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import SettingsPage from '../../src/features/settings/SettingsPage';
import { addRecentFile, getRecentFiles } from '../../src/lib/recentFiles';
import { saveWorkingCopy, hasWorkingCopy } from '../../src/lib/workingCopy';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 4.13: Settings: theme, default font, units, language, save behavior, clear data, licenses, privacy statement', () => {
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

  it('renders all settings sections: theme, language, font, units, save behavior, privacy, licenses', () => {
    renderWithI18n(<SettingsPage />);

    expect(container.querySelector('[data-testid="select-theme"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="select-language"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="select-default-font"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="select-units"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="select-save-behavior"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="btn-clear-local-data"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="privacy-statement-text"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="licenses-list"]')).not.toBeNull();
  });

  it('displays full privacy statement guaranteeing client-side local execution', () => {
    renderWithI18n(<SettingsPage />);

    const privacyText = container.querySelector(
      '[data-testid="privacy-statement-text"]'
    )?.textContent;
    expect(privacyText).toContain('strict privacy-first model');
    expect(privacyText).toContain('WebAssembly');
    expect(privacyText).toContain('locally');
  });

  it('lists open source licenses including PDFium, FreeType, HarfBuzz', () => {
    renderWithI18n(<SettingsPage />);

    const licenses = container.querySelector('[data-testid="licenses-list"]')?.textContent;
    expect(licenses).toContain('PDFium');
    expect(licenses).toContain('FreeType');
    expect(licenses).toContain('HarfBuzz');
    expect(licenses).toContain('React & React-DOM');
  });

  it('clears all local data (recents, working copies, storage) on clear button click', async () => {
    await saveWorkingCopy('doc-to-clear', new Uint8Array([1, 2, 3]));
    await addRecentFile({
      id: 'doc-to-clear',
      name: 'clear-me.pdf',
      lastOpened: Date.now(),
      pageCount: 1
    });

    expect(await hasWorkingCopy('doc-to-clear')).toBe(true);
    expect((await getRecentFiles()).length).toBe(1);

    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithI18n(<SettingsPage />);

    const clearBtn = container.querySelector(
      '[data-testid="btn-clear-local-data"]'
    ) as HTMLButtonElement;
    expect(clearBtn).not.toBeNull();

    await act(async () => {
      clearBtn.click();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(await hasWorkingCopy('doc-to-clear')).toBe(false);
    expect((await getRecentFiles()).length).toBe(0);
    expect(container.querySelector('[data-testid="toast-data-cleared"]')).not.toBeNull();
  });
});
