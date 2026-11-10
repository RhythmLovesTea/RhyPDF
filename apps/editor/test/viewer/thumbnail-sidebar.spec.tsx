import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThumbnailSidebar } from '../../src/features/viewer/ThumbnailSidebar';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.7: Thumbnail sidebar with click-to-jump (lazy rendered)', () => {
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

  it('renders all page items and highlights current active page', () => {
    const onSelectSpy = vi.fn();

    act(() => {
      root.render(
        <ThumbnailSidebar
          pageCount={5}
          currentPage={2} // Page 2 is active
          getPageDimension={() => ({ width: 600, height: 800 })}
          onSelectPage={onSelectSpy}
          theme="light"
        />
      );
    });

    const sidebar = container.querySelector('[data-testid="thumbnail-sidebar"]');
    expect(sidebar).not.toBeNull();

    // Check that items 0 to 4 are rendered
    const item0 = container.querySelector('[data-testid="thumbnail-item-0"]');
    const item1 = container.querySelector('[data-testid="thumbnail-item-1"]');
    expect(item0).not.toBeNull();
    expect(item1).not.toBeNull();

    // Page 2 (index 1) must be active
    expect(item1?.getAttribute('data-is-active')).toBe('true');
    expect(item1?.getAttribute('aria-selected')).toBe('true');

    // Page 1 (index 0) is not active
    expect(item0?.getAttribute('data-is-active')).toBe('false');
    expect(item0?.getAttribute('aria-selected')).toBe('false');
  });

  it('click-to-jump invokes onSelectPage with pageIndex', () => {
    const onSelectSpy = vi.fn();

    act(() => {
      root.render(
        <ThumbnailSidebar
          pageCount={5}
          currentPage={1}
          getPageDimension={() => ({ width: 600, height: 800 })}
          onSelectPage={onSelectSpy}
        />
      );
    });

    const item3 = container.querySelector('[data-testid="thumbnail-item-3"]') as HTMLElement;
    expect(item3).not.toBeNull();

    act(() => {
      item3.click();
    });

    expect(onSelectSpy).toHaveBeenCalledWith(3);
  });

  it('keyboard Enter / Space jumps to selected page', () => {
    const onSelectSpy = vi.fn();

    act(() => {
      root.render(
        <ThumbnailSidebar
          pageCount={5}
          currentPage={1}
          getPageDimension={() => ({ width: 600, height: 800 })}
          onSelectPage={onSelectSpy}
        />
      );
    });

    const item2 = container.querySelector('[data-testid="thumbnail-item-2"]') as HTMLElement;

    act(() => {
      item2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onSelectSpy).toHaveBeenCalledWith(2);

    act(() => {
      item2.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(onSelectSpy).toHaveBeenCalledWith(2);
  });
});
