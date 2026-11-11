import { describe, it, expect, beforeEach, afterEach, beforeAll, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n } from '@rhypdf/i18n';
import { FontPicker } from '../../src/features/editor/FontPicker';
import { FontSizeControl } from '../../src/features/editor/FontSizeControl';
import { ColorPickerPopover } from '../../src/features/editor/ColorPickerPopover';
import { SpacingPopover } from '../../src/features/editor/SpacingPopover';
import { ContextualToolbar } from '../../src/features/editor/ContextualToolbar';
import { PropertiesPanel, SelectedObjectProps } from '../../src/features/editor/PropertiesPanel';
import { TextEditorOverlay } from '../../src/features/editor/TextEditorOverlay';
import { useDocStore } from '../../src/stores/docStore';
import type { TextBlock } from '@rhypdf/edit-core';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setInputValue(el: HTMLInputElement | HTMLTextAreaElement, val: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  descriptor?.set?.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Phase 8 UI: Fonts and Typography (Google-Docs-Style)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeAll(() => {
    initI18n('en');
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => {
      useDocStore.getState().setActiveMode('edit-text');
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  describe('Task 8.7: FontPicker (Google-Docs style searchable, categorized, virtualized dropdown)', () => {
    it('opens dropdown, displays recent fonts and searchable list', async () => {
      const onSelectFont = vi.fn();
      await act(async () => {
        root.render(<FontPicker currentFamily="Roboto" onSelectFont={onSelectFont} />);
      });

      const btn = container.querySelector('[data-testid="btn-font-picker"]') as HTMLButtonElement;
      expect(btn).toBeTruthy();
      expect(btn.textContent).toContain('Roboto');

      // Click to open dropdown
      await act(async () => {
        btn.click();
      });

      const dropdown = container.querySelector('[data-testid="font-picker-dropdown"]');
      expect(dropdown).toBeTruthy();

      // Recent font option
      const recentRoboto = container.querySelector(
        '[data-testid="font-option-recent-Roboto"]'
      ) as HTMLButtonElement;
      expect(recentRoboto).toBeTruthy();

      // Search input
      const searchInput = container.querySelector(
        '[data-testid="input-font-search"]'
      ) as HTMLInputElement;
      expect(searchInput).toBeTruthy();

      // Filter by "Pacifico"
      await act(async () => {
        setInputValue(searchInput, 'Pacifico');
      });

      const pacificoItem = container.querySelector(
        '[data-testid="font-option-pacifico"]'
      ) as HTMLButtonElement;
      expect(pacificoItem).toBeTruthy();
      expect(pacificoItem.textContent).toContain('Pacifico');

      // Select Pacifico
      await act(async () => {
        pacificoItem.click();
      });

      expect(onSelectFont).toHaveBeenCalledWith('Pacifico');
    });

    it('filters font catalog by category chip', async () => {
      const onSelectFont = vi.fn();
      await act(async () => {
        root.render(<FontPicker currentFamily="Roboto" onSelectFont={onSelectFont} />);
      });

      const btn = container.querySelector('[data-testid="btn-font-picker"]') as HTMLButtonElement;
      await act(async () => {
        btn.click();
      });

      // Click "Serif" category filter chip
      const serifChip = container.querySelector(
        '[data-testid="chip-cat-serif"]'
      ) as HTMLButtonElement;
      expect(serifChip).toBeTruthy();

      await act(async () => {
        serifChip.click();
      });

      // Merriweather should be present
      const merriweatherItem = container.querySelector('[data-testid="font-option-merriweather"]');
      expect(merriweatherItem).toBeTruthy();
    });

    it('filters font catalog by script selector', async () => {
      const onSelectFont = vi.fn();
      await act(async () => {
        root.render(<FontPicker currentFamily="Roboto" onSelectFont={onSelectFont} />);
      });

      const btn = container.querySelector('[data-testid="btn-font-picker"]') as HTMLButtonElement;
      await act(async () => {
        btn.click();
      });

      const scriptSelect = container.querySelector(
        '[data-testid="select-font-script"]'
      ) as HTMLSelectElement;
      expect(scriptSelect).toBeTruthy();

      await act(async () => {
        scriptSelect.value = 'devanagari';
        scriptSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Poppins supports devanagari
      const devanagariItem = container.querySelector('[data-testid="font-option-poppins"]');
      expect(devanagariItem).toBeTruthy();
    });
  });

  describe('Task 8.8: FontSizeControl (Stepper, input, presets)', () => {
    it('increments and decrements font size via stepper buttons', async () => {
      const onChangeFontSize = vi.fn();
      await act(async () => {
        root.render(<FontSizeControl fontSize={14} onChangeFontSize={onChangeFontSize} />);
      });

      const decBtn = container.querySelector(
        '[data-testid="btn-fontsize-minus"]'
      ) as HTMLButtonElement;
      const incBtn = container.querySelector(
        '[data-testid="btn-fontsize-plus"]'
      ) as HTMLButtonElement;
      expect(decBtn).toBeTruthy();
      expect(incBtn).toBeTruthy();

      await act(async () => {
        incBtn.click();
      });
      expect(onChangeFontSize).toHaveBeenCalledWith(15);

      await act(async () => {
        decBtn.click();
      });
      expect(onChangeFontSize).toHaveBeenCalledWith(13);
    });

    it('allows direct numeric input and selection from preset dropdown', async () => {
      const onChangeFontSize = vi.fn();
      await act(async () => {
        root.render(<FontSizeControl fontSize={14} onChangeFontSize={onChangeFontSize} />);
      });

      const input = container.querySelector(
        '[data-testid="input-fontsize"]'
      ) as HTMLInputElement;
      expect(input).toBeTruthy();

      // Direct numeric entry via Enter key
      await act(async () => {
        setInputValue(input, '28');
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      });
      expect(onChangeFontSize).toHaveBeenCalledWith(28);

      // Open presets dropdown
      const dropdownToggle = container.querySelector(
        '[data-testid="btn-fontsize-dropdown"]'
      ) as HTMLButtonElement;
      expect(dropdownToggle).toBeTruthy();

      await act(async () => {
        dropdownToggle.click();
      });

      const preset36 = container.querySelector(
        '[data-testid="preset-fontsize-36"]'
      ) as HTMLButtonElement;
      expect(preset36).toBeTruthy();

      await act(async () => {
        preset36.click();
      });
      expect(onChangeFontSize).toHaveBeenCalledWith(36);
    });
  });

  describe('Task 8.10: ColorPickerPopover (Text Color & Highlight Color)', () => {
    it('selects color from palette swatch and adjusts opacity slider', async () => {
      const onChangeColor = vi.fn();
      await act(async () => {
        root.render(
          <ColorPickerPopover
            label="Text Color"
            color={{ r: 0, g: 0, b: 0, a: 255 }}
            onChangeColor={onChangeColor}
          />
        );
      });

      const toggleBtn = container.querySelector(
        '[data-testid="btn-color-picker-text-color"]'
      ) as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();

      await act(async () => {
        toggleBtn.click();
      });

      const dropdown = container.querySelector('[data-testid="color-picker-dropdown"]');
      expect(dropdown).toBeTruthy();

      // Click red color swatch (#ff0000)
      const swatch = container.querySelector(
        '[data-testid="palette-color-ff0000"]'
      ) as HTMLButtonElement;
      expect(swatch).toBeTruthy();

      await act(async () => {
        swatch.click();
      });

      expect(onChangeColor).toHaveBeenCalledWith(
        {
          r: 255,
          g: 0,
          b: 0,
          a: 255
        },
        1.0
      );

      // Opacity slider
      const opacitySlider = container.querySelector(
        '[data-testid="input-opacity-slider"]'
      ) as HTMLInputElement;
      expect(opacitySlider).toBeTruthy();

      await act(async () => {
        setInputValue(opacitySlider, '0.75');
      });

      expect(onChangeColor).toHaveBeenCalledWith(
        expect.objectContaining({
          a: Math.round(0.75 * 255)
        }),
        0.75
      );
    });

    it('allows clearing highlight color when allowNone is true', async () => {
      const onChangeColor = vi.fn();
      await act(async () => {
        root.render(
          <ColorPickerPopover
            label="Highlight"
            allowNone={true}
            color={{ r: 254, g: 240, b: 138, a: 255 }}
            onChangeColor={onChangeColor}
          />
        );
      });

      const toggleBtn = container.querySelector(
        '[data-testid="btn-color-picker-highlight"]'
      ) as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();

      await act(async () => {
        toggleBtn.click();
      });

      const noneBtn = container.querySelector(
        '[data-testid="btn-color-none"]'
      ) as HTMLButtonElement;
      expect(noneBtn).toBeTruthy();

      await act(async () => {
        noneBtn.click();
      });

      expect(onChangeColor).toHaveBeenCalledWith(null);
    });
  });

  describe('Task 8.11: SpacingPopover (Line, character, and paragraph spacing)', () => {
    it('sets line spacing presets and adjusts character spacing', async () => {
      const onChangeSpacing = vi.fn();
      await act(async () => {
        root.render(
          <SpacingPopover
            lineSpacing={1.15}
            letterSpacing={0}
            paragraphSpacing={0}
            onChangeSpacing={onChangeSpacing}
          />
        );
      });

      const toggleBtn = container.querySelector(
        '[data-testid="btn-spacing-popover"]'
      ) as HTMLButtonElement;
      expect(toggleBtn).toBeTruthy();

      await act(async () => {
        toggleBtn.click();
      });

      const dropdown = container.querySelector('[data-testid="spacing-dropdown"]');
      expect(dropdown).toBeTruthy();

      // Select line spacing 1.5
      const preset15 = container.querySelector(
        '[data-testid="btn-linespacing-1.5"]'
      ) as HTMLButtonElement;
      expect(preset15).toBeTruthy();

      await act(async () => {
        preset15.click();
      });
      expect(onChangeSpacing).toHaveBeenCalledWith({ lineSpacing: 1.5 });

      // Increment character spacing
      const incCharBtn = container.querySelector(
        '[data-testid="btn-charspacing-plus"]'
      ) as HTMLButtonElement;
      expect(incCharBtn).toBeTruthy();

      await act(async () => {
        incCharBtn.click();
      });
      expect(onChangeSpacing).toHaveBeenCalledWith({ letterSpacing: 0.5 });
    });
  });

  describe('Task 8.9 & 8.12: ContextualToolbar Typography Controls', () => {
    it('toggles Bold, Italic, Underline, Strikethrough, Superscript, and Subscript', async () => {
      const onToggleBold = vi.fn();
      const onToggleItalic = vi.fn();
      const onToggleUnderline = vi.fn();
      const onToggleStrike = vi.fn();
      const onToggleSuperscript = vi.fn();
      const onToggleSubscript = vi.fn();
      const onAlignmentChange = vi.fn();

      await act(async () => {
        root.render(
          <ContextualToolbar
            selectedFontFamily="Roboto"
            selectedFontSize={14}
            selectedIsBold={false}
            onToggleBold={onToggleBold}
            selectedIsItalic={false}
            onToggleItalic={onToggleItalic}
            selectedIsUnderline={false}
            onToggleUnderline={onToggleUnderline}
            selectedIsStrike={false}
            onToggleStrike={onToggleStrike}
            selectedIsSuperscript={false}
            onToggleSuperscript={onToggleSuperscript}
            selectedIsSubscript={false}
            onToggleSubscript={onToggleSubscript}
            selectedAlignment="left"
            onAlignmentChange={onAlignmentChange}
            hasSelectedTextBlock={true}
          />
        );
      });

      const boldBtn = container.querySelector('[data-testid="btn-style-bold"]') as HTMLButtonElement;
      const italicBtn = container.querySelector('[data-testid="btn-style-italic"]') as HTMLButtonElement;
      const underlineBtn = container.querySelector('[data-testid="btn-style-underline"]') as HTMLButtonElement;
      const strikeBtn = container.querySelector('[data-testid="btn-style-strike"]') as HTMLButtonElement;
      const superBtn = container.querySelector('[data-testid="btn-style-superscript"]') as HTMLButtonElement;
      const subBtn = container.querySelector('[data-testid="btn-style-subscript"]') as HTMLButtonElement;
      const centerBtn = container.querySelector('[data-testid="btn-align-center"]') as HTMLButtonElement;

      expect(boldBtn).toBeTruthy();
      expect(italicBtn).toBeTruthy();
      expect(underlineBtn).toBeTruthy();
      expect(strikeBtn).toBeTruthy();
      expect(superBtn).toBeTruthy();
      expect(subBtn).toBeTruthy();
      expect(centerBtn).toBeTruthy();

      await act(async () => {
        boldBtn.click();
      });
      expect(onToggleBold).toHaveBeenCalledTimes(1);

      await act(async () => {
        italicBtn.click();
      });
      expect(onToggleItalic).toHaveBeenCalledTimes(1);

      await act(async () => {
        underlineBtn.click();
      });
      expect(onToggleUnderline).toHaveBeenCalledTimes(1);

      await act(async () => {
        strikeBtn.click();
      });
      expect(onToggleStrike).toHaveBeenCalledTimes(1);

      await act(async () => {
        superBtn.click();
      });
      expect(onToggleSuperscript).toHaveBeenCalledTimes(1);

      await act(async () => {
        subBtn.click();
      });
      expect(onToggleSubscript).toHaveBeenCalledTimes(1);

      await act(async () => {
        centerBtn.click();
      });
      expect(onAlignmentChange).toHaveBeenCalledWith('center');
    });

    it('displays original font badge and match original font button (Tasks 8.15 & 8.16)', async () => {
      const onMatchOriginalFont = vi.fn();

      await act(async () => {
        root.render(
          <ContextualToolbar
            selectedFontFamily="Liberation Sans"
            originalFontName="Arial"
            onMatchOriginalFont={onMatchOriginalFont}
            hasSelectedTextBlock={true}
          />
        );
      });

      const badge = container.querySelector('[data-testid="badge-original-font"]');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toContain('Original: Arial → using Liberation Sans');

      const matchBtn = container.querySelector(
        '[data-testid="btn-match-original-font"]'
      ) as HTMLButtonElement;
      expect(matchBtn).toBeTruthy();

      await act(async () => {
        matchBtn.click();
      });

      expect(onMatchOriginalFont).toHaveBeenCalledTimes(1);
    });
  });

  describe('Task 8.16: PropertiesPanel Smart Font Matching and Status', () => {
    it('displays original font badge and match original button in PropertiesPanel', async () => {
      const onMatchOriginalFont = vi.fn();
      const mockSelectedObject: SelectedObjectProps = {
        id: 'block-1',
        type: 'text',
        x: 100,
        y: 200,
        width: 150,
        height: 24,
        rotation: 0,
        opacity: 100,
        textPreview: 'Headline text',
        fontFamily: 'Liberation Serif',
        fontSize: 16,
        originalFontName: 'Times New Roman',
        canReuseFont: true,
        isSubset: true,
        lineSpacing: 1.25,
        letterSpacing: 0.5
      };

      await act(async () => {
        root.render(
          <PropertiesPanel
            open={true}
            onToggle={() => {}}
            selectedObject={mockSelectedObject}
            onMatchOriginalFont={onMatchOriginalFont}
          />
        );
      });

      const propBadge = container.querySelector('[data-testid="prop-original-font-badge"]');
      expect(propBadge).toBeTruthy();
      expect(propBadge?.textContent).toContain('Original font: Times New Roman');
      expect(propBadge?.textContent).toContain('Using stand-in: Liberation Serif');

      const matchBtn = container.querySelector(
        '[data-testid="btn-prop-match-original-font"]'
      ) as HTMLButtonElement;
      expect(matchBtn).toBeTruthy();

      await act(async () => {
        matchBtn.click();
      });

      expect(onMatchOriginalFont).toHaveBeenCalledTimes(1);
    });
  });

  describe('Task 8.9 & 8.10 & 8.11: TextEditorOverlay typography styling', () => {
    it('renders textarea with bold, italic, underline, strikethrough, spacing, and highlight', async () => {
      const mockBlock: TextBlock = {
        id: 'block-styled-1',
        pageIndex: 0,
        bounds: { left: 50, bottom: 400, right: 300, top: 440 },
        lines: [
          {
            id: 'l1',
            text: 'Styled Editable Text',
            bounds: { left: 50, bottom: 400, right: 300, top: 440 },
            baseline: 400,
            spans: [
              {
                text: 'Styled Editable Text',
                bounds: { left: 50, bottom: 400, right: 300, top: 440 },
                fontName: 'Roboto',
                fontSize: 18,
                color: { r: 15, g: 23, b: 42, a: 255 },
                isBold: true,
                isItalic: true
              }
            ]
          }
        ],
        runs: [],
        rotation: 0,
        writingMode: 'horizontal-tb',
        alignment: 'center',
        primaryFont: 'Roboto',
        primaryFontSize: 18,
        primaryColor: { r: 15, g: 23, b: 42, a: 255 },
        fontReusability: {
          canReuseFont: true,
          isSubset: false,
          isEmbedded: true,
          fontName: 'Roboto',
          missingGlyphs: [],
          recommendedFallback: 'Roboto'
        },
        isBold: true,
        isItalic: true,
        isUnderline: true,
        isStrikethrough: true,
        lineSpacing: 1.5,
        letterSpacing: 1.2,
        highlightColor: { r: 254, g: 240, b: 138, a: 255 }
      };

      await act(async () => {
        root.render(
          <TextEditorOverlay
            block={mockBlock}
            pageWidthPt={595.28}
            pageHeightPt={841.89}
            onCommit={() => {}}
            onCancel={() => {}}
          />
        );
      });

      const surface = container.querySelector(
        '[data-testid="inline-text-editor-surface"]'
      ) as HTMLTextAreaElement;
      expect(surface).toBeTruthy();
      expect(surface.style.fontWeight).toBe('bold');
      expect(surface.style.fontStyle).toBe('italic');
      expect(surface.style.textDecoration).toContain('underline');
      expect(surface.style.textDecoration).toContain('line-through');
      expect(surface.style.letterSpacing).toBe('1.2pt');
      expect(surface.style.lineHeight).toBe('1.5');
      expect(surface.style.backgroundColor).toContain('254, 240, 138');
    });
  });
});
