import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import { RecoveryPrompt } from '../../src/components/RecoveryPrompt';
import { saveRecoveryMetadata, clearRecoveryMetadata } from '../../src/lib/recovery';
import { saveWorkingCopy, clearAllWorkingCopies } from '../../src/lib/workingCopy';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 4.8: Crash / tab-close recovery: next visit offers Restore unsaved changes', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(async () => {
    localStorage.clear();
    await clearAllWorkingCopies();
    clearRecoveryMetadata();
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

  it('does not render prompt when no recovery session exists', async () => {
    const onRestore = vi.fn();
    renderWithI18n(<RecoveryPrompt onRestore={onRestore} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const prompt = container.querySelector('[data-testid="recovery-prompt"]');
    expect(prompt).toBeNull();
  });

  it('renders restore prompt when unsaved dirty session with working copy is present', async () => {
    const docId = 'doc-crash-123';
    await saveWorkingCopy(docId, new Uint8Array([1, 2, 3]));
    saveRecoveryMetadata({
      documentId: docId,
      filename: 'unsaved-report.pdf',
      activePageIndex: 2,
      isDirty: true
    });

    const onRestore = vi.fn();
    renderWithI18n(<RecoveryPrompt onRestore={onRestore} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const prompt = container.querySelector('[data-testid="recovery-prompt"]');
    expect(prompt).not.toBeNull();
    expect(prompt?.textContent).toContain('unsaved-report.pdf');

    const restoreBtn = container.querySelector(
      '[data-testid="btn-recovery-restore"]'
    ) as HTMLButtonElement;
    expect(restoreBtn).not.toBeNull();

    act(() => {
      restoreBtn.click();
    });

    expect(onRestore).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: docId,
        filename: 'unsaved-report.pdf',
        activePageIndex: 2
      })
    );
  });

  it('discards recovery prompt and clears metadata on Discard click', async () => {
    const docId = 'doc-crash-discard';
    await saveWorkingCopy(docId, new Uint8Array([1, 2, 3]));
    saveRecoveryMetadata({
      documentId: docId,
      filename: 'discard-report.pdf',
      isDirty: true
    });

    const onRestore = vi.fn();
    const onDiscard = vi.fn();
    renderWithI18n(<RecoveryPrompt onRestore={onRestore} onDiscard={onDiscard} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const discardBtn = container.querySelector(
      '[data-testid="btn-recovery-discard"]'
    ) as HTMLButtonElement;
    expect(discardBtn).not.toBeNull();

    act(() => {
      discardBtn.click();
    });

    expect(onDiscard).toHaveBeenCalled();
    expect(container.querySelector('[data-testid="recovery-prompt"]')).toBeNull();
  });
});
