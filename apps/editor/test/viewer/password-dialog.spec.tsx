import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import { PasswordDialog } from '../../src/features/viewer/PasswordDialog';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.13: Password-protected PDFs: dialog, retry, cancel', () => {
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

  it('does not render dialog content when open is false', () => {
    renderWithI18n(<PasswordDialog open={false} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const form = container.querySelector('[data-testid="password-dialog-form"]');
    expect(form).toBeNull();
  });

  it('renders dialog, input, and buttons when open is true', () => {
    renderWithI18n(<PasswordDialog open={true} onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const input = container.querySelector('[data-testid="pdf-password-input"]') as HTMLInputElement;
    const submitBtn = container.querySelector(
      '[data-testid="password-submit-button"]'
    ) as HTMLButtonElement;
    const cancelBtn = container.querySelector(
      '[data-testid="password-cancel-button"]'
    ) as HTMLButtonElement;

    expect(input).not.toBeNull();
    expect(submitBtn).not.toBeNull();
    expect(cancelBtn).not.toBeNull();
    // Submit button is disabled when password is empty
    expect(submitBtn.disabled).toBe(true);
  });

  it('enables submit button and calls onSubmit with password', async () => {
    const handleSubmit = vi.fn();
    renderWithI18n(<PasswordDialog open={true} onSubmit={handleSubmit} onCancel={vi.fn()} />);

    const input = container.querySelector('[data-testid="pdf-password-input"]') as HTMLInputElement;
    const submitBtn = container.querySelector(
      '[data-testid="password-submit-button"]'
    ) as HTMLButtonElement;

    act(() => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      setter?.call(input, 'secret123');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(submitBtn.disabled).toBe(false);

    act(() => {
      submitBtn.click();
    });

    expect(handleSubmit).toHaveBeenCalledWith('secret123');
  });

  it('displays error message on retry when isWrongPassword is true', () => {
    renderWithI18n(
      <PasswordDialog open={true} isWrongPassword={true} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    const errorAlert = container.querySelector('[data-testid="password-error-message"]');
    expect(errorAlert).not.toBeNull();
    expect(errorAlert?.textContent).toContain('Incorrect password');
  });

  it('calls onCancel when cancel button is clicked or Escape is pressed', () => {
    const handleCancel = vi.fn();
    renderWithI18n(<PasswordDialog open={true} onSubmit={vi.fn()} onCancel={handleCancel} />);

    const cancelBtn = container.querySelector(
      '[data-testid="password-cancel-button"]'
    ) as HTMLButtonElement;
    act(() => {
      cancelBtn.click();
    });
    expect(handleCancel).toHaveBeenCalledTimes(1);

    const form = container.querySelector('[data-testid="password-dialog-form"]') as HTMLFormElement;
    act(() => {
      form.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(handleCancel).toHaveBeenCalledTimes(2);
  });

  it('disables input and buttons when isSubmitting is true', () => {
    renderWithI18n(
      <PasswordDialog open={true} isSubmitting={true} onSubmit={vi.fn()} onCancel={vi.fn()} />
    );

    const input = container.querySelector('[data-testid="pdf-password-input"]') as HTMLInputElement;
    const submitBtn = container.querySelector(
      '[data-testid="password-submit-button"]'
    ) as HTMLButtonElement;
    const cancelBtn = container.querySelector(
      '[data-testid="password-cancel-button"]'
    ) as HTMLButtonElement;

    expect(input.disabled).toBe(true);
    expect(submitBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
  });
});
