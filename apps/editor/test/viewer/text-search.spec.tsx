import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { TextRun } from '@rhypdf/pdf-model';
import { searchPageText } from '../../src/features/viewer/text-search';
import { FindBar } from '../../src/features/viewer/FindBar';
import { SearchHighlightLayer } from '../../src/features/viewer/SearchHighlightLayer';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 3.9: Text search: find bar, highlight all, next / prev, case / whole-word options', () => {
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
      text: 'The quick brown fox jumps over the lazy dog.',
      fontName: 'Helvetica',
      fontSize: 12,
      bounds: { left: 50, bottom: 700, right: 350, top: 712 },
      matrix: [1, 0, 0, 1, 50, 700],
      zIndex: 0,
      fillColor: { r: 0, g: 0, b: 0, a: 255 },
      isEmbeddedSubset: false,
      charBoxes: [
        { char: 'T', box: { left: 50, bottom: 700, right: 58, top: 712 } },
        { char: 'h', box: { left: 58, bottom: 700, right: 65, top: 712 } },
        { char: 'e', box: { left: 65, bottom: 700, right: 72, top: 712 } }
      ]
    },
    {
      id: 'run-2',
      type: 'text',
      text: 'Foxes are quick animals.',
      fontName: 'Helvetica',
      fontSize: 12,
      bounds: { left: 50, bottom: 650, right: 250, top: 662 },
      matrix: [1, 0, 0, 1, 50, 650],
      zIndex: 1,
      fillColor: { r: 0, g: 0, b: 0, a: 255 },
      isEmbeddedSubset: false
    }
  ];

  it('searches text with case-insensitive and case-sensitive options', () => {
    // 1) Case-insensitive search for "the"
    const resultsInsensitive = searchPageText(0, mockRuns, 'the', { matchCase: false });
    // "The" and "the"
    expect(resultsInsensitive.length).toBe(2);

    // 2) Case-sensitive search for "The"
    const resultsSensitive = searchPageText(0, mockRuns, 'The', { matchCase: true });
    expect(resultsSensitive.length).toBe(1);
    expect(resultsSensitive[0]?.text).toBe('The');
  });

  it('searches text with whole-word option', () => {
    // "fox" with wholeWord=false matches "fox" in run 1 and "Fox" in "Foxes" in run 2
    const resultsPartial = searchPageText(0, mockRuns, 'fox', { wholeWord: false });
    expect(resultsPartial.length).toBe(2);

    // "fox" with wholeWord=true matches ONLY the standalone word "fox"
    const resultsWholeWord = searchPageText(0, mockRuns, 'fox', { wholeWord: true });
    expect(resultsWholeWord.length).toBe(1);
    expect(resultsWholeWord[0]?.text).toBe('fox');
  });

  it('FindBar renders search field, match counter, and triggers next/previous/options', () => {
    const onSearchSpy = vi.fn();
    const onNextSpy = vi.fn();
    const onPrevSpy = vi.fn();
    const onCloseSpy = vi.fn();

    act(() => {
      root.render(
        <FindBar
          isOpen={true}
          initialQuery="quick"
          totalMatches={5}
          currentMatchIndex={1} // 2nd match (index 1)
          onSearch={onSearchSpy}
          onNextMatch={onNextSpy}
          onPrevMatch={onPrevSpy}
          onClose={onCloseSpy}
        />
      );
    });

    const counter = container.querySelector('[data-testid="find-match-counter"]');
    expect(counter?.textContent).toBe('2 of 5');

    const nextBtn = container.querySelector(
      '[data-testid="find-next-button"]'
    ) as HTMLButtonElement;
    const prevBtn = container.querySelector(
      '[data-testid="find-prev-button"]'
    ) as HTMLButtonElement;

    act(() => {
      nextBtn.click();
    });
    expect(onNextSpy).toHaveBeenCalled();

    act(() => {
      prevBtn.click();
    });
    expect(onPrevSpy).toHaveBeenCalled();

    // Toggle match case
    const caseBtn = container.querySelector(
      '[data-testid="find-option-match-case"]'
    ) as HTMLButtonElement;
    act(() => {
      caseBtn.click();
    });
    expect(onSearchSpy).toHaveBeenCalledWith('quick', { matchCase: true, wholeWord: false });
  });

  it('SearchHighlightLayer highlights all matches and accents the current match', () => {
    const matches = searchPageText(0, mockRuns, 'quick', { matchCase: false });
    expect(matches.length).toBe(2);

    const currentMatchId = matches[0]?.id;

    act(() => {
      root.render(
        <div style={{ position: 'relative', width: 600, height: 800 }}>
          <SearchHighlightLayer
            pageIndex={0}
            matches={matches}
            currentMatchId={currentMatchId}
            pageWidthPt={600}
            pageHeightPt={800}
            scale={1.0}
          />
        </div>
      );
    });

    const layer = container.querySelector('[data-testid="search-highlight-layer-0"]');
    expect(layer).not.toBeNull();

    const highlight0 = container.querySelector(`[data-testid="search-match-${matches[0]?.id}"]`);
    const highlight1 = container.querySelector(`[data-testid="search-match-${matches[1]?.id}"]`);

    expect(highlight0?.getAttribute('data-is-current')).toBe('true');
    expect(highlight1?.getAttribute('data-is-current')).toBe('false');
  });
});
