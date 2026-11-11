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
  HelpCircle,
  Scan,
  Printer,
  Share2,
  History,
  Sliders,
  Minimize2,
  Save,
  ChevronDown
} from 'lucide-react';
import { useDocStore, EditorMode } from '../../stores/docStore';

export interface EditorTopBarProps {
  onBackToHome: () => void;
  onDownload: () => void;
  onSave?: () => void;
  onDownloadCopy?: () => void;
  onOpenExportOptions?: () => void;
  onOpenCompress?: () => void;
  onPrint?: () => void;
  onShare?: () => void;
  onOpenVersionHistory?: () => void;
  onToggleSearch: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcutsHelp: () => void;
  onOpenBatchOcr?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const EditorTopBar: React.FC<EditorTopBarProps> = ({
  onBackToHome,
  onDownload,
  onSave,
  onDownloadCopy,
  onOpenExportOptions,
  onOpenCompress,
  onPrint,
  onShare,
  onOpenVersionHistory,
  onToggleSearch,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  onOpenBatchOcr,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo
}) => {
  const { t } = useTranslation();
  const { filename, isDirty, isSaving, renameDoc, activeMode, setActiveMode, fileHandle } = useDocStore();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(filename || 'document.pdf');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isMenuOpen]);

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
        {onOpenBatchOcr && (
          <IconButton
            data-testid="btn-topbar-ocr"
            aria-label="OCR Document"
            size="sm"
            variant="ghost"
            onClick={onOpenBatchOcr}
          >
            <Scan size={16} />
          </IconButton>
        )}

        {onPrint && (
          <IconButton
            data-testid="btn-topbar-print"
            aria-label="Print Document"
            size="sm"
            variant="ghost"
            onClick={onPrint}
          >
            <Printer size={16} />
          </IconButton>
        )}
        {onShare && (
          <IconButton
            data-testid="btn-topbar-share"
            aria-label="Share Document"
            size="sm"
            variant="ghost"
            onClick={onShare}
          >
            <Share2 size={16} />
          </IconButton>
        )}

        {/* Primary Save / Download & Actions Dropdown Menu */}
        <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Button
            data-testid="btn-topbar-download"
            variant="primary"
            size="sm"
            onClick={onSave || onDownload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginLeft: 6,
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0
            }}
          >
            {fileHandle ? <Save size={15} /> : <Download size={15} />}
            <span>{fileHandle ? 'Save' : t('editor.btnDownload')}</span>
          </Button>

          <Button
            data-testid="btn-topbar-save-menu"
            variant="primary"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              padding: '0 6px',
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
              borderLeft: '1px solid rgba(255, 255, 255, 0.3)'
            }}
            aria-label="Save and export options"
          >
            <ChevronDown size={14} />
          </Button>

          {isMenuOpen && (
            <div
              data-testid="topbar-save-dropdown-menu"
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                width: 220,
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--bg-foreground, #0f172a)',
                borderRadius: 8,
                border: '1px solid var(--bg-border, #cbd5e1)',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '4px 0',
                zIndex: 1000
              }}
            >
              {fileHandle && onSave && (
                <button
                  data-testid="menu-item-save-original"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSave();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >
                  <Save size={15} />
                  <span>Save to Original (Ctrl+S)</span>
                </button>
              )}

              <button
                data-testid="menu-item-download-copy"
                onClick={() => {
                  setIsMenuOpen(false);
                  if (onDownloadCopy) onDownloadCopy();
                  else onDownload();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  textAlign: 'left',
                  fontSize: 13,
                  cursor: 'pointer',
                  color: 'inherit'
                }}
              >
                <Download size={15} />
                <span>Download a Copy</span>
              </button>

              {onOpenExportOptions && (
                <button
                  data-testid="menu-item-export-options"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenExportOptions();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >
                  <Sliders size={15} />
                  <span>Export Options...</span>
                </button>
              )}

              {onOpenCompress && (
                <button
                  data-testid="menu-item-compress"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenCompress();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >
                  <Minimize2 size={15} />
                  <span>Compress PDF...</span>
                </button>
              )}

              {onOpenVersionHistory && (
                <button
                  data-testid="menu-item-version-history"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenVersionHistory();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >
                  <History size={15} />
                  <span>Version History...</span>
                </button>
              )}

              {onPrint && (
                <button
                  data-testid="menu-item-print"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onPrint();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >
                  <Printer size={15} />
                  <span>Print Document (Ctrl+P)</span>
                </button>
              )}

              {onShare && (
                <button
                  data-testid="menu-item-share"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onShare();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    textAlign: 'left',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: 'inherit'
                  }}
                >
                  <Share2 size={15} />
                  <span>Share Document</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
