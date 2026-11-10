import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PageNavigation } from '../../src/features/viewer/PageNavigation';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.8: Page indicator ("3 / 24"), go to page, and keyboard navigation (PgUp / PgDn / Home / End)', () => {
  let container: HTMLDivElement;
  let root: Root;

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

  it('renders page indicator showing current page and total (e.g. 3 / 24)', () => {
    const onPageChangeSpy = vi.fn();

    act(() => {
      root.render(<PageNavigation currentPage={3} pageCount={24} onPageChange={onPageChangeSpy} />);
    });

    const currentDisplay = container.querySelector('[data-testid="page-number-display"]');
    const countDisplay = container.querySelector('[data-testid="page-count-display"]');
    expect(currentDisplay?.textContent).toBe('3');
    expect(countDisplay?.textContent).toBe('24');
  });

  it('handles prev and next buttons with boundary disabled state', () => {
    const onPageChangeSpy = vi.fn();

    // At page 1: prev button is disabled, next is enabled
    act(() => {
      root.render(<PageNavigation currentPage={1} pageCount={24} onPageChange={onPageChangeSpy} />);
    });

    const prevBtn = container.querySelector('[data-testid="nav-prev-page"]') as HTMLButtonElement;
    const nextBtn = container.querySelector('[data-testid="nav-next-page"]') as HTMLButtonElement;

    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);

    act(() => {
      nextBtn.click();
    });
    expect(onPageChangeSpy).toHaveBeenCalledWith(1); // Page 2 is index 1
  });

  it('allows click to edit page number with clamping validation', () => {
    const onPageChangeSpy = vi.fn();

    act(() => {
      root.render(<PageNavigation currentPage={3} pageCount={24} onPageChange={onPageChangeSpy} />);
    });

    const currentDisplay = container.querySelector(
      '[data-testid="page-number-display"]'
    ) as HTMLElement;

    // Click to edit
    act(() => {
      currentDisplay.click();
    });

    const input = container.querySelector('[data-testid="page-input-field"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    // Type 12 and press Enter
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(input, '12');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onPageChangeSpy).toHaveBeenCalledWith(11); // Page 12 is index 11
  });

  it('handles PgUp, PgDn, Home, and End keyboard navigation', () => {
    const onPageChangeSpy = vi.fn();

    act(() => {
      root.render(
        <PageNavigation
          currentPage={10}
          pageCount={24}
          onPageChange={onPageChangeSpy}
          enableKeyboardNav={true}
        />
      );
    });

    // PgDown -> Page 11 (index 10)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
    });
    expect(onPageChangeSpy).toHaveBeenCalledWith(10);

    // PgUp -> Page 9 (index 8)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));
    });
    expect(onPageChangeSpy).toHaveBeenCalledWith(8);

    // Home -> Page 1 (index 0)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    });
    expect(onPageChangeSpy).toHaveBeenCalledWith(0);

    // End -> Page 24 (index 23)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    expect(onPageChangeSpy).toHaveBeenCalledWith(23);
  });
});
