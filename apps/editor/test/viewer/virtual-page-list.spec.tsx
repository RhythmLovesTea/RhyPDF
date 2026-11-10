import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VirtualPageList, VirtualPageListHandle } from '../../src/features/viewer/VirtualPageList';

// Enable React act() environment for happy-dom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.2: Virtualized continuous page list', () => {
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

  it('renders only visible pages plus 1-page lookahead for a 300-page document', () => {
    const pageCount = 300;
    const pageHeight = 800; // pt
    const pageWidth = 600; // pt
    const gap = 16;

    act(() => {
      root.render(
        <div style={{ width: 800, height: 900 }}>
          <VirtualPageList
            pageCount={pageCount}
            getPageDimension={() => ({ width: pageWidth, height: pageHeight })}
            scale={1.0}
            lookahead={1}
            gap={gap}
            renderPage={(index) => (
              <div data-testid={`rendered-page-${index}`}>Page {index + 1}</div>
            )}
          />
        </div>
      );
    });

    const scrollContainer = container.querySelector(
      '[data-testid="virtual-page-scroll-container"]'
    ) as HTMLElement;
    expect(scrollContainer).not.toBeNull();

    const innerContent = container.querySelector(
      '[data-testid="virtual-page-inner-content"]'
    ) as HTMLElement;
    expect(innerContent).not.toBeNull();

    // Total height should represent all 300 pages + gaps
    const expectedTotalHeight = pageCount * pageHeight + (pageCount + 1) * gap;
    expect(innerContent.style.height).toBe(`${expectedTotalHeight}px`);

    // At top (scrollTop = 0, height = 800px):
    // Page 0 (top: 16 to 816) is visible.
    // With 1-page lookahead, page 1 is rendered as lookahead.
    // But page 5, 50, 150, 299 MUST NOT be rendered in DOM!
    expect(container.querySelector('[data-testid="rendered-page-0"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="rendered-page-1"]')).not.toBeNull();

    expect(container.querySelector('[data-testid="rendered-page-5"]')).toBeNull();
    expect(container.querySelector('[data-testid="rendered-page-50"]')).toBeNull();
    expect(container.querySelector('[data-testid="rendered-page-150"]')).toBeNull();
    expect(container.querySelector('[data-testid="rendered-page-299"]')).toBeNull();

    // Total rendered items should be bounded (~2-3 pages, definitely < 10)
    const renderedItems = container.querySelectorAll('[data-page-index]');
    expect(renderedItems.length).toBeLessThanOrEqual(5);
  });

  it('updates rendered window on scroll to page 150 and unmounts distant pages', () => {
    const pageCount = 300;
    const pageHeight = 800;
    const pageWidth = 600;
    const gap = 16;
    let refHandle: VirtualPageListHandle | null = null;

    act(() => {
      root.render(
        <div style={{ width: 800, height: 800 }}>
          <VirtualPageList
            ref={(handle) => {
              refHandle = handle;
            }}
            pageCount={pageCount}
            getPageDimension={() => ({ width: pageWidth, height: pageHeight })}
            scale={1.0}
            lookahead={1}
            gap={gap}
            renderPage={(index) => (
              <div data-testid={`rendered-page-${index}`}>Page {index + 1}</div>
            )}
          />
        </div>
      );
    });

    const scrollContainer = container.querySelector(
      '[data-testid="virtual-page-scroll-container"]'
    ) as HTMLElement;
    expect(scrollContainer).not.toBeNull();

    // Scroll directly to page 150 offset: 150 * (800 + 16)
    const targetOffset = 150 * (pageHeight + gap);
    scrollContainer.scrollTop = targetOffset;

    act(() => {
      scrollContainer.dispatchEvent(new Event('scroll'));
    });

    // Page 150 must be rendered!
    expect(container.querySelector('[data-testid="rendered-page-150"]')).not.toBeNull();

    // Page 0, 1, 2 must now be UNMOUNTED and completely removed from DOM
    expect(container.querySelector('[data-testid="rendered-page-0"]')).toBeNull();
    expect(container.querySelector('[data-testid="rendered-page-1"]')).toBeNull();

    // End page 299 is still not rendered
    expect(container.querySelector('[data-testid="rendered-page-299"]')).toBeNull();

    // Total count of rendered items remains strictly bounded
    const renderedItems = container.querySelectorAll('[data-page-index]');
    expect(renderedItems.length).toBeLessThanOrEqual(5);

    expect(refHandle).not.toBeNull();
  });
});
