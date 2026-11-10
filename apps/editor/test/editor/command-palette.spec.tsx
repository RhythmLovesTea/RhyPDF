import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { initI18n, i18n, I18nextProvider } from '@rhypdf/i18n';
import { CommandPalette, CommandItem } from '../../src/components/CommandPalette';
import { ShortcutsHelpDialog } from '../../src/components/ShortcutsHelpDialog';

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('Task 4.11: Command palette (Ctrl / Cmd + K), shortcut map and shortcuts help dialog', () => {
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

  const renderWithI18n = (ui: React.ReactElement) => {
    act(() => {
      root.render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>);
    });
  };

  it('renders command palette and filters commands dynamically', async () => {
    const onSelectZoom = vi.fn();
    const onSelectText = vi.fn();

    const sampleCommands: CommandItem[] = [
      {
        id: 'zoom-in',
        category: 'View',
        title: 'Zoom In',
        shortcut: 'Ctrl++',
        onSelect: onSelectZoom
      },
      {
        id: 'edit-text',
        category: 'Modes',
        title: 'Mode: Edit Text',
        shortcut: 'T',
        onSelect: onSelectText
      }
    ];

    const onClose = vi.fn();
    renderWithI18n(<CommandPalette open={true} onClose={onClose} commands={sampleCommands} />);

    const input = container.querySelector(
      '[data-testid="command-palette-input"]'
    ) as HTMLInputElement;
    expect(input).not.toBeNull();

    expect(container.querySelector('[data-testid="command-item-zoom-in"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="command-item-edit-text"]')).not.toBeNull();

    // Filter by 'zoom'
    act(() => {
      input.value = 'zoom';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const zoomItem = container.querySelector('[data-testid="command-item-zoom-in"]') as HTMLElement;
    expect(zoomItem).not.toBeNull();

    act(() => {
      zoomItem.click();
    });

    expect(onSelectZoom).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('closes command palette when Escape key is pressed', () => {
    const onClose = vi.fn();
    renderWithI18n(<CommandPalette open={true} onClose={onClose} commands={[]} />);

    const input = container.querySelector(
      '[data-testid="command-palette-input"]'
    ) as HTMLInputElement;

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('renders shortcuts help dialog with categories and shortcuts', () => {
    const onClose = vi.fn();
    renderWithI18n(<ShortcutsHelpDialog open={true} onClose={onClose} />);

    const content = container.querySelector('[data-testid="shortcuts-dialog-content"]');
    expect(content).not.toBeNull();

    expect(content?.textContent).toContain('Navigation');
    expect(content?.textContent).toContain('Zoom & View');
    expect(content?.textContent).toContain('Editing');
    expect(content?.textContent).toContain('Modes');
    expect(content?.textContent).toContain('Ctrl / ⌘ Z');
    expect(content?.textContent).toContain('Ctrl / ⌘ K');
  });
});
