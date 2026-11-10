import React, { useRef, act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useZoomPan, clampScale } from '../../src/features/viewer/useZoomPan';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

interface TestViewerProps {
  scale: number;
  onScaleChange: (s: number) => void;
}

const TestViewer: React.FC<TestViewerProps> = ({ scale, onScaleChange }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { zoomIn, zoomOut, resetZoom } = useZoomPan({
    containerRef,
    scale,
    onScaleChange
  });

  return (
    <div
      ref={containerRef}
      data-testid="zoom-container"
      style={{ width: 800, height: 600, overflow: 'auto' }}
    >
      <div data-testid="zoom-content" style={{ width: 2000, height: 3000 }} />
      <button data-testid="btn-zoom-in" onClick={zoomIn}>
        +
      </button>
      <button data-testid="btn-zoom-out" onClick={zoomOut}>
        -
      </button>
      <button data-testid="btn-reset" onClick={resetZoom}>
        Reset
      </button>
    </div>
  );
};

describe('Task 3.4: Zoom and Pan gestures', () => {
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

  it('clamps zoom strictly between 25% (0.25) and 800% (8.0)', () => {
    expect(clampScale(0.1)).toBe(0.25);
    expect(clampScale(0.25)).toBe(0.25);
    expect(clampScale(1.5)).toBe(1.5);
    expect(clampScale(8.0)).toBe(8.0);
    expect(clampScale(10.0)).toBe(8.0);
  });

  it('handles button zoom in, zoom out, and reset', () => {
    let currentScale = 1.0;
    const handleScale = vi.fn((s: number) => {
      currentScale = s;
      root.render(<TestViewer scale={currentScale} onScaleChange={handleScale} />);
    });

    act(() => {
      root.render(<TestViewer scale={currentScale} onScaleChange={handleScale} />);
    });

    const btnIn = container.querySelector('[data-testid="btn-zoom-in"]') as HTMLButtonElement;
    const btnOut = container.querySelector('[data-testid="btn-zoom-out"]') as HTMLButtonElement;
    const btnReset = container.querySelector('[data-testid="btn-reset"]') as HTMLButtonElement;

    act(() => {
      btnIn.click();
    });
    expect(handleScale).toHaveBeenCalledWith(1.25);

    act(() => {
      btnOut.click();
    });
    expect(handleScale).toHaveBeenCalledWith(1.25 / 1.25);

    // Zoom in again so reset has an effect
    act(() => {
      btnIn.click();
    });
    expect(currentScale).toBe(1.25);

    act(() => {
      btnReset.click();
    });
    expect(handleScale).toHaveBeenCalledWith(1.0);
  });

  it('handles Ctrl + Wheel zoom anchored to cursor', () => {
    let currentScale = 1.0;
    const handleScale = vi.fn((s: number) => {
      currentScale = s;
      root.render(<TestViewer scale={currentScale} onScaleChange={handleScale} />);
    });

    act(() => {
      root.render(<TestViewer scale={currentScale} onScaleChange={handleScale} />);
    });

    const zoomContainer = container.querySelector('[data-testid="zoom-container"]') as HTMLElement;

    // Dispatch Ctrl + wheel event with explicitly defined properties for happy-dom
    const wheelEvent = new Event('wheel', { bubbles: true, cancelable: true });
    Object.defineProperty(wheelEvent, 'ctrlKey', { value: true });
    Object.defineProperty(wheelEvent, 'deltaY', { value: -120 });
    Object.defineProperty(wheelEvent, 'clientX', { value: 400 });
    Object.defineProperty(wheelEvent, 'clientY', { value: 300 });

    act(() => {
      zoomContainer.dispatchEvent(wheelEvent);
    });

    expect(handleScale).toHaveBeenCalled();
    const calledScale = handleScale.mock.calls[0]?.[0] as number;
    expect(calledScale).toBeGreaterThan(1.0);
  });

  it('handles touch pinch gesture', () => {
    let currentScale = 1.0;
    const handleScale = vi.fn((s: number) => {
      currentScale = s;
    });

    act(() => {
      root.render(<TestViewer scale={currentScale} onScaleChange={handleScale} />);
    });

    const zoomContainer = container.querySelector('[data-testid="zoom-container"]') as HTMLElement;

    // 1) Touchstart with 2 fingers 100px apart
    const touch1 = { clientX: 200, clientY: 200 } as Touch;
    const touch2 = { clientX: 300, clientY: 200 } as Touch;

    const touchStartEvent = new CustomEvent('touchstart', {
      bubbles: true,
      cancelable: true
    });
    Object.defineProperty(touchStartEvent, 'touches', {
      value: [touch1, touch2]
    });

    act(() => {
      zoomContainer.dispatchEvent(touchStartEvent);
    });

    // 2) Touchmove fingers spread apart to 200px (2x pinch zoom)
    const touch1Moved = { clientX: 150, clientY: 200 } as Touch;
    const touch2Moved = { clientX: 350, clientY: 200 } as Touch;

    const touchMoveEvent = new CustomEvent('touchmove', {
      bubbles: true,
      cancelable: true
    });
    Object.defineProperty(touchMoveEvent, 'touches', {
      value: [touch1Moved, touch2Moved]
    });

    act(() => {
      zoomContainer.dispatchEvent(touchMoveEvent);
    });

    expect(handleScale).toHaveBeenCalled();
    const calledScale = handleScale.mock.calls[0]?.[0] as number;
    expect(calledScale).toBeCloseTo(2.0, 1);
  });

  it('handles keyboard Ctrl + = and Ctrl + - shortcuts', () => {
    let currentScale = 1.0;
    const handleScale = vi.fn((s: number) => {
      currentScale = s;
    });

    act(() => {
      root.render(<TestViewer scale={currentScale} onScaleChange={handleScale} />);
    });

    // Ctrl + =
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          key: '=',
          bubbles: true
        })
      );
    });
    expect(handleScale).toHaveBeenCalledWith(1.25);

    // Ctrl + -
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          ctrlKey: true,
          key: '-',
          bubbles: true
        })
      );
    });
    expect(handleScale).toHaveBeenCalledWith(1.0 / 1.25);
  });
});
