import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { useDocStore } from '../../stores/docStore';
import { useUIStore } from '../../stores/uiStore';
import { PdfViewer } from '../viewer/PdfViewer';
import { EditorTopBar } from './EditorTopBar';
import { EditorToolRail } from './EditorToolRail';
import { ContextualToolbar } from './ContextualToolbar';
import { PropertiesPanel, SelectedObjectProps } from './PropertiesPanel';
import { EditorStatusBar } from './EditorStatusBar';
import { CommandPalette, CommandItem } from '../../components/CommandPalette';
import { ShortcutsHelpDialog } from '../../components/ShortcutsHelpDialog';
import { AutosaveManager } from '../../lib/autosave';
import { downloadRecentFile } from '../../lib/recentFiles';
import { loadWorkingCopy } from '../../lib/workingCopy';
import { FitMode } from '../viewer/fit-mode';

interface EditorPageProps {
  wasmStatus?: string;
  wasmProgress?: number;
  wasmPhase?: string;
}

export default function EditorPage({
  wasmStatus = 'ready',
  wasmProgress: _wasmProgress = 100,
  wasmPhase = 'ready'
}: EditorPageProps): React.JSX.Element {
  const { t } = useTranslation();
  const {
    currentDocId,
    filename,
    pageCount,
    isDirty,
    closeDoc,
    setActiveMode,
    setDirty,
    setLastSavedAt
  } = useDocStore();
  const theme = useUIStore((s) => (s.theme === 'dark' ? 'dark' : 'light'));

  // Editor shell UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [fitMode, setFitMode] = useState<FitMode>('fitWidth');
  const [selectedObject, setSelectedObject] = useState<SelectedObjectProps | null>(null);

  // Undo / Redo history placeholder
  const [historyIndex, setHistoryIndex] = useState(0);

  // Autosave setup (Task 4.7)
  useEffect(() => {
    if (!currentDocId) return;

    const autosave = new AutosaveManager({
      docId: currentDocId,
      filename: filename || 'document.pdf',
      intervalMs: 5000,
      getActivePageIndex: () => currentPage - 1,
      getBytes: async () => {
        const bytes = await loadWorkingCopy(currentDocId);
        return bytes || new Uint8Array();
      },
      isDirty: () => isDirty,
      onSaved: (ts) => setLastSavedAt(ts)
    });

    return () => {
      autosave.destroy();
    };
  }, [currentDocId, filename, isDirty, currentPage, setLastSavedAt]);

  // Global keyboard shortcuts (Ctrl+K for commands, ? / F1 for shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (
        e.key === 'F1' ||
        (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName))
      ) {
        e.preventDefault();
        setShortcutsHelpOpen(true);
      } else if (
        e.key === 'v' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        setActiveMode('view');
      } else if (
        e.key === 't' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        setActiveMode('edit-text');
      } else if (
        e.key === 'i' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        setActiveMode('edit-images');
      } else if (
        e.key === 'a' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        setActiveMode('annotate');
      } else if (
        e.key === 'p' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)
      ) {
        setActiveMode('pages');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveMode]);

  const handleDownload = useCallback(async () => {
    if (currentDocId) {
      await downloadRecentFile(currentDocId, filename || 'document.pdf');
    }
  }, [currentDocId, filename]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((h) => h - 1);
    }
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    setHistoryIndex((h) => h + 1);
  }, []);

  // Commands list for CommandPalette
  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'download',
        category: t('commands.categoryApp'),
        title: t('commands.cmdDownload'),
        shortcut: 'Ctrl+S',
        onSelect: () => void handleDownload()
      },
      {
        id: 'undo',
        category: t('commands.categoryEdit'),
        title: t('commands.cmdUndo'),
        shortcut: 'Ctrl+Z',
        onSelect: handleUndo
      },
      {
        id: 'redo',
        category: t('commands.categoryEdit'),
        title: t('commands.cmdRedo'),
        shortcut: 'Ctrl+Y',
        onSelect: handleRedo
      },
      {
        id: 'mode-view',
        category: t('commands.categoryModes'),
        title: t('commands.cmdModeView'),
        shortcut: 'V',
        onSelect: () => setActiveMode('view')
      },
      {
        id: 'mode-text',
        category: t('commands.categoryModes'),
        title: t('commands.cmdModeText'),
        shortcut: 'T',
        onSelect: () => setActiveMode('edit-text')
      },
      {
        id: 'mode-images',
        category: t('commands.categoryModes'),
        title: t('commands.cmdModeImages'),
        shortcut: 'I',
        onSelect: () => setActiveMode('edit-images')
      },
      {
        id: 'mode-annotate',
        category: t('commands.categoryModes'),
        title: t('commands.cmdModeAnnotate'),
        shortcut: 'A',
        onSelect: () => setActiveMode('annotate')
      },
      {
        id: 'mode-pages',
        category: t('commands.categoryModes'),
        title: t('commands.cmdModePages'),
        shortcut: 'P',
        onSelect: () => setActiveMode('pages')
      },
      {
        id: 'zoom-in',
        category: t('commands.categoryView'),
        title: t('commands.cmdZoomIn'),
        shortcut: 'Ctrl++',
        onSelect: () => setScale((s) => Math.min(8.0, s * 1.25))
      },
      {
        id: 'zoom-out',
        category: t('commands.categoryView'),
        title: t('commands.cmdZoomOut'),
        shortcut: 'Ctrl+-',
        onSelect: () => setScale((s) => Math.max(0.25, s / 1.25))
      },
      {
        id: 'fit-width',
        category: t('commands.categoryView'),
        title: t('commands.cmdFitWidth'),
        onSelect: () => setFitMode('fitWidth')
      },
      {
        id: 'fit-page',
        category: t('commands.categoryView'),
        title: t('commands.cmdFitPage'),
        onSelect: () => setFitMode('fitPage')
      },
      {
        id: 'toggle-sidebar',
        category: t('commands.categoryView'),
        title: t('commands.cmdToggleSidebar'),
        shortcut: 'Ctrl+\\',
        onSelect: () => setSidebarOpen((s) => !s)
      },
      {
        id: 'shortcuts-help',
        category: t('commands.categoryApp'),
        title: t('commands.cmdShortcuts'),
        shortcut: 'F1 / ?',
        onSelect: () => setShortcutsHelpOpen(true)
      }
    ],
    [t, handleDownload, handleUndo, handleRedo, setActiveMode]
  );

  return (
    <div
      data-testid="page-editor"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Top Bar (Section 3B) */}
      <EditorTopBar
        onBackToHome={() => closeDoc()}
        onDownload={handleDownload}
        onToggleSearch={() => {
          // Trigger search toggle inside viewer
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true })
          );
        }}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenShortcutsHelp={() => setShortcutsHelpOpen(true)}
        canUndo={historyIndex > 0}
        canRedo={false}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

      {/* Contextual Toolbar */}
      <ContextualToolbar />

      {/* Main Workspace Area: Rail + Canvas + Properties */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Tool Rail (Left) */}
        <EditorToolRail
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
        />

        {/* Central Canvas Viewport */}
        <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
          {currentDocId ? (
            <PdfViewer
              docId={currentDocId}
              pageCount={pageCount || 1}
              theme={theme}
              onBackToHome={() => closeDoc()}
            />
          ) : (
            <div
              data-testid="editor-empty-state"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                gap: 16,
                color: 'var(--bg-muted-foreground)'
              }}
            >
              <div style={{ fontSize: 40 }}>📄</div>
              <p style={{ fontSize: 16 }}>{t('home.openDocumentDesc')}</p>
              <span style={{ fontSize: 12 }}>
                PDFium WASM: {wasmStatus} ({wasmPhase})
              </span>
            </div>
          )}
        </div>

        {/* Properties Panel (Right) */}
        <PropertiesPanel
          open={propertiesOpen}
          onToggle={() => setPropertiesOpen((p) => !p)}
          selectedObject={selectedObject}
          onUpdateObject={(updates) => {
            setSelectedObject((prev) => (prev ? { ...prev, ...updates } : null));
            setDirty(true);
          }}
        />
      </div>

      {/* Status Bar (Bottom) */}
      <EditorStatusBar
        currentPage={currentPage}
        pageCount={pageCount || 1}
        scale={scale}
        fitMode={fitMode}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((s) => !s)}
        onPrevPage={() => setCurrentPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setCurrentPage((p) => Math.min(pageCount || 1, p + 1))}
        onPageChange={setCurrentPage}
        onZoomIn={() => setScale((s) => Math.min(8.0, s * 1.25))}
        onZoomOut={() => setScale((s) => Math.max(0.25, s / 1.25))}
        onFitModeChange={setFitMode}
      />

      {/* Command Palette Modal */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Shortcuts Help Modal */}
      <ShortcutsHelpDialog open={shortcutsHelpOpen} onClose={() => setShortcutsHelpOpen(false)} />
    </div>
  );
}
