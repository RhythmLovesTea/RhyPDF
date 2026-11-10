import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTwoPageSpread } from '../../src/features/viewer/layout-modes';
import { LayoutModeSelector } from '../../src/features/viewer/LayoutModeSelector';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.12: Page layout modes: continuous (default), single page, two-page spread', () => {
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

  it('computes correct spread pairs for book layout', () => {
    const totalPages = 10;

    // Page 1 is cover
    const spread1 = getTwoPageSpread(1, totalPages);
    expect(spread1.leftPageIndex).toBeNull();
    expect(spread1.rightPageIndex).toBe(0);

    // Page 2 & 3 share a spread (indices 1 and 2)
    const spread2 = getTwoPageSpread(2, totalPages);
    expect(spread2.leftPageIndex).toBe(1);
    expect(spread2.rightPageIndex).toBe(2);

    const spread3 = getTwoPageSpread(3, totalPages);
    expect(spread3.leftPageIndex).toBe(1);
    expect(spread3.rightPageIndex).toBe(2);

    // Page 10 (last page of 10)
    const spread10 = getTwoPageSpread(10, totalPages);
    expect(spread10.leftPageIndex).toBe(9);
    expect(spread10.rightPageIndex).toBeNull();
  });

  it('LayoutModeSelector displays options and notifies on change', () => {
    const onModeSpy = vi.fn();

    act(() => {
      root.render(
        <LayoutModeSelector currentMode="continuous" onModeChange={onModeSpy} theme="light" />
      );
    });

    const btnContinuous = container.querySelector('[data-testid="layout-mode-button-continuous"]');
    const btnSingle = container.querySelector(
      '[data-testid="layout-mode-button-single"]'
    ) as HTMLButtonElement;
    const btnTwoPage = container.querySelector(
      '[data-testid="layout-mode-button-twoPage"]'
    ) as HTMLButtonElement;

    expect(btnContinuous?.getAttribute('data-is-active')).toBe('true');
    expect(btnContinuous?.getAttribute('aria-checked')).toBe('true');

    act(() => {
      btnSingle.click();
    });
    expect(onModeSpy).toHaveBeenCalledWith('single');

    act(() => {
      btnTwoPage.click();
    });
    expect(onModeSpy).toHaveBeenCalledWith('twoPage');
  });
});
