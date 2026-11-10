import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@rhypdf/i18n';

export interface CommandItem {
  id: string;
  category: string;
  title: string;
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, commands }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filteredCommands = commands.filter((cmd) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      (cmd.shortcut && cmd.shortcut.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filteredCommands.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex]!.onSelect();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      role="presentation"
      data-testid="command-palette-backdrop"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 2000
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        data-testid="command-palette"
        style={{
          width: '90%',
          maxWidth: 580,
          backgroundColor: 'var(--bg-card)',
          color: 'var(--bg-card-foreground)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.15))',
          border: '1px solid var(--bg-border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--bg-border)',
            gap: 12
          }}
        >
          <span style={{ color: 'var(--bg-muted-foreground)', fontSize: 16 }}>🔍</span>
          <input
            ref={inputRef}
            data-testid="command-palette-input"
            type="text"
            placeholder={t('commands.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              backgroundColor: 'transparent',
              fontSize: 15,
              color: 'inherit'
            }}
          />
          <kbd
            style={{
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--bg-muted-foreground)',
              border: '1px solid var(--bg-border)'
            }}
          >
            ESC
          </kbd>
        </div>

        <div
          data-testid="command-list"
          style={{
            maxHeight: 340,
            overflowY: 'auto',
            padding: '8px 0'
          }}
        >
          {filteredCommands.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--bg-muted-foreground)',
                fontSize: 14
              }}
            >
              {t('commands.noResults', { query })}
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  data-testid={`command-item-${cmd.id}`}
                  onClick={() => {
                    cmd.onSelect();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--bg-secondary)' : 'transparent',
                    color: isSelected ? 'var(--bg-primary)' : 'inherit',
                    transition: 'background-color 100ms ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span
                      style={{
                        fontSize: 11,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-border)',
                        color: 'var(--bg-muted-foreground)'
                      }}
                    >
                      {cmd.category}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400 }}>
                      {cmd.title}
                    </span>
                  </div>
                  {cmd.shortcut && (
                    <kbd
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--bg-muted-foreground)',
                        border: '1px solid var(--bg-border)'
                      }}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
