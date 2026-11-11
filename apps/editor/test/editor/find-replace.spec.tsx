import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import type { FindReplaceMatch } from '@rhypdf/edit-core';
import { FindReplaceBar } from '../../src/features/editor/FindReplaceBar';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, val: string) {
  const nativeSetter =
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  nativeSetter?.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Task 7.18: Find & Replace Across Document', () => {
  let container: HTMLDivElement;
  let root: Root;

  const mockMatches: FindReplaceMatch[] = [
    {
      id: 'm1',
      pageIndex: 0,
      blockId: 'blk-1',
      lineIndex: 0,
      matchStart: 0,
      matchEnd: 8,
      matchedText: 'Contract',
      context: 'Contract Agreement terms...'
    },
    {
      id: 'm2',
      pageIndex: 0,
      blockId: 'blk-2',
      lineIndex: 1,
      matchStart: 12,
      matchEnd: 20,
      matchedText: 'Contract',
      context: '...review the Contract now.'
    }
  ];

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

  it('renders search input, replace input, match counter, and case/word options', () => {
    const onSearch = vi.fn();
    const onNext = vi.fn();
    const onPrev = vi.fn();
    const onReplaceCurrent = vi.fn();
    const onReplaceAll = vi.fn();
    const onClose = vi.fn();

    act(() => {
      root.render(
        <FindReplaceBar
          isOpen={true}
          onClose={onClose}
          matches={mockMatches}
          currentIndex={0}
          onSearch={onSearch}
          onNextMatch={onNext}
          onPrevMatch={onPrev}
          onReplaceCurrent={onReplaceCurrent}
          onReplaceAll={onReplaceAll}
        />
      );
    });

    const bar = container.querySelector('[data-testid="find-replace-bar"]');
    expect(bar).not.toBeNull();

    const findInput = container.querySelector(
      '[data-testid="input-find-text"]'
    ) as HTMLInputElement;
    const replaceInput = container.querySelector(
      '[data-testid="input-replace-text"]'
    ) as HTMLInputElement;
    const counter = container.querySelector('[data-testid="find-match-counter"]');

    expect(findInput).not.toBeNull();
    expect(replaceInput).not.toBeNull();
    expect(counter?.textContent).toBe('1 of 2');

    // Type in find input
    act(() => {
      setInputValue(findInput, 'Contract');
    });
    expect(onSearch).toHaveBeenCalledWith('Contract', { caseSensitive: false, wholeWord: false });

    // Toggle Match Case
    const caseCheckbox = container.querySelector(
      '[data-testid="checkbox-match-case"]'
    ) as HTMLInputElement;
    act(() => {
      caseCheckbox.click();
    });
    expect(onSearch).toHaveBeenCalledWith('Contract', { caseSensitive: true, wholeWord: false });

    // Navigation buttons
    const nextBtn = container.querySelector('[data-testid="btn-find-next"]') as HTMLButtonElement;
    act(() => {
      nextBtn.click();
    });
    expect(onNext).toHaveBeenCalled();

    const prevBtn = container.querySelector('[data-testid="btn-find-prev"]') as HTMLButtonElement;
    act(() => {
      prevBtn.click();
    });
    expect(onPrev).toHaveBeenCalled();
  });

  it('triggers replace current and replace all callbacks with replacement text', () => {
    const onReplaceCurrent = vi.fn();
    const onReplaceAll = vi.fn();

    act(() => {
      root.render(
        <FindReplaceBar
          isOpen={true}
          onClose={vi.fn()}
          matches={mockMatches}
          currentIndex={0}
          onSearch={vi.fn()}
          onNextMatch={vi.fn()}
          onPrevMatch={vi.fn()}
          onReplaceCurrent={onReplaceCurrent}
          onReplaceAll={onReplaceAll}
        />
      );
    });

    const replaceInput = container.querySelector(
      '[data-testid="input-replace-text"]'
    ) as HTMLInputElement;
    act(() => {
      setInputValue(replaceInput, 'Agreement');
    });

    const replaceBtn = container.querySelector(
      '[data-testid="btn-replace-one"]'
    ) as HTMLButtonElement;
    const replaceAllBtn = container.querySelector(
      '[data-testid="btn-replace-all"]'
    ) as HTMLButtonElement;

    act(() => {
      replaceBtn.click();
    });
    expect(onReplaceCurrent).toHaveBeenCalledWith('Agreement');

    act(() => {
      replaceAllBtn.click();
    });
    expect(onReplaceAll).toHaveBeenCalledWith('Agreement');
  });

  it('displays overflow warning banner when hasOverflowWarning is true', () => {
    act(() => {
      root.render(
        <FindReplaceBar
          isOpen={true}
          onClose={vi.fn()}
          matches={mockMatches}
          currentIndex={0}
          onSearch={vi.fn()}
          onNextMatch={vi.fn()}
          onPrevMatch={vi.fn()}
          onReplaceCurrent={vi.fn()}
          onReplaceAll={vi.fn()}
          hasOverflowWarning={true}
        />
      );
    });

    const warning = container.querySelector('[data-testid="replace-overflow-warning"]');
    expect(warning).not.toBeNull();
    expect(warning?.textContent).toContain(
      'Warning: Replacement text overflows original box boundaries'
    );
  });
});
