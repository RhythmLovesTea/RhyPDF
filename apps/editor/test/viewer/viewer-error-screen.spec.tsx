import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import { ViewerErrorScreen } from '../../src/features/viewer/ViewerErrorScreen';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.14: Corrupt or unsupported files: friendly error screen with a way back', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
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

  it('renders friendly error screen with alert role and title', () => {
    renderWithI18n(<ViewerErrorScreen code="Corrupt" />);

    const screen = container.querySelector('[data-testid="viewer-error-screen"]');
    expect(screen).not.toBeNull();
    expect(screen?.getAttribute('role')).toBe('alert');

    const title = container.querySelector('[data-testid="viewer-error-title"]');
    expect(title).not.toBeNull();
    expect(title?.textContent).toBe('Unable to open PDF');
  });

  it('displays corrupt message for code="Corrupt"', () => {
    renderWithI18n(<ViewerErrorScreen code="Corrupt" />);

    const desc = container.querySelector('[data-testid="viewer-error-desc"]');
    expect(desc?.textContent).toContain('corrupt or not a valid PDF');
  });

  it('displays unsupported message for code="Unsupported"', () => {
    renderWithI18n(<ViewerErrorScreen code="Unsupported" />);

    const desc = container.querySelector('[data-testid="viewer-error-desc"]');
    expect(desc?.textContent).toContain('unsupported features');
  });

  it('displays out of memory message for code="OutOfMemory"', () => {
    renderWithI18n(<ViewerErrorScreen code="OutOfMemory" />);

    const desc = container.querySelector('[data-testid="viewer-error-desc"]');
    expect(desc?.textContent).toContain('device memory');
  });

  it('displays technical details and filename when provided', () => {
    renderWithI18n(
      <ViewerErrorScreen
        code="Corrupt"
        fileName="broken.pdf"
        message="Unexpected EOF in xref table at line 42"
      />
    );

    const fileName = container.querySelector('[data-testid="viewer-error-filename"]');
    expect(fileName?.textContent).toBe('broken.pdf');

    const details = container.querySelector('[data-testid="viewer-error-details"]');
    expect(details).not.toBeNull();
    expect(details?.textContent).toContain('Unexpected EOF in xref table');
  });

  it('calls onBackToHome when Return to Home button is clicked', () => {
    const handleBack = vi.fn();
    renderWithI18n(<ViewerErrorScreen onBackToHome={handleBack} />);

    const backBtn = container.querySelector(
      '[data-testid="viewer-error-back-btn"]'
    ) as HTMLButtonElement;
    expect(backBtn).not.toBeNull();

    act(() => {
      backBtn.click();
    });

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry and onOpenFile when buttons are clicked', () => {
    const handleRetry = vi.fn();
    const handleOpen = vi.fn();
    renderWithI18n(<ViewerErrorScreen onRetry={handleRetry} onOpenFile={handleOpen} />);

    const retryBtn = container.querySelector(
      '[data-testid="viewer-error-retry-btn"]'
    ) as HTMLButtonElement;
    const openBtn = container.querySelector(
      '[data-testid="viewer-error-open-btn"]'
    ) as HTMLButtonElement;

    act(() => {
      retryBtn.click();
    });
    expect(handleRetry).toHaveBeenCalledTimes(1);

    act(() => {
      openBtn.click();
    });
    expect(handleOpen).toHaveBeenCalledTimes(1);
  });
});
