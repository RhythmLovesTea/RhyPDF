import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PageCanvas } from '../../src/features/viewer/PageCanvas';

// Enable React act() environment for happy-dom
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.1: PageCanvas component', () => {
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

  it('renders correct aspect ratio and dimensions for portrait page at 1x', () => {
    act(() => {
      root.render(<PageCanvas pageNumber={1} width={600} height={800} scale={1.0} theme="light" />);
    });

    const pageContainer = container.querySelector(
      '[data-testid="page-canvas-container-1"]'
    ) as HTMLElement;
    expect(pageContainer).not.toBeNull();
    expect(pageContainer.style.width).toBe('600px');
    expect(pageContainer.style.height).toBe('800px');
  });

  it('correctly swaps dimensions on 90 degree rotation', () => {
    act(() => {
      root.render(
        <PageCanvas
          pageNumber={2}
          width={600}
          height={800}
          rotation={90}
          scale={1.5}
          theme="light"
        />
      );
    });

    const pageContainer = container.querySelector(
      '[data-testid="page-canvas-container-2"]'
    ) as HTMLElement;
    expect(pageContainer).not.toBeNull();
    // Height becomes width: 800 * 1.5 = 1200; Width becomes height: 600 * 1.5 = 900
    expect(pageContainer.style.width).toBe('1200px');
    expect(pageContainer.style.height).toBe('900px');
  });

  it('shows accessible placeholder and aria attributes when loading', () => {
    act(() => {
      root.render(
        <PageCanvas
          pageNumber={3}
          width={500}
          height={700}
          scale={1.0}
          isLoading={true}
          accessibleLabel="Page 3 of 10"
          theme="light"
        />
      );
    });

    const pageContainer = container.querySelector(
      '[data-testid="page-canvas-container-3"]'
    ) as HTMLElement;
    expect(pageContainer.getAttribute('role')).toBe('img');
    expect(pageContainer.getAttribute('aria-label')).toBe('Page 3 of 10');
    expect(pageContainer.getAttribute('aria-busy')).toBe('true');

    const placeholder = container.querySelector(
      '[data-testid="page-canvas-placeholder-3"]'
    ) as HTMLElement;
    expect(placeholder).not.toBeNull();
  });

  it('renders correctly in light and dark mode styling', () => {
    act(() => {
      root.render(<PageCanvas pageNumber={1} width={400} height={600} scale={1.0} theme="light" />);
    });

    let pageContainer = container.querySelector(
      '[data-testid="page-canvas-container-1"]'
    ) as HTMLElement;
    expect(['#ffffff', 'rgb(255, 255, 255)']).toContain(pageContainer.style.backgroundColor);

    act(() => {
      root.render(<PageCanvas pageNumber={1} width={400} height={600} scale={1.0} theme="dark" />);
    });

    pageContainer = container.querySelector(
      '[data-testid="page-canvas-container-1"]'
    ) as HTMLElement;
    expect(['#1e293b', 'rgb(30, 41, 59)']).toContain(pageContainer.style.backgroundColor);
  });

  it('renders children overlay slot over the canvas', () => {
    act(() => {
      root.render(
        <PageCanvas pageNumber={1} width={500} height={500} scale={1.0}>
          <div data-testid="custom-overlay-child">Text Selection Overlay</div>
        </PageCanvas>
      );
    });

    const overlay = container.querySelector('[data-testid="page-overlay-1"]');
    expect(overlay).not.toBeNull();
    const child = container.querySelector('[data-testid="custom-overlay-child"]');
    expect(child).not.toBeNull();
    expect(child?.textContent).toBe('Text Selection Overlay');
  });
});
