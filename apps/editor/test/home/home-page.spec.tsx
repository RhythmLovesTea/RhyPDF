import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import HomePage from '../../src/features/home/HomePage';
import { addRecentFile, clearAllRecentFiles } from '../../src/lib/recentFiles';
import { clearAllWorkingCopies } from '../../src/lib/workingCopy';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 4.1: Home screen: drop zone, create blank PDF, recent-files grid with thumbnails', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(async () => {
    await clearAllRecentFiles();
    await clearAllWorkingCopies();
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

  it('renders large drop zone and create blank PDF button', async () => {
    const onNavigate = vi.fn();
    renderWithI18n(<HomePage onNavigate={onNavigate} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const dropZone = container.querySelector('[data-testid="drop-zone-main"]');
    expect(dropZone).not.toBeNull();
    expect(dropZone?.textContent).toContain('Drop a PDF here or click to open');

    const createBlankBtn = container.querySelector('[data-testid="btn-create-blank-pdf"]');
    expect(createBlankBtn).not.toBeNull();
  });

  it('renders recents empty state when no files exist', async () => {
    const onNavigate = vi.fn();
    renderWithI18n(<HomePage onNavigate={onNavigate} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const emptyState = container.querySelector('[data-testid="recents-empty-state"]');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.textContent).toContain('No recent files yet');
  });

  it('renders recent files grid with cards and action buttons when recents exist', async () => {
    await addRecentFile({
      id: 'doc-home-test',
      name: 'annual-report.pdf',
      lastOpened: Date.now(),
      pageCount: 5,
      size: 4096
    });

    const onNavigate = vi.fn();
    renderWithI18n(<HomePage onNavigate={onNavigate} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const recentsGrid = container.querySelector('[data-testid="recents-grid"]');
    expect(recentsGrid).not.toBeNull();

    const card = container.querySelector('[data-testid="recent-item-doc-home-test"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('annual-report.pdf');
    expect(card?.textContent).toContain('5 pages');

    // Verify card actions exist
    expect(
      container.querySelector('[data-testid="btn-recent-rename-doc-home-test"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="btn-recent-download-doc-home-test"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="btn-recent-remove-doc-home-test"]')
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="btn-recent-delete-doc-home-test"]')
    ).not.toBeNull();
  });

  it('navigates to editor when clicking a recent file card', async () => {
    await addRecentFile({
      id: 'doc-click-test',
      name: 'specs.pdf',
      lastOpened: Date.now(),
      pageCount: 2
    });

    const onNavigate = vi.fn();
    renderWithI18n(<HomePage onNavigate={onNavigate} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const card = container.querySelector(
      '[data-testid="recent-item-doc-click-test"]'
    ) as HTMLElement;
    expect(card).not.toBeNull();

    act(() => {
      card.click();
    });

    expect(onNavigate).toHaveBeenCalledWith('/editor');
  });

  it('opens CreateBlankPdfDialog when Create Blank button is clicked', async () => {
    const onNavigate = vi.fn();
    renderWithI18n(<HomePage onNavigate={onNavigate} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    const btn = container.querySelector(
      '[data-testid="btn-create-blank-pdf"]'
    ) as HTMLButtonElement;
    act(() => {
      btn.click();
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog?.textContent).toContain('Create Blank PDF');
  });
});
