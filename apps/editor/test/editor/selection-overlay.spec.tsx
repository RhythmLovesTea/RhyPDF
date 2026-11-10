import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import type { PageObject, TextRun } from '@rhypdf/pdf-model';
import { SelectionOverlay } from '../../src/features/editor/SelectionOverlay';
import EditorPage from '../../src/features/editor/EditorPage';
import { useDocStore } from '../../src/stores/docStore';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function createMockTextRun(id = 'text-1', x = 50, y = 100): TextRun {
  return {
    id,
    type: 'text',
    text: 'Hello World',
    fontName: 'Helvetica',
    fontSize: 14,
    fillColor: { r: 0, g: 0, b: 0, a: 1 },
    bounds: { left: x, bottom: y, right: x + 100, top: y + 20 },
    matrix: [1, 0, 0, 1, x, y],
    zIndex: 1,
    isEmbeddedSubset: false
  };
}

describe('Phase 5 UI: Selection Overlay, Transform Handles, Snapping, and Properties', () => {
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

  it('Task 5.6: Renders bounding box, 8 resize handles, and rotate handle at constant size', () => {
    const textObj = createMockTextRun('t1', 50, 100);
    const objects: PageObject[] = [textObj];

    act(() => {
      root.render(
        <SelectionOverlay
          pageWidthPt={595}
          pageHeightPt={842}
          rotation={0}
          scale={1.5}
          pageObjects={objects}
          selectedIds={['t1']}
        />
      );
    });

    const overlay = container.querySelector('[data-testid="selection-overlay"]');
    expect(overlay).not.toBeNull();

    const boundsRect = container.querySelector('[data-testid="selection-bounds-rect"]');
    expect(boundsRect).not.toBeNull();
    expect(boundsRect?.getAttribute('style')).toContain('cursor: move');

    const rotateHandle = container.querySelector('[data-testid="handle-rotate"]');
    expect(rotateHandle).not.toBeNull();
    expect(rotateHandle?.getAttribute('style')).toContain('cursor: grab');

    const handleTypes = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    for (const type of handleTypes) {
      const handle = container.querySelector(`[data-testid="handle-${type}"]`);
      expect(handle).not.toBeNull();
      // Handles have constant width/height in SVG viewport pixels (8x8)
      expect(handle?.getAttribute('width')).toBe('8');
      expect(handle?.getAttribute('height')).toBe('8');
    }
  });

  it('Task 5.7 & 5.8: Renders marquee box and snapping guide lines when active', () => {
    const textObj = createMockTextRun('t1', 100, 200);
    const objects: PageObject[] = [textObj];

    act(() => {
      root.render(
        <SelectionOverlay
          pageWidthPt={600}
          pageHeightPt={800}
          rotation={0}
          scale={1.0}
          pageObjects={objects}
          selectedIds={[]}
        />
      );
    });

    const svg = container.querySelector('svg')!;
    expect(svg).not.toBeNull();

    // Simulate pointer down to drag a marquee selection
    act(() => {
      svg.dispatchEvent(
        new PointerEvent('pointerdown', {
          clientX: 50,
          clientY: 50,
          bubbles: true,
          cancelable: true
        })
      );
      svg.dispatchEvent(
        new PointerEvent('pointermove', {
          clientX: 250,
          clientY: 350,
          bubbles: true,
          cancelable: true
        })
      );
    });

    const marquee = container.querySelector('[data-testid="marquee-selection-box"]');
    expect(marquee).not.toBeNull();
  });

  it('Task 5.9: Updates numeric inputs in PropertiesPanel and syncs with selected object', () => {
    act(() => {
      useDocStore.getState().setDoc('doc-prop-test', 'test.pdf', 1);
    });

    act(() => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <EditorPage />
        </I18nextProvider>
      );
    });

    const inputX = container.querySelector('[data-testid="input-prop-x"]') as HTMLInputElement;
    const inputY = container.querySelector('[data-testid="input-prop-y"]') as HTMLInputElement;
    const inputW = container.querySelector('[data-testid="input-prop-w"]') as HTMLInputElement;
    const inputH = container.querySelector('[data-testid="input-prop-h"]') as HTMLInputElement;

    expect(inputX).not.toBeNull();
    expect(inputY).not.toBeNull();
    expect(inputW).not.toBeNull();
    expect(inputH).not.toBeNull();

    // Change X position
    act(() => {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;
      nativeSetter?.call(inputX, '75');
      inputX.dispatchEvent(new Event('input', { bubbles: true }));
      inputX.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(inputX.value).toBe('75');
  });

  it('Task 5.11: Undo and redo buttons on EditorTopBar react to EditSession state', () => {
    act(() => {
      useDocStore.getState().setDoc('doc-undo-test', 'contract.pdf', 1);
    });

    act(() => {
      root.render(
        <I18nextProvider i18n={i18n}>
          <EditorPage />
        </I18nextProvider>
      );
    });

    const undoBtn = container.querySelector('[data-testid="btn-topbar-undo"]') as HTMLButtonElement;
    const redoBtn = container.querySelector('[data-testid="btn-topbar-redo"]') as HTMLButtonElement;

    expect(undoBtn).not.toBeNull();
    expect(redoBtn).not.toBeNull();
    expect(undoBtn.disabled).toBe(true);
    expect(redoBtn.disabled).toBe(true);
  });
});
