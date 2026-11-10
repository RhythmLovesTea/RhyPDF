import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { TextRun } from '@rhypdf/pdf-model';
import { TextSelectionLayer } from '../../src/features/viewer/TextSelectionLayer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.10: Text selection and copy in view mode (engine character boxes)', () => {
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

  const mockRuns: TextRun[] = [
    {
      id: 'run-1',
      type: 'text',
      text: 'Hello World',
      fontName: 'Helvetica',
      fontSize: 16,
      bounds: { left: 50, bottom: 700, right: 200, top: 720 },
      matrix: [1, 0, 0, 1, 50, 700],
      zIndex: 0,
      fillColor: { r: 0, g: 0, b: 0, a: 255 },
      isEmbeddedSubset: false,
      charBoxes: [
        { char: 'H', box: { left: 50, bottom: 700, right: 62, top: 720 } },
        { char: 'e', box: { left: 62, bottom: 700, right: 72, top: 720 } },
        { char: 'l', box: { left: 72, bottom: 700, right: 78, top: 720 } },
        { char: 'l', box: { left: 78, bottom: 700, right: 84, top: 720 } },
        { char: 'o', box: { left: 84, bottom: 700, right: 96, top: 720 } },
        { char: ' ', box: { left: 96, bottom: 700, right: 104, top: 720 } },
        { char: 'W', box: { left: 104, bottom: 700, right: 120, top: 720 } },
        { char: 'o', box: { left: 120, bottom: 700, right: 132, top: 720 } },
        { char: 'r', box: { left: 132, bottom: 700, right: 140, top: 720 } },
        { char: 'l', box: { left: 140, bottom: 700, right: 146, top: 720 } },
        { char: 'd', box: { left: 146, bottom: 700, right: 158, top: 720 } }
      ]
    }
  ];

  it('renders text selection layer with text cursor and correct dimensions', () => {
    act(() => {
      root.render(
        <TextSelectionLayer
          pageIndex={0}
          textRuns={mockRuns}
          pageWidthPt={600}
          pageHeightPt={800}
          scale={1.0}
        />
      );
    });

    const layer = container.querySelector('[data-testid="text-selection-layer-0"]') as HTMLElement;
    expect(layer).not.toBeNull();
    expect(layer.style.cursor).toBe('text');
    expect(layer.style.width).toBe('600px');
    expect(layer.style.height).toBe('800px');
  });

  it('selects character range on drag and reports selected text string', () => {
    const onSelectSpy = vi.fn();

    act(() => {
      root.render(
        <TextSelectionLayer
          pageIndex={0}
          textRuns={mockRuns}
          pageWidthPt={600}
          pageHeightPt={800}
          scale={1.0}
          onSelectionChange={onSelectSpy}
        />
      );
    });

    const layer = container.querySelector('[data-testid="text-selection-layer-0"]') as HTMLElement;

    // Simulate mouse drag from 'H' (CSS x=55, y=90) to 'o' (CSS x=90, y=90)
    // In PDF coordinates (pageHeight 800): y=90 CSS corresponds to ptY = 800 - 90 = 710
    act(() => {
      layer.dispatchEvent(
        new MouseEvent('mousedown', {
          clientX: 55,
          clientY: 90,
          button: 0,
          bubbles: true
        })
      );
      layer.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: 90,
          clientY: 90,
          button: 0,
          bubbles: true
        })
      );
      layer.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // Should have selected "Hello"
    const selected = layer.getAttribute('data-selected-text');
    expect(selected).toBe('Hello');
    expect(onSelectSpy).toHaveBeenCalledWith('Hello', 0);

    // 5 highlight boxes rendered (one for each character 'H','e','l','l','o')
    const highlightBoxes = container.querySelectorAll('[data-testid="selection-highlight-box"]');
    expect(highlightBoxes.length).toBe(5);
  });

  it('copies selected text to system clipboard on copy event', () => {
    act(() => {
      root.render(
        <TextSelectionLayer
          pageIndex={0}
          textRuns={mockRuns}
          pageWidthPt={600}
          pageHeightPt={800}
          scale={1.0}
        />
      );
    });

    const layer = container.querySelector('[data-testid="text-selection-layer-0"]') as HTMLElement;

    // Select "Hello"
    act(() => {
      layer.dispatchEvent(
        new MouseEvent('mousedown', { clientX: 55, clientY: 90, button: 0, bubbles: true })
      );
      layer.dispatchEvent(
        new MouseEvent('mousemove', { clientX: 90, clientY: 90, button: 0, bubbles: true })
      );
      layer.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });

    // Fire copy event
    const clipboardData = {
      setData: vi.fn(),
      getData: vi.fn()
    };
    const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(copyEvent, 'clipboardData', { value: clipboardData });

    act(() => {
      window.dispatchEvent(copyEvent);
    });

    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'Hello');
  });
});
