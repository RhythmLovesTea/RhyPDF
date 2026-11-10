import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import {
  EditSession,
  MoveObjectCommand,
  ResizeObjectCommand,
  RotateObjectCommand,
  DeleteObjectCommand,
  InsertObjectCommand,
  ChangeStyleCommand,
  BatchCommand,
  ClipboardManager,
  computeSelectionBounds
} from '@rhypdf/edit-core';
import type { PageObject, Rect } from '@rhypdf/pdf-model';
import { useDocStore } from '../../stores/docStore';
import { useUIStore } from '../../stores/uiStore';
import { PdfViewer } from '../viewer/PdfViewer';
import { EditorTopBar } from './EditorTopBar';
import { EditorToolRail } from './EditorToolRail';
import { ContextualToolbar } from './ContextualToolbar';
import { PropertiesPanel, SelectedObjectProps } from './PropertiesPanel';
import { EditorStatusBar } from './EditorStatusBar';
import { SelectionOverlay } from './SelectionOverlay';
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

  // EditSession, undo/redo, and selection state (Tasks 5.1, 5.2, 5.11)
  const editSession = useMemo(
    () => new EditSession(currentDocId || 'session-doc', pageCount || 1),
    [currentDocId, pageCount]
  );
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pageObjectsMap, setPageObjectsMap] = useState<Map<number, PageObject[]>>(new Map());

  // Subscribe to edit session state changes
  useEffect(() => {
    const unsubscribe = editSession.subscribe((session) => {
      setCanUndo(session.canUndo);
      setCanRedo(session.canRedo);
      setSelectedIds(session.selection.selectedObjectIds);
      setDirty(session.isDirty);
    });
    return unsubscribe;
  }, [editSession, setDirty]);

  // Current page objects
  const activePageIdx = currentPage - 1;
  const currentObjects = useMemo(
    () => pageObjectsMap.get(activePageIdx) || [],
    [pageObjectsMap, activePageIdx]
  );

  // Update selectedObject in PropertiesPanel whenever selection changes
  useEffect(() => {
    if (selectedIds.length === 0) {
      setSelectedObject(null);
      return;
    }
    const bounds = computeSelectionBounds(currentObjects, selectedIds);
    if (bounds) {
      setSelectedObject({
        x: Math.round(bounds.left),
        y: Math.round(bounds.bottom),
        width: Math.round(bounds.right - bounds.left),
        height: Math.round(bounds.top - bounds.bottom),
        rotation: 0,
        opacity: 100
      });
    }
  }, [selectedIds, currentObjects]);

  // Command handlers
  const handleMoveObjects = useCallback(
    async (dxPt: number, dyPt: number) => {
      if (selectedIds.length === 0) return;

      const mutateFn = (_p: number, id: string, dx: number, dy: number) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          const updated = list.map((obj) => {
            if (obj.id === id && obj.bounds) {
              return {
                ...obj,
                bounds: {
                  left: obj.bounds.left + dx,
                  right: obj.bounds.right + dx,
                  bottom: obj.bounds.bottom + dy,
                  top: obj.bounds.top + dy
                }
              };
            }
            return obj;
          });
          next.set(activePageIdx, updated);
          return next;
        });
      };

      if (selectedIds.length === 1) {
        const cmd = new MoveObjectCommand(activePageIdx, selectedIds[0]!, dxPt, dyPt, mutateFn);
        await editSession.execute(cmd);
      } else {
        const commands = selectedIds.map(
          (id) => new MoveObjectCommand(activePageIdx, id, dxPt, dyPt, mutateFn)
        );
        const batch = new BatchCommand(
          `Move ${selectedIds.length} objects`,
          commands,
          activePageIdx
        );
        await editSession.execute(batch);
      }
    },
    [selectedIds, activePageIdx, editSession]
  );

  const handleResizeObjects = useCallback(
    async (newBoundsPdf: Rect) => {
      if (selectedIds.length !== 1) return;
      const targetId = selectedIds[0]!;
      const currentObj = currentObjects.find((o) => o.id === targetId);
      if (!currentObj?.bounds) return;

      const setBoundsFn = (_p: number, id: string, bounds: Rect) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          const updated = list.map((obj) => (obj.id === id ? { ...obj, bounds } : obj));
          next.set(activePageIdx, updated);
          return next;
        });
      };

      const cmd = new ResizeObjectCommand(
        activePageIdx,
        targetId,
        currentObj.bounds,
        newBoundsPdf,
        setBoundsFn
      );
      await editSession.execute(cmd);
    },
    [selectedIds, currentObjects, activePageIdx, editSession]
  );

  const handleRotateObjects = useCallback(
    async (angleDeg: number) => {
      if (selectedIds.length !== 1) return;
      const targetId = selectedIds[0]!;
      const currentObj = currentObjects.find((o) => o.id === targetId);
      if (!currentObj) return;

      const setMatrixFn = (
        _p: number,
        id: string,
        matrix: [number, number, number, number, number, number]
      ) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          const updated = list.map((obj) => (obj.id === id ? { ...obj, matrix } : obj));
          next.set(activePageIdx, updated);
          return next;
        });
      };

      const rad = (angleDeg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const newMatrix: [number, number, number, number, number, number] = [
        cos,
        sin,
        -sin,
        cos,
        currentObj.matrix[4],
        currentObj.matrix[5]
      ];

      const cmd = new RotateObjectCommand(
        activePageIdx,
        targetId,
        currentObj.matrix,
        newMatrix,
        setMatrixFn
      );
      await editSession.execute(cmd);
    },
    [selectedIds, currentObjects, activePageIdx, editSession]
  );

  const handleDeleteObjects = useCallback(async () => {
    if (selectedIds.length === 0) return;

    const toDelete = currentObjects.filter((o) => selectedIds.includes(o.id));
    if (toDelete.length === 0) return;

    const deleteFn = (_p: number, id: string) => {
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const list = next.get(activePageIdx) || [];
        next.set(
          activePageIdx,
          list.filter((o) => o.id !== id)
        );
        return next;
      });
    };

    const insertFn = (_p: number, obj: PageObject, index?: number) => {
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const list = [...(next.get(activePageIdx) || [])];
        if (typeof index === 'number') {
          list.splice(index, 0, obj);
        } else {
          list.push(obj);
        }
        next.set(activePageIdx, list);
        return next;
      });
    };

    if (toDelete.length === 1 && toDelete[0]) {
      const cmd = new DeleteObjectCommand(activePageIdx, toDelete[0], deleteFn, insertFn);
      await editSession.execute(cmd);
    } else {
      const commands = toDelete.map(
        (obj) => new DeleteObjectCommand(activePageIdx, obj, deleteFn, insertFn)
      );
      const batch = new BatchCommand(`Delete ${toDelete.length} objects`, commands, activePageIdx);
      await editSession.execute(batch);
    }

    editSession.clearSelection();
  }, [selectedIds, currentObjects, activePageIdx, editSession]);

  const handleCopy = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const toCopy = currentObjects.filter((o) => selectedIds.includes(o.id));
    await ClipboardManager.getInstance().copy(toCopy, activePageIdx, currentDocId || undefined);
  }, [selectedIds, currentObjects, activePageIdx, currentDocId]);

  const handleCut = useCallback(async () => {
    if (selectedIds.length === 0) return;
    await handleCopy();
    await handleDeleteObjects();
  }, [handleCopy, handleDeleteObjects, selectedIds.length]);

  const handlePaste = useCallback(async () => {
    const clipboard = ClipboardManager.getInstance();
    if (!clipboard.hasData) return;

    const newObjects = clipboard.paste(activePageIdx);
    if (newObjects.length === 0) return;

    const insertFn = (_p: number, obj: PageObject) => {
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const list = [...(next.get(activePageIdx) || [])];
        list.push(obj);
        next.set(activePageIdx, list);
        return next;
      });
    };

    const deleteFn = (_p: number, id: string) => {
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const list = next.get(activePageIdx) || [];
        next.set(
          activePageIdx,
          list.filter((o) => o.id !== id)
        );
        return next;
      });
    };

    const commands = newObjects.map(
      (obj) => new InsertObjectCommand(activePageIdx, obj, insertFn, deleteFn)
    );
    const batch = new BatchCommand(`Paste ${newObjects.length} objects`, commands, activePageIdx);
    await editSession.execute(batch);

    editSession.selectAll(
      activePageIdx,
      newObjects.map((o) => o.id)
    );
  }, [activePageIdx, editSession]);

  const handleDuplicate = useCallback(async () => {
    if (selectedIds.length === 0) return;
    const toDuplicate = currentObjects.filter((o) => selectedIds.includes(o.id));
    const duplicated = ClipboardManager.getInstance().duplicate(toDuplicate);

    const insertFn = (_p: number, obj: PageObject) => {
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const list = [...(next.get(activePageIdx) || [])];
        list.push(obj);
        next.set(activePageIdx, list);
        return next;
      });
    };

    const deleteFn = (_p: number, id: string) => {
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const list = next.get(activePageIdx) || [];
        next.set(
          activePageIdx,
          list.filter((o) => o.id !== id)
        );
        return next;
      });
    };

    const commands = duplicated.map(
      (obj) => new InsertObjectCommand(activePageIdx, obj, insertFn, deleteFn)
    );
    const batch = new BatchCommand(
      `Duplicate ${duplicated.length} objects`,
      commands,
      activePageIdx
    );
    await editSession.execute(batch);

    editSession.selectAll(
      activePageIdx,
      duplicated.map((o) => o.id)
    );
  }, [selectedIds, currentObjects, activePageIdx, editSession]);

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

  // Global keyboard shortcuts (Tasks 5.9, 5.10, 5.11)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'z' &&
        !isInput
      ) {
        // Undo (Ctrl+Z)
        e.preventDefault();
        void editSession.undo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y')
      ) {
        // Redo (Ctrl+Shift+Z or Ctrl+Y)
        e.preventDefault();
        void editSession.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && !isInput) {
        // Select all objects on active page (Ctrl+A)
        e.preventDefault();
        editSession.selectAll(
          activePageIdx,
          currentObjects.map((o) => o.id)
        );
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !isInput) {
        // Copy (Ctrl+C)
        e.preventDefault();
        void handleCopy();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x' && !isInput) {
        // Cut (Ctrl+X)
        e.preventDefault();
        void handleCut();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && !isInput) {
        // Paste (Ctrl+V)
        e.preventDefault();
        void handlePaste();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && !isInput) {
        // Duplicate (Ctrl+D)
        e.preventDefault();
        void handleDuplicate();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        // Delete selected objects
        if (selectedIds.length > 0) {
          e.preventDefault();
          void handleDeleteObjects();
        }
      } else if (!isInput && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        // Nudge with arrow keys (Task 5.9: 1pt, Shift = 10pt)
        if (selectedIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          let dx = 0;
          let dy = 0;
          if (e.key === 'ArrowLeft') dx = -step;
          if (e.key === 'ArrowRight') dx = step;
          if (e.key === 'ArrowDown') dy = -step;
          if (e.key === 'ArrowUp') dy = step;
          void handleMoveObjects(dx, dy);
        }
      } else if (e.key === 'F1' || (e.key === '?' && !isInput)) {
        e.preventDefault();
        setShortcutsHelpOpen(true);
      } else if (e.key === 'v' && !isInput) {
        setActiveMode('view');
      } else if (e.key === 't' && !isInput) {
        setActiveMode('edit-text');
      } else if (e.key === 'i' && !isInput) {
        setActiveMode('edit-images');
      } else if (e.key === 'a' && !isInput) {
        setActiveMode('annotate');
      } else if (e.key === 'p' && !isInput) {
        setActiveMode('pages');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editSession,
    activePageIdx,
    currentObjects,
    selectedIds,
    handleCopy,
    handleCut,
    handlePaste,
    handleDuplicate,
    handleDeleteObjects,
    handleMoveObjects,
    setActiveMode
  ]);

  const handleDownload = useCallback(async () => {
    if (currentDocId) {
      await downloadRecentFile(currentDocId, filename || 'document.pdf');
    }
  }, [currentDocId, filename]);

  const handleUndo = useCallback(() => {
    void editSession.undo();
  }, [editSession]);

  const handleRedo = useCallback(() => {
    void editSession.redo();
  }, [editSession]);

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
        id: 'duplicate',
        category: t('commands.categoryEdit'),
        title: 'Duplicate Selection',
        shortcut: 'Ctrl+D',
        onSelect: () => void handleDuplicate()
      },
      {
        id: 'delete-selected',
        category: t('commands.categoryEdit'),
        title: 'Delete Selected',
        shortcut: 'Delete',
        onSelect: () => void handleDeleteObjects()
      },
      {
        id: 'select-all',
        category: t('commands.categoryEdit'),
        title: 'Select All Objects',
        shortcut: 'Ctrl+A',
        onSelect: () =>
          editSession.selectAll(
            activePageIdx,
            currentObjects.map((o) => o.id)
          )
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
    [
      t,
      handleDownload,
      handleUndo,
      handleRedo,
      handleDuplicate,
      handleDeleteObjects,
      editSession,
      activePageIdx,
      currentObjects,
      setActiveMode
    ]
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
        canUndo={canUndo}
        canRedo={canRedo}
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
              renderOverlay={(pageIdx, metric) => {
                if (pageIdx !== activePageIdx) return null;
                return (
                  <SelectionOverlay
                    pageWidthPt={metric.width}
                    pageHeightPt={metric.height}
                    rotation={metric.rotation}
                    scale={scale}
                    pageObjects={currentObjects}
                    selectedIds={selectedIds}
                    onSelectIds={(ids) => editSession.selectAll(activePageIdx, ids)}
                    onMove={handleMoveObjects}
                    onResize={handleResizeObjects}
                    onRotate={handleRotateObjects}
                    onClearSelection={() => editSession.clearSelection()}
                  />
                );
              }}
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

        {/* Properties Panel (Right) (Task 5.9: numeric X / Y / W / H inputs) */}
        <PropertiesPanel
          open={propertiesOpen}
          onToggle={() => setPropertiesOpen((p) => !p)}
          selectedObject={selectedObject}
          onUpdateObject={async (updates) => {
            if (!selectedObject) return;
            const updated = { ...selectedObject, ...updates };
            setSelectedObject(updated);

            if (selectedIds.length === 1) {
              const targetId = selectedIds[0]!;
              // If position moved
              if (updates.x !== undefined || updates.y !== undefined) {
                const dx = (updates.x ?? selectedObject.x) - selectedObject.x;
                const dy = (updates.y ?? selectedObject.y) - selectedObject.y;
                if (dx !== 0 || dy !== 0) {
                  await handleMoveObjects(dx, dy);
                }
              }
              // If size changed
              if (updates.width !== undefined || updates.height !== undefined) {
                const newBounds: Rect = {
                  left: updated.x,
                  bottom: updated.y,
                  right: updated.x + updated.width,
                  top: updated.y + updated.height
                };
                await handleResizeObjects(newBounds);
              }
              // If rotation changed
              if (updates.rotation !== undefined) {
                await handleRotateObjects(updates.rotation);
              }
              // If opacity changed
              if (updates.opacity !== undefined) {
                const styleCmd = new ChangeStyleCommand(
                  activePageIdx,
                  targetId,
                  'opacity',
                  selectedObject.opacity,
                  updates.opacity,
                  (_p, id, prop, val) => {
                    setPageObjectsMap((prev) => {
                      const next = new Map(prev);
                      const list = next.get(activePageIdx) || [];
                      const modified = list.map((obj) =>
                        obj.id === id ? { ...obj, [prop]: val } : obj
                      );
                      next.set(activePageIdx, modified);
                      return next;
                    });
                  }
                );
                await editSession.execute(styleCmd);
              }
            }
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
