import React from 'react';
import { Dialog } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';

export interface ShortcutsHelpDialogProps {
  open: boolean;
  onClose: () => void;
}

export const ShortcutsHelpDialog: React.FC<ShortcutsHelpDialogProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  const shortcutSections = [
    {
      category: t('shortcuts.catNav'),
      items: [
        { action: t('shortcuts.nextPage'), shortcut: 'PgDn / ↓' },
        { action: t('shortcuts.prevPage'), shortcut: 'PgUp / ↑' },
        { action: t('shortcuts.firstPage'), shortcut: 'Home' },
        { action: t('shortcuts.lastPage'), shortcut: 'End' }
      ]
    },
    {
      category: t('shortcuts.catZoom'),
      items: [
        { action: t('shortcuts.zoomIn'), shortcut: 'Ctrl / ⌘ +' },
        { action: t('shortcuts.zoomOut'), shortcut: 'Ctrl / ⌘ -' },
        { action: t('shortcuts.zoomReset'), shortcut: 'Ctrl / ⌘ 0' },
        { action: t('editor.toolRail.thumbnails'), shortcut: 'Ctrl / ⌘ \\' }
      ]
    },
    {
      category: t('shortcuts.catEdit'),
      items: [
        { action: t('shortcuts.undo'), shortcut: 'Ctrl / ⌘ Z' },
        { action: t('shortcuts.redo'), shortcut: 'Ctrl / ⌘ Y (Shift+Z)' },
        { action: t('shortcuts.search'), shortcut: 'Ctrl / ⌘ F' },
        { action: t('shortcuts.save'), shortcut: 'Ctrl / ⌘ S' },
        { action: t('shortcuts.commandPalette'), shortcut: 'Ctrl / ⌘ K' }
      ]
    },
    {
      category: t('shortcuts.catModes'),
      items: [
        { action: t('editor.modes.view'), shortcut: 'V' },
        { action: t('editor.modes.editText'), shortcut: 'T' },
        { action: t('editor.modes.editImages'), shortcut: 'I' },
        { action: t('editor.modes.annotate'), shortcut: 'A' },
        { action: t('editor.modes.pages'), shortcut: 'P' }
      ]
    }
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('shortcuts.title')}
      description={t('shortcuts.subtitle')}
    >
      <div
        data-testid="shortcuts-dialog-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          maxHeight: '60vh',
          overflowY: 'auto',
          paddingRight: 4
        }}
      >
        {shortcutSections.map((sec) => (
          <div key={sec.category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h4
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--bg-muted-foreground)',
                margin: '4px 0 0'
              }}
            >
              {sec.category}
            </h4>
            <div
              style={{
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--bg-border)',
                overflow: 'hidden'
              }}
            >
              {sec.items.map((item, idx) => (
                <div
                  key={item.action}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-secondary)',
                    borderBottom: idx < sec.items.length - 1 ? '1px solid var(--bg-border)' : 'none'
                  }}
                >
                  <span style={{ fontSize: 13 }}>{item.action}</span>
                  <kbd
                    style={{
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--bg-border)',
                      fontWeight: 600
                    }}
                  >
                    {item.shortcut}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Dialog>
  );
};
