import React, { useState, useRef, useEffect } from 'react';
import { Button, IconButton } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';
import {
  Undo,
  Redo,
  Search,
  Download,
  ChevronLeft,
  CheckCircle2,
  CircleDot,
  Command,
  HelpCircle
} from 'lucide-react';
import { useDocStore, EditorMode } from '../../stores/docStore';

export interface EditorTopBarProps {
  onBackToHome: () => void;
  onDownload: () => void;
  onToggleSearch: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcutsHelp: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  onBackToHome,
  onDownload,
  onToggleSearch,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  const { t } = useTranslation();
  const { filename, isDirty, isSaving, renameDoc, activeMode, setActiveMode } = useDocStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(filename || 'document.pdf');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTitleInput(filename || 'document.pdf');
  }, [filename]);

  useEffect(() => {
    if (isEditingTitle) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingTitle]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    const clean = titleInput.trim();
    if (clean && clean !== filename) {
      renameDoc(clean.endsWith('.pdf') ? clean : `${clean}.pdf`);
    } else {
      setTitleInput(filename || 'document.pdf');
    }
  };

  const modes: { id: EditorMode; label: string; testId: string }[] = [
    { id: 'view', label: t('editor.modes.view'), testId: 'mode-tab-view' },
    { id: 'edit-text', label: t('editor.modes.editText'), testId: 'mode-tab-edit-text' },
    { id: 'edit-images', label: t('editor.modes.editImages'), testId: 'mode-tab-edit-images' },
    { id: 'annotate', label: t('editor.modes.annotate'), testId: 'mode-tab-annotate' },
    { id: 'pages', label: t('editor.modes.pages'), testId: 'mode-tab-pages' }
  ];

  return (
    <header
      data-testid="editor-top-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 52,
        padding: '0 16px',
        backgroundColor: 'var(--bg-card)',
        borderBottom: '1px solid var(--bg-border)',
        gap: 12,
        flexShrink: 0
      }}
    >
      {/* Left side: Back button & Document Title & Saved status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <button
          data-testid="btn-topbar-back"
          onClick={onBackToHome}
          aria-label={t('nav.home')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-md)',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            color: 'var(--bg-foreground)'
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Editable Title */}
        {isEditingTitle ? (
          <input
            ref={inputRef}
            data-testid="input-doc-title"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            onInput={(e) => setTitleInput((e.target as HTMLInputElement).value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') {
                setIsEditingTitle(false);
                setTitleInput(filename || 'document.pdf');
              }
            }}
            style={{
              fontSize: 14,
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-primary)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'inherit',
              outline: 'none',
              maxWidth: 220
            }}
          />
        ) : (
          <span
            data-testid="text-doc-title"
            onClick={() => setIsEditingTitle(true)}
            title="Click to rename"
            style={{
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 220,
              padding: '4px 6px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {filename || 'document.pdf'}
          </span>
        )}

        {/* Status indicator: Saved on this device / Unsaved */}
        <div
          data-testid="topbar-status-badge"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            color: isDirty ? 'var(--bg-warning, #d97706)' : 'var(--bg-muted-foreground)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-secondary)',
            whiteSpace: 'nowrap'
          }}
        >
          {isSaving ? (
            <span>{t('editor.statusSaving')}</span>
          ) : isDirty ? (
            <>
              <CircleDot size={12} color="#f59e0b" />
              <span>{t('editor.statusUnsaved')}</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={12} color="#10b981" />
              <span>{t('editor.statusSaved')}</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Mode switcher (View · Edit Text · Edit Images · Annotate · Pages) */}
      <nav
        data-testid="mode-switcher"
        style={{
          display: 'flex',
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: 2,
          gap: 2
        }}
      >
        {modes.map((m) => {
          const isActive = activeMode === m.id;
          return (
            <button
              key={m.id}
              data-testid={m.testId}
              onClick={() => setActiveMode(m.id)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? 'var(--bg-primary)' : 'var(--bg-foreground)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'all 120ms ease',
                minHeight: 32
              }}
            >
              {m.label}
            </button>
          );
        })}
      </nav>

      {/* Right side: Undo / Redo / Search / Command / Download */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <IconButton
          data-testid="btn-topbar-undo"
          aria-label={t('editor.btnUndo')}
          size="sm"
          variant="ghost"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Undo size={16} />
        </IconButton>
        <IconButton
          data-testid="btn-topbar-redo"
          aria-label={t('editor.btnRedo')}
          size="sm"
          variant="ghost"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Redo size={16} />
        </IconButton>
        <IconButton
          data-testid="btn-topbar-search"
          aria-label={t('editor.btnSearch')}
          size="sm"
          variant="ghost"
          onClick={onToggleSearch}
        >
          <Search size={16} />
        </IconButton>
        <IconButton
          data-testid="btn-topbar-command-palette"
          aria-label={t('editor.btnCommandPalette')}
          size="sm"
          variant="ghost"
          onClick={onOpenCommandPalette}
        >
          <Command size={16} />
        </IconButton>
        <IconButton
          data-testid="btn-topbar-shortcuts"
          aria-label={t('editor.btnShortcuts')}
          size="sm"
          variant="ghost"
          onClick={onOpenShortcutsHelp}
        >
          <HelpCircle size={16} />
        </IconButton>

        <Button
          data-testid="btn-topbar-download"
          variant="primary"
          size="sm"
          onClick={onDownload}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 6 }}
        >
          <Download size={15} />
          <span>{t('editor.btnDownload')}</span>
        </Button>
      </div>
    </header>
  );
};
