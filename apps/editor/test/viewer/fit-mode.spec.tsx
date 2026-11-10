import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateFitScale,
  saveDocumentFitMode,
  getSavedDocumentFitMode
} from '../../src/features/viewer/fit-mode';
import { FitModeSelector } from '../../src/features/viewer/FitModeSelector';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.11: Fit modes: fit width, fit page, actual size (remembered per document)', () => {
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

  it('calculates correct scale for actualSize, fitWidth, and fitPage', () => {
    const pageWidthPt = 600;
    const pageHeightPt = 800;

    // 1) actualSize is always 1.0
    const actualScale = calculateFitScale('actualSize', {
      viewportWidth: 1000,
      viewportHeight: 900,
      pageWidthPt,
      pageHeightPt
    });
    expect(actualScale).toBe(1.0);

    // 2) fitWidth: available width = 1032 - 32 = 1000. scale = 1000 / 600 = 1.666...
    const widthScale = calculateFitScale('fitWidth', {
      viewportWidth: 1032,
      viewportHeight: 900,
      pageWidthPt,
      pageHeightPt,
      horizontalPadding: 32
    });
    expect(widthScale).toBeCloseTo(1000 / 600, 2);

    // 3) fitPage: available = 832x632 (800x600 available).
    // scaleW = 800 / 600 = 1.33, scaleH = 600 / 800 = 0.75. Min is 0.75.
    const pageScale = calculateFitScale('fitPage', {
      viewportWidth: 832,
      viewportHeight: 632,
      pageWidthPt,
      pageHeightPt,
      horizontalPadding: 32,
      verticalPadding: 32
    });
    expect(pageScale).toBeCloseTo(0.75, 2);
  });

  it('correctly accounts for 90 degree page rotation in fit calculation', () => {
    // 600 x 800 page rotated 90 deg -> effW = 800, effH = 600
    const rotatedWidthScale = calculateFitScale('fitWidth', {
      viewportWidth: 832,
      viewportHeight: 800,
      pageWidthPt: 600,
      pageHeightPt: 800,
      rotation: 90,
      horizontalPadding: 32
    });
    // Available W = 800; effW = 800 -> scale = 1.0
    expect(rotatedWidthScale).toBe(1.0);
  });

  it('persists and retrieves fit mode per document in localStorage', () => {
    const docId = 'test-doc-abc';
    saveDocumentFitMode(docId, 'fitPage');

    const loaded = getSavedDocumentFitMode(docId);
    expect(loaded).toBe('fitPage');

    // Unknown document falls back to default
    expect(getSavedDocumentFitMode('unknown-doc-xyz', 'fitWidth')).toBe('fitWidth');
  });

  it('FitModeSelector renders buttons and triggers onModeChange', () => {
    const onModeSpy = vi.fn();

    act(() => {
      root.render(
        <FitModeSelector currentMode="fitWidth" onModeChange={onModeSpy} theme="light" />
      );
    });

    const btnWidth = container.querySelector('[data-testid="fit-mode-button-fitWidth"]');
    const btnPage = container.querySelector(
      '[data-testid="fit-mode-button-fitPage"]'
    ) as HTMLButtonElement;
    const btnActual = container.querySelector(
      '[data-testid="fit-mode-button-actualSize"]'
    ) as HTMLButtonElement;

    expect(btnWidth?.getAttribute('data-is-active')).toBe('true');
    expect(btnPage?.getAttribute('data-is-active')).toBe('false');

    act(() => {
      btnPage.click();
    });
    expect(onModeSpy).toHaveBeenCalledWith('fitPage');

    act(() => {
      btnActual.click();
    });
    expect(onModeSpy).toHaveBeenCalledWith('actualSize');
  });
});
