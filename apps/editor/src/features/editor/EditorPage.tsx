import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { Button, Dialog } from '@rhypdf/ui';
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
  computeSelectionBounds,
  calculateEffectiveDpi,
  calculatePresetCropBox,
  calculateReplacedBounds,
  isLargePageImage,
  CropPreset,
  CropImageCommand,
  ReplaceImageCommand,
  FlipImageCommand,
  ReorderObjectCommand,
  groupTextRunsToBlocks,
  groupRunsInRegion,
  findInTextBlocks,
  applyReplacementToBlock,
  CommitTextBlockCommand,
  InsertTextBlockCommand,
  SetFontFamilyCommand,
  SetFontSizeCommand,
  SetTextStyleCommand,
  SetTextColorCommand,
  SetTextHighlightColorCommand,
  SetTextAlignmentCommand,
  SetTextSpacingCommand,
  type TextBlock,
  type FindReplaceMatch,
  type CommitTextBlockOptions
} from '@rhypdf/edit-core';
import { FontCatalog } from '@rhypdf/fonts';
import type { PageObject, ImageObject, Rect, TextRun } from '@rhypdf/pdf-model';
import { useDocStore } from '../../stores/docStore';
import { useUIStore } from '../../stores/uiStore';
import { PdfViewer, PageMetric } from '../viewer/PdfViewer';
import { PdfiumEngine, MockPdfEngine, type PdfEngine, type DocumentHandle } from '@rhypdf/pdf-engine';
import { EditorTopBar } from './EditorTopBar';
import { EditorToolRail } from './EditorToolRail';
import { ContextualToolbar } from './ContextualToolbar';
import { PropertiesPanel, SelectedObjectProps } from './PropertiesPanel';
import { EditorStatusBar } from './EditorStatusBar';
import { SelectionOverlay } from './SelectionOverlay';
import { TextEditorOverlay } from './TextEditorOverlay';
import { FindReplaceBar } from './FindReplaceBar';
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
    activeMode,
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
  const activePageIdx = currentPage - 1;
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

  // Image editing specific state (Phase 6)
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropBoxPdf, setCropBoxPdf] = useState<Rect | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Text editing specific state (Phase 7)
  const [activeTextBlockId, setActiveTextBlockId] = useState<string | null>(null);
  const [editingTextBlockId, setEditingTextBlockId] = useState<string | null>(null);
  const [isRegionSelectMode, setIsRegionSelectMode] = useState(false);
  const [pageTextRunsMap, setPageTextRunsMap] = useState<Map<number, TextRun[]>>(new Map());
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findMatches, setFindMatches] = useState<FindReplaceMatch[]>([]);
  const [currentFindMatchIndex, setCurrentFindMatchIndex] = useState(0);
  const [findOverflowWarning, setFindOverflowWarning] = useState(false);
  const [blockOverrides, setBlockOverrides] = useState<Map<string, Partial<TextBlock>>>(new Map());

  // PDF Engine & Document Handle
  const [engine, setEngine] = useState<PdfEngine | null>(null);
  const [docHandle, setDocHandle] = useState<DocumentHandle | null>(null);
  const [pageMetricsMap, setPageMetricsMap] = useState<Map<number, PageMetric>>(new Map());
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [docError, setDocError] = useState<{ code: string; message?: string } | null>(null);

  // Initialize engine and open document working copy
  useEffect(() => {
    if (!currentDocId) {
      setDocHandle(null);
      return;
    }

    let cancelled = false;

    async function initAndOpen() {
      setIsLoadingDoc(true);
      setDocError(null);
      try {
        let eng = engine;
        if (!eng) {
          try {
            eng = await PdfiumEngine.create({ wasmUrl: '/pdfium.wasm' });
          } catch (e) {
            console.warn('[EditorPage] PdfiumEngine.create fallback to MockPdfEngine', e);
            eng = new MockPdfEngine();
          }
          if (cancelled) return;
          setEngine(eng);
        }

        const bytes = await loadWorkingCopy(currentDocId!);
        let handle: DocumentHandle;
        let totalPages = 1;

        if (bytes && bytes.byteLength > 0) {
          handle = await eng.open(bytes);
          totalPages = await eng.pageCount(handle);
        } else {
          // Fallback empty document
          try {
            const emptyBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);
            handle = await eng.open(emptyBytes.buffer);
            totalPages = await eng.pageCount(handle);
          } catch {
            const mock = new MockPdfEngine();
            eng = mock;
            setEngine(mock);
            handle = await mock.open(new Uint8Array(10).buffer);
            totalPages = pageCount || 1;
          }
        }

        if (cancelled) {
          await eng.close(handle).catch(() => {});
          return;
        }
        setDocHandle(handle);

        // Update docStore with actual page count
        if (totalPages > 0) {
          const store = useDocStore.getState();
          store.setDoc(
            currentDocId!,
            store.filename || filename || 'document.pdf',
            totalPages,
            store.fileHandle,
            store.storageType || 'opfs'
          );
        }

        // Cache page metrics
        const metrics = new Map<number, PageMetric>();
        for (let i = 0; i < totalPages; i++) {
          try {
            const info = await eng.pageInfo(handle, i);
            metrics.set(i, {
              width: info.width,
              height: info.height,
              rotation: (info.rotation as 0 | 90 | 180 | 270) ?? 0
            });
          } catch {
            metrics.set(i, { width: 595.28, height: 841.89, rotation: 0 });
          }
        }
        if (cancelled) return;
        setPageMetricsMap(metrics);

        // Preload page objects for initial page
        try {
          const initialObjs = await eng.getPageObjects(handle, 0);
          if (!cancelled) {
            setPageObjectsMap((prev) => new Map(prev).set(0, initialObjs));
          }
        } catch {
          // Ignore
        }
      } catch (err: unknown) {
        console.error('[EditorPage] Failed to load document into engine:', err);
        if (!cancelled) {
          setDocError({
            code: 'LoadError',
            message: err instanceof Error ? err.message : String(err)
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDoc(false);
        }
      }
    }

    void initAndOpen();

    return () => {
      cancelled = true;
    };
  }, [currentDocId]);

  // Preload page objects when active page index changes
  useEffect(() => {
    if (!engine || !docHandle) return;
    if (pageObjectsMap.has(activePageIdx)) return;

    let cancelled = false;
    void engine
      .getPageObjects(docHandle, activePageIdx)
      .then((objs) => {
        if (!cancelled) {
          setPageObjectsMap((prev) => new Map(prev).set(activePageIdx, objs));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [engine, docHandle, activePageIdx, pageObjectsMap]);

  // Current page objects
  const currentObjects = useMemo(
    () => pageObjectsMap.get(activePageIdx) || [],
    [pageObjectsMap, activePageIdx]
  );

  // Group text runs into blocks for active page (Tasks 7.1, 7.2, 7.3, 7.4)
  const currentRuns = useMemo<TextRun[]>(() => {
    return currentObjects.filter((o): o is TextRun => o.type === 'text');
  }, [currentObjects]);

  const currentMetric = pageMetricsMap.get(activePageIdx) || {
    width: 595.28,
    height: 841.89,
    rotation: 0
  };

  const currentTextBlocks = useMemo<TextBlock[]>(() => {
    const blocks = groupTextRunsToBlocks(currentRuns, activePageIdx, {
      pageHeight: currentMetric.height
    });
    return blocks.map((b) => {
      const override = blockOverrides.get(b.id);
      if (!override) return b;
      return { ...b, ...override };
    });
  }, [currentRuns, activePageIdx, currentMetric.height, blockOverrides]);

  const activeTextBlock = useMemo<TextBlock | null>(() => {
    if (activeTextBlockId) {
      const found = currentTextBlocks.find((b) => b.id === activeTextBlockId);
      if (found) return found;
    }
    if (selectedIds.length > 0) {
      const idSet = new Set(selectedIds);
      return currentTextBlocks.find((b) => b.runs.some((r) => idSet.has(r.id))) || null;
    }
    return null;
  }, [activeTextBlockId, selectedIds, currentTextBlocks]);

  // Selected image helper
  const selectedImage = useMemo<ImageObject | null>(() => {
    if (selectedIds.length !== 1) return null;
    const obj = currentObjects.find((o) => o.id === selectedIds[0]);
    return obj?.type === 'image' ? (obj as ImageObject) : null;
  }, [selectedIds, currentObjects]);

  // Effective DPI for selected image
  const imageDpiResult = useMemo(() => {
    if (!selectedImage?.bounds || !selectedImage.pixelWidth || !selectedImage.pixelHeight) {
      return null;
    }
    return calculateEffectiveDpi(
      selectedImage.pixelWidth,
      selectedImage.pixelHeight,
      selectedImage.bounds
    );
  }, [selectedImage]);

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

  // Update selectedObject in PropertiesPanel whenever selection changes
  useEffect(() => {
    if (selectedIds.length === 0 && !activeTextBlock) {
      setSelectedObject(null);
      setIsCropping(false);
      setCropBoxPdf(null);
      return;
    }

    if (activeMode === 'edit-text' && activeTextBlock) {
      const hl = activeTextBlock.highlightColor;
      const hlHex = hl
        ? `#${hl.r.toString(16).padStart(2, '0')}${hl.g.toString(16).padStart(2, '0')}${hl.b.toString(16).padStart(2, '0')}`
        : null;

      setSelectedObject({
        id: activeTextBlock.id,
        type: 'text',
        x: Math.round(activeTextBlock.bounds.left),
        y: Math.round(activeTextBlock.bounds.bottom),
        width: Math.round(activeTextBlock.bounds.right - activeTextBlock.bounds.left),
        height: Math.round(activeTextBlock.bounds.top - activeTextBlock.bounds.bottom),
        rotation: activeTextBlock.rotation,
        opacity: Math.round((activeTextBlock.opacity ?? 1) * 100),
        textPreview: activeTextBlock.lines.map((l) => l.text).join(' '),
        fontFamily: activeTextBlock.primaryFont,
        fontSize: activeTextBlock.primaryFontSize,
        alignment: activeTextBlock.alignment,
        canReuseFont: activeTextBlock.fontReusability.canReuseFont,
        isSubset: activeTextBlock.fontReusability.isSubset,
        missingGlyphs: activeTextBlock.fontReusability.missingGlyphs,
        isBold: activeTextBlock.isBold,
        isItalic: activeTextBlock.isItalic,
        isUnderline: activeTextBlock.isUnderline,
        isStrikethrough: activeTextBlock.isStrikethrough,
        isSuperscript: activeTextBlock.isSuperscript,
        isSubscript: activeTextBlock.isSubscript,
        highlightColor: hlHex,
        lineSpacing: activeTextBlock.lineSpacing,
        letterSpacing: activeTextBlock.letterSpacing,
        paragraphSpacing: activeTextBlock.paragraphSpacing,
        originalFontName:
          activeTextBlock.originalFontName ||
          (activeTextBlock.fontReusability.isSubset
            ? activeTextBlock.fontReusability.fontName
            : undefined)
      });
      return;
    }

    const bounds = computeSelectionBounds(currentObjects, selectedIds);
    if (bounds) {
      setSelectedObject({
        id: selectedImage ? selectedImage.id : selectedIds[0],
        type: selectedImage ? 'image' : currentObjects.find((o) => o.id === selectedIds[0])?.type,
        x: Math.round(bounds.left),
        y: Math.round(bounds.bottom),
        width: Math.round(bounds.right - bounds.left),
        height: Math.round(bounds.top - bounds.bottom),
        rotation: 0,
        opacity: 100,
        pixelWidth: selectedImage?.pixelWidth,
        pixelHeight: selectedImage?.pixelHeight,
        effectiveDpi: imageDpiResult?.minDpi,
        isLowRes: imageDpiResult?.isLowRes
      });
    }
  }, [selectedIds, currentObjects, selectedImage, imageDpiResult, activeMode, activeTextBlock]);

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

  const executeDeleteObjects = useCallback(async () => {
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

  // Delete handler with Task 6.7 background confirmation
  const handleDeleteObjects = useCallback(async () => {
    if (selectedIds.length === 1 && selectedImage?.bounds) {
      const isLarge = isLargePageImage(
        selectedImage.bounds,
        { width: 595.28, height: 841.89 },
        0.8
      );
      if (isLarge) {
        setShowDeleteConfirm(true);
        return;
      }
    }
    await executeDeleteObjects();
  }, [selectedIds, selectedImage, executeDeleteObjects]);

  // Image actions (Phase 6)
  const handleCropPreset = useCallback(
    (preset: CropPreset) => {
      if (!selectedImage?.bounds) return;
      const crop = calculatePresetCropBox(selectedImage.bounds, preset);
      setCropBoxPdf(crop);
      setIsCropping(true);
    },
    [selectedImage]
  );

  const handleApplyCrop = useCallback(async () => {
    if (!selectedImage?.bounds || !cropBoxPdf) return;

    const setBoundsFn = (_p: number, id: string, bounds: Rect) => {
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const list = next.get(activePageIdx) || [];
        next.set(
          activePageIdx,
          list.map((o) => (o.id === id ? { ...o, bounds } : o))
        );
        return next;
      });
    };

    const cmd = new CropImageCommand(
      activePageIdx,
      selectedImage.id,
      selectedImage.bounds,
      cropBoxPdf,
      setBoundsFn
    );
    await editSession.execute(cmd);
    setIsCropping(false);
    setCropBoxPdf(null);
  }, [selectedImage, cropBoxPdf, activePageIdx, editSession]);

  const handleFlip = useCallback(
    async (direction: 'horizontal' | 'vertical') => {
      if (!selectedImage) return;

      const setMatrixFn = (
        _p: number,
        id: string,
        matrix: [number, number, number, number, number, number]
      ) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          next.set(
            activePageIdx,
            list.map((o) => (o.id === id ? { ...o, matrix } : o))
          );
          return next;
        });
      };

      const cmd = new FlipImageCommand(
        activePageIdx,
        selectedImage.id,
        selectedImage.matrix,
        direction,
        setMatrixFn
      );
      await editSession.execute(cmd);
    },
    [selectedImage, activePageIdx, editSession]
  );

  const handleRotate90 = useCallback(
    async (deltaDeg: 90 | -90) => {
      if (!selectedImage) return;
      await handleRotateObjects(deltaDeg);
    },
    [selectedImage, handleRotateObjects]
  );

  const handleLayerReorder = useCallback(
    async (action: 'forward' | 'backward' | 'front' | 'back') => {
      if (!selectedImage) return;

      const oldZ = selectedImage.zIndex ?? 1;
      let newZ = oldZ;
      if (action === 'forward') newZ = oldZ + 1;
      else if (action === 'backward') newZ = Math.max(0, oldZ - 1);
      else if (action === 'front') newZ = currentObjects.length + 5;
      else if (action === 'back') newZ = 0;

      const setZIndexFn = (_p: number, id: string, zIndex: number) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          const updated = list.map((o) => (o.id === id ? { ...o, zIndex } : o));
          updated.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
          next.set(activePageIdx, updated);
          return next;
        });
      };

      const cmd = new ReorderObjectCommand(
        activePageIdx,
        selectedImage.id,
        oldZ,
        newZ,
        setZIndexFn
      );
      await editSession.execute(cmd);
    },
    [selectedImage, currentObjects, activePageIdx, editSession]
  );

  const handleOpacityChange = useCallback(
    async (opacity: number) => {
      if (!selectedImage) return;

      const styleCmd = new ChangeStyleCommand(
        activePageIdx,
        selectedImage.id,
        'opacity',
        selectedObject?.opacity ?? 100,
        opacity,
        (_p, id, prop, val) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(activePageIdx) || [];
            next.set(
              activePageIdx,
              list.map((o) => (o.id === id ? { ...o, [prop]: val } : o))
            );
            return next;
          });
        }
      );
      await editSession.execute(styleCmd);
    },
    [selectedImage, selectedObject, activePageIdx, editSession]
  );

  const handleInsertImageFile = useCallback(
    async (file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await new Promise((res) => {
        img.onload = res;
      });

      const pixelWidth = img.naturalWidth || 400;
      const pixelHeight = img.naturalHeight || 300;
      URL.revokeObjectURL(url);

      // Auto-scale to fit page width at center (Task 6.9)
      const maxW = 350;
      const maxH = 400;
      const ratio = pixelWidth / pixelHeight;
      let targetW = maxW;
      let targetH = maxW / ratio;
      if (targetH > maxH) {
        targetH = maxH;
        targetW = maxH * ratio;
      }

      const centerX = 595.28 / 2;
      const centerY = 841.89 / 2;
      const bounds: Rect = {
        left: Math.round(centerX - targetW / 2),
        right: Math.round(centerX + targetW / 2),
        bottom: Math.round(centerY - targetH / 2),
        top: Math.round(centerY + targetH / 2)
      };

      const dpiRes = calculateEffectiveDpi(pixelWidth, pixelHeight, bounds);
      const newImage: ImageObject = {
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'image',
        pixelWidth,
        pixelHeight,
        effectiveDpi: { x: dpiRes.dpiX, y: dpiRes.dpiY },
        format: file.type.includes('png') ? 'png' : 'jpeg',
        bounds,
        matrix: [1, 0, 0, 1, bounds.left, bounds.bottom],
        zIndex: currentObjects.length + 1
      };

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

      const cmd = new InsertObjectCommand(activePageIdx, newImage, insertFn, deleteFn);
      await editSession.execute(cmd);
      editSession.selectObject(activePageIdx, newImage.id);
    },
    [activePageIdx, currentObjects, editSession]
  );

  const handleReplaceImageFile = useCallback(
    async (file: File) => {
      if (!selectedImage?.bounds) return;

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      await new Promise((res) => {
        img.onload = res;
      });

      const pixelWidth = img.naturalWidth || 400;
      const pixelHeight = img.naturalHeight || 300;
      URL.revokeObjectURL(url);

      const newBounds = calculateReplacedBounds(
        selectedImage.bounds,
        pixelWidth,
        pixelHeight,
        'fit'
      );

      const repDpi = calculateEffectiveDpi(pixelWidth, pixelHeight, newBounds);
      const replacement: ImageObject = {
        ...selectedImage,
        pixelWidth,
        pixelHeight,
        format: file.type.includes('png') ? 'png' : 'jpeg',
        effectiveDpi: { x: repDpi.dpiX, y: repDpi.dpiY },
        bounds: newBounds
      };

      const updateFn = (_p: number, id: string, updated: ImageObject) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          next.set(
            activePageIdx,
            list.map((o) => (o.id === id ? updated : o))
          );
          return next;
        });
      };

      const cmd = new ReplaceImageCommand(
        activePageIdx,
        selectedImage.id,
        selectedImage,
        replacement,
        updateFn
      );
      await editSession.execute(cmd);
    },
    [selectedImage, activePageIdx, editSession]
  );

  const handleDownloadImage = useCallback(() => {
    if (!selectedImage) return;
    // Create a mock/real download anchor for the image (Task 6.12)
    const canvas = document.createElement('canvas');
    canvas.width = selectedImage.pixelWidth || 200;
    canvas.height = selectedImage.pixelHeight || 200;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(`Image ${selectedImage.id}`, 20, 40);
    }
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${selectedImage.id}.png`;
    a.click();
  }, [selectedImage]);

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

  // Global keyboard shortcuts (Tasks 5.9, 5.10, 5.11, 6.2, 6.3)
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
        const selectable =
          activeMode === 'edit-images'
            ? currentObjects.filter((o) => o.type === 'image')
            : currentObjects;
        editSession.selectAll(
          activePageIdx,
          selectable.map((o) => o.id)
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
        // Nudge with arrow keys (Task 5.9 & 6.3: 1pt, Shift = 10pt)
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

    // Clipboard paste listener for image files (Task 6.9)
    const handlePasteEvent = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleInsertImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('paste', handlePasteEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('paste', handlePasteEvent);
    };
  }, [
    editSession,
    activePageIdx,
    currentObjects,
    selectedIds,
    activeMode,
    handleCopy,
    handleCut,
    handlePaste,
    handleDuplicate,
    handleDeleteObjects,
    handleMoveObjects,
    handleInsertImageFile,
    setActiveMode
  ]);

  // Task 7.11, 7.13, 7.14, 7.20, 7.21: Text block commit
  const handleCommitTextBlock = useCallback(
    async (blockId: string, newLines: string[], options?: CommitTextBlockOptions) => {
      const targetBlock = currentTextBlocks.find((b) => b.id === blockId);
      if (!targetBlock) return;

      const fontName = options?.fontName || targetBlock.primaryFont;
      const fontSize = options?.fontSize || targetBlock.primaryFontSize;
      const color = options?.color || targetBlock.primaryColor;
      const lineHeight = fontSize * 1.25;

      const oldRunIds = targetBlock.runs.map((r) => r.id);

      // Create new text runs
      const newRuns: TextRun[] = newLines.map((lineText, idx) => {
        const baseline = targetBlock.bounds.top - (idx + 1) * lineHeight;
        const lineBounds: Rect = {
          left: targetBlock.bounds.left,
          bottom: baseline,
          right: targetBlock.bounds.right,
          top: baseline + fontSize
        };
        return {
          id: `text-run-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'text',
          text: lineText,
          fontName,
          fontSize,
          fillColor: color,
          bounds: lineBounds,
          matrix: [1, 0, 0, 1, targetBlock.bounds.left, baseline],
          zIndex: 100 + idx,
          isEmbeddedSubset: false,
          rotation: targetBlock.rotation
        };
      });

      // Prepare engine mutations
      const ops: any[] = [];
      for (const oldId of oldRunIds) {
        ops.push({ type: 'removeObject', objectId: oldId });
      }
      for (const r of newRuns) {
        ops.push({
          type: 'insertText',
          text: r.text,
          fontName: r.fontName,
          fontSize: r.fontSize,
          fillColor: r.fillColor,
          matrix: r.matrix
        });
      }

      if (engine && docHandle) {
        try {
          await engine.mutate(docHandle, activePageIdx, ops);
        } catch (e) {
          console.warn('[EditorPage] engine.mutate failed:', e);
        }
      }

      // Update local page objects map
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const cur = next.get(activePageIdx) || [];
        const filtered = cur.filter((o) => !oldRunIds.includes(o.id));
        next.set(activePageIdx, [...filtered, ...newRuns]);
        return next;
      });

      // Wrap in CommitTextBlockCommand with coalescing support
      const cmd = new CommitTextBlockCommand(
        activePageIdx,
        blockId,
        targetBlock,
        newLines,
        options,
        undefined,
        (_p, _bid, restoredRuns) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const cur = next.get(activePageIdx) || [];
            const newIds = new Set(newRuns.map((r) => r.id));
            const filtered = cur.filter((o) => !newIds.has(o.id));
            next.set(activePageIdx, [...filtered, ...restoredRuns]);
            return next;
          });
        }
      );
      await editSession.execute(cmd);

      setEditingTextBlockId(null);
    },
    [currentTextBlocks, engine, docHandle, activePageIdx, editSession]
  );

  // Task 7.15: Add Text Box
  const handleAddTextBox = useCallback(async () => {
    const defaultBounds: Rect = {
      left: 100,
      bottom: 500,
      right: 280,
      top: 524
    };

    const cmd = new InsertTextBlockCommand(
      activePageIdx,
      'Click to edit text',
      defaultBounds,
      'Roboto',
      14,
      { r: 0, g: 0, b: 0, a: 255 },
      async (_page, run) => {
        if (engine && docHandle) {
          try {
            await engine.mutate(docHandle, activePageIdx, [
              {
                type: 'insertText',
                text: run.text,
                fontName: run.fontName,
                fontSize: run.fontSize,
                fillColor: run.fillColor,
                matrix: run.matrix
              }
            ]);
          } catch {
            // Fallback
          }
        }
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = [...(next.get(activePageIdx) || []), run];
          next.set(activePageIdx, list);
          return next;
        });
        editSession.selectAll(activePageIdx, [run.id]);
      },
      (_page, runId) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = (next.get(activePageIdx) || []).filter((o) => o.id !== runId);
          next.set(activePageIdx, list);
          return next;
        });
      }
    );

    await editSession.execute(cmd);
  }, [activePageIdx, editSession, engine, docHandle]);

  // Task 7.6: Region Select
  const handleRegionSelected = useCallback(
    (regionPdf: Rect) => {
      const block = groupRunsInRegion(currentRuns, regionPdf, activePageIdx);
      if (block) {
        setActiveTextBlockId(block.id);
        editSession.selectAll(activePageIdx, block.runs.map((r) => r.id));
      }
      setIsRegionSelectMode(false);
    },
    [currentRuns, activePageIdx, editSession]
  );

  // Task 7.10: Grow downward & Shrink to fit
  const handleGrowDownward = useCallback(
    (blockId: string, additionalHeightPt: number) => {
      const block = currentTextBlocks.find((b) => b.id === blockId);
      if (!block) return;
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const list = next.get(activePageIdx) || [];
        const runIds = new Set(block.runs.map((r) => r.id));
        const updated = list.map((obj) => {
          if (runIds.has(obj.id) && obj.bounds) {
            return {
              ...obj,
              bounds: { ...obj.bounds, bottom: obj.bounds.bottom - additionalHeightPt }
            };
          }
          return obj;
        });
        next.set(activePageIdx, updated);
        return next;
      });
    },
    [currentTextBlocks, activePageIdx]
  );

  const handleShrinkToFit = useCallback(
    (blockId: string, newFontSize: number) => {
      const block = currentTextBlocks.find((b) => b.id === blockId);
      if (!block) return;
      void handleCommitTextBlock(blockId, block.lines.map((l) => l.text), {
        fontSize: newFontSize
      });
    },
    [currentTextBlocks, handleCommitTextBlock]
  );

  // Task 7.18: Find & Replace
  const handleFindSearch = useCallback(
    (query: string, options: { caseSensitive: boolean; wholeWord: boolean }) => {
      const matches = findInTextBlocks(currentTextBlocks, query, options);
      setFindMatches(matches);
      setCurrentFindMatchIndex(0);
      setFindOverflowWarning(false);
    },
    [currentTextBlocks]
  );

  const handleNextFindMatch = useCallback(() => {
    if (findMatches.length === 0) return;
    setCurrentFindMatchIndex((prev) => (prev + 1) % findMatches.length);
  }, [findMatches.length]);

  const handlePrevFindMatch = useCallback(() => {
    if (findMatches.length === 0) return;
    setCurrentFindMatchIndex((prev) => (prev - 1 + findMatches.length) % findMatches.length);
  }, [findMatches.length]);

  const handleReplaceCurrent = useCallback(
    async (replacement: string) => {
      if (findMatches.length === 0 || currentFindMatchIndex >= findMatches.length) return;
      const match = findMatches[currentFindMatchIndex]!;
      const block = currentTextBlocks.find((b) => b.id === match.blockId);
      if (!block) return;

      const { updatedLines, isOverflow } = applyReplacementToBlock(block, match, replacement);
      setFindOverflowWarning(isOverflow);

      await handleCommitTextBlock(block.id, updatedLines);
      handleFindSearch(match.matchedText, { caseSensitive: false, wholeWord: false });
    },
    [findMatches, currentFindMatchIndex, currentTextBlocks, handleCommitTextBlock, handleFindSearch]
  );

  const handleReplaceAll = useCallback(
    async (replacement: string) => {
      if (findMatches.length === 0) return;

      let anyOverflow = false;
      for (const match of findMatches) {
        const block = currentTextBlocks.find((b) => b.id === match.blockId);
        if (!block) continue;
        const { updatedLines, isOverflow } = applyReplacementToBlock(block, match, replacement);
        if (isOverflow) anyOverflow = true;
        await handleCommitTextBlock(block.id, updatedLines);
      }

      setFindOverflowWarning(anyOverflow);
      setFindMatches([]);
    },
    [findMatches, currentTextBlocks, handleCommitTextBlock]
  );

  // Phase 8: Typography Handlers (Tasks 8.1 - 8.18)
  const fontCatalog = useMemo(() => FontCatalog.getInstance(), []);

  const handleFontFamilyChange = useCallback(
    async (newFamily: string) => {
      if (!activeTextBlock) return;
      const targetId = activeTextBlock.id;
      const oldFamily = activeTextBlock.primaryFont;
      const originalFont =
        activeTextBlock.originalFontName ||
        (activeTextBlock.fontReusability?.isSubset
          ? activeTextBlock.fontReusability.fontName
          : oldFamily);
      const runIds = new Set(activeTextBlock.runs.map((r) => r.id));

      const applyFn = (family: string) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          next.set(
            activePageIdx,
            list.map((o) => (runIds.has(o.id) && o.type === 'text' ? { ...o, fontName: family } : o))
          );
          return next;
        });
        setBlockOverrides((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetId) || {};
          next.set(targetId, { ...existing, primaryFont: family });
          return next;
        });
      };

      const cmd = new SetFontFamilyCommand(
        activePageIdx,
        targetId,
        oldFamily,
        newFamily,
        originalFont,
        applyFn
      );
      await editSession.execute(cmd);
    },
    [activeTextBlock, activePageIdx, editSession]
  );

  const handleFontSizeChange = useCallback(
    async (newSize: number) => {
      if (!activeTextBlock) return;
      const targetId = activeTextBlock.id;
      const oldSize = activeTextBlock.primaryFontSize;
      const runIds = new Set(activeTextBlock.runs.map((r) => r.id));

      const applyFn = (size: number) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          next.set(
            activePageIdx,
            list.map((o) => (runIds.has(o.id) && o.type === 'text' ? { ...o, fontSize: size } : o))
          );
          return next;
        });
        setBlockOverrides((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetId) || {};
          next.set(targetId, { ...existing, primaryFontSize: size });
          return next;
        });
      };

      const cmd = new SetFontSizeCommand(activePageIdx, targetId, oldSize, newSize, applyFn);
      await editSession.execute(cmd);
    },
    [activeTextBlock, activePageIdx, editSession]
  );

  const handleToggleBold = useCallback(async () => {
    if (!activeTextBlock) return;
    const targetId = activeTextBlock.id;
    const oldVal = Boolean(activeTextBlock.isBold);
    const newVal = !oldVal;

    const applyFn = (style: { isBold?: boolean }) => {
      setBlockOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetId) || {};
        next.set(targetId, { ...existing, isBold: style.isBold });
        return next;
      });
    };

    const cmd = new SetTextStyleCommand(
      activePageIdx,
      targetId,
      { isBold: oldVal },
      { isBold: newVal },
      applyFn
    );
    await editSession.execute(cmd);
  }, [activeTextBlock, activePageIdx, editSession]);

  const handleToggleItalic = useCallback(async () => {
    if (!activeTextBlock) return;
    const targetId = activeTextBlock.id;
    const oldVal = Boolean(activeTextBlock.isItalic);
    const newVal = !oldVal;

    const applyFn = (style: { isItalic?: boolean }) => {
      setBlockOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetId) || {};
        next.set(targetId, { ...existing, isItalic: style.isItalic });
        return next;
      });
    };

    const cmd = new SetTextStyleCommand(
      activePageIdx,
      targetId,
      { isItalic: oldVal },
      { isItalic: newVal },
      applyFn
    );
    await editSession.execute(cmd);
  }, [activeTextBlock, activePageIdx, editSession]);

  const handleToggleUnderline = useCallback(async () => {
    if (!activeTextBlock) return;
    const targetId = activeTextBlock.id;
    const oldVal = Boolean(activeTextBlock.isUnderline);
    const newVal = !oldVal;

    const applyFn = (style: { isUnderline?: boolean }) => {
      setBlockOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetId) || {};
        next.set(targetId, { ...existing, isUnderline: style.isUnderline });
        return next;
      });
    };

    const cmd = new SetTextStyleCommand(
      activePageIdx,
      targetId,
      { isUnderline: oldVal },
      { isUnderline: newVal },
      applyFn
    );
    await editSession.execute(cmd);
  }, [activeTextBlock, activePageIdx, editSession]);

  const handleToggleStrike = useCallback(async () => {
    if (!activeTextBlock) return;
    const targetId = activeTextBlock.id;
    const oldVal = Boolean(activeTextBlock.isStrikethrough);
    const newVal = !oldVal;

    const applyFn = (style: { isStrikethrough?: boolean }) => {
      setBlockOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetId) || {};
        next.set(targetId, { ...existing, isStrikethrough: style.isStrikethrough });
        return next;
      });
    };

    const cmd = new SetTextStyleCommand(
      activePageIdx,
      targetId,
      { isStrikethrough: oldVal },
      { isStrikethrough: newVal },
      applyFn
    );
    await editSession.execute(cmd);
  }, [activeTextBlock, activePageIdx, editSession]);

  const handleToggleSuperscript = useCallback(async () => {
    if (!activeTextBlock) return;
    const targetId = activeTextBlock.id;
    const oldVal = Boolean(activeTextBlock.isSuperscript);
    const newVal = !oldVal;

    const applyFn = (style: { isSuperscript?: boolean; isSubscript?: boolean }) => {
      setBlockOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetId) || {};
        next.set(targetId, {
          ...existing,
          isSuperscript: style.isSuperscript,
          isSubscript: style.isSubscript ?? false
        });
        return next;
      });
    };

    const cmd = new SetTextStyleCommand(
      activePageIdx,
      targetId,
      { isSuperscript: oldVal, isSubscript: Boolean(activeTextBlock.isSubscript) },
      { isSuperscript: newVal, isSubscript: false },
      applyFn
    );
    await editSession.execute(cmd);
  }, [activeTextBlock, activePageIdx, editSession]);

  const handleToggleSubscript = useCallback(async () => {
    if (!activeTextBlock) return;
    const targetId = activeTextBlock.id;
    const oldVal = Boolean(activeTextBlock.isSubscript);
    const newVal = !oldVal;

    const applyFn = (style: { isSuperscript?: boolean; isSubscript?: boolean }) => {
      setBlockOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetId) || {};
        next.set(targetId, {
          ...existing,
          isSubscript: style.isSubscript,
          isSuperscript: style.isSuperscript ?? false
        });
        return next;
      });
    };

    const cmd = new SetTextStyleCommand(
      activePageIdx,
      targetId,
      { isSubscript: oldVal, isSuperscript: Boolean(activeTextBlock.isSuperscript) },
      { isSubscript: newVal, isSuperscript: false },
      applyFn
    );
    await editSession.execute(cmd);
  }, [activeTextBlock, activePageIdx, editSession]);

  const handleTextColorChange = useCallback(
    async (hex: string) => {
      if (!activeTextBlock) return;
      const targetId = activeTextBlock.id;
      const oldColor = activeTextBlock.primaryColor;
      const r = parseInt(hex.slice(1, 3), 16) || 0;
      const g = parseInt(hex.slice(3, 5), 16) || 0;
      const b = parseInt(hex.slice(5, 7), 16) || 0;
      const newColor = { r, g, b, a: 255 };
      const runIds = new Set(activeTextBlock.runs.map((r) => r.id));

      const applyFn = (color: { r: number; g: number; b: number; a: number }) => {
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          next.set(
            activePageIdx,
            list.map((o) => (runIds.has(o.id) && o.type === 'text' ? { ...o, fillColor: color } : o))
          );
          return next;
        });
        setBlockOverrides((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetId) || {};
          next.set(targetId, { ...existing, primaryColor: color });
          return next;
        });
      };

      const cmd = new SetTextColorCommand(
        activePageIdx,
        targetId,
        oldColor,
        newColor,
        activeTextBlock.opacity,
        activeTextBlock.opacity,
        applyFn
      );
      await editSession.execute(cmd);
    },
    [activeTextBlock, activePageIdx, editSession]
  );

  const handleHighlightColorChange = useCallback(
    async (hex: string | null) => {
      if (!activeTextBlock) return;
      const targetId = activeTextBlock.id;
      const oldHighlight = activeTextBlock.highlightColor ?? null;
      let newHighlight: { r: number; g: number; b: number; a: number } | null = null;
      if (hex) {
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 0;
        const b = parseInt(hex.slice(5, 7), 16) || 0;
        newHighlight = { r, g, b, a: 255 };
      }

      const applyFn = (hl: { r: number; g: number; b: number; a: number } | null) => {
        setBlockOverrides((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetId) || {};
          next.set(targetId, { ...existing, highlightColor: hl });
          return next;
        });
      };

      const cmd = new SetTextHighlightColorCommand(
        activePageIdx,
        targetId,
        oldHighlight,
        newHighlight,
        applyFn
      );
      await editSession.execute(cmd);
    },
    [activeTextBlock, activePageIdx, editSession]
  );

  const handleAlignmentChange = useCallback(
    async (align: 'left' | 'center' | 'right' | 'justify') => {
      if (!activeTextBlock) return;
      const targetId = activeTextBlock.id;
      const oldAlign = activeTextBlock.alignment;

      const applyFn = (a: 'left' | 'center' | 'right' | 'justify') => {
        setBlockOverrides((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetId) || {};
          next.set(targetId, { ...existing, alignment: a });
          return next;
        });
      };

      const cmd = new SetTextAlignmentCommand(activePageIdx, targetId, oldAlign, align, applyFn);
      await editSession.execute(cmd);
    },
    [activeTextBlock, activePageIdx, editSession]
  );

  const handleSpacingChange = useCallback(
    async (spacing: { lineSpacing?: number; letterSpacing?: number; paragraphSpacing?: number }) => {
      if (!activeTextBlock) return;
      const targetId = activeTextBlock.id;
      const oldSpacing = {
        lineSpacing: activeTextBlock.lineSpacing,
        letterSpacing: activeTextBlock.letterSpacing,
        paragraphSpacing: activeTextBlock.paragraphSpacing
      };
      const runIds = new Set(activeTextBlock.runs.map((r) => r.id));

      const applyFn = (sp: { lineSpacing?: number; letterSpacing?: number; paragraphSpacing?: number }) => {
        if (sp.letterSpacing !== undefined) {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(activePageIdx) || [];
            next.set(
              activePageIdx,
              list.map((o) =>
                runIds.has(o.id) && o.type === 'text' ? { ...o, charSpacing: sp.letterSpacing } : o
              )
            );
            return next;
          });
        }
        setBlockOverrides((prev) => {
          const next = new Map(prev);
          const existing = next.get(targetId) || {};
          next.set(targetId, {
            ...existing,
            lineSpacing: sp.lineSpacing ?? existing.lineSpacing,
            letterSpacing: sp.letterSpacing ?? existing.letterSpacing,
            paragraphSpacing: sp.paragraphSpacing ?? existing.paragraphSpacing
          });
          return next;
        });
      };

      const cmd = new SetTextSpacingCommand(activePageIdx, targetId, oldSpacing, spacing, applyFn);
      await editSession.execute(cmd);
    },
    [activeTextBlock, activePageIdx, editSession]
  );

  const handleMatchOriginalFont = useCallback(async () => {
    if (!activeTextBlock) return;
    const orig =
      activeTextBlock.originalFontName ||
      (activeTextBlock.fontReusability?.isSubset
        ? activeTextBlock.fontReusability.fontName
        : undefined);
    if (!orig) return;

    const match = fontCatalog.findMetricCompatible(orig);
    if (match) {
      await handleFontFamilyChange(match.matchedEntry.family);
    }
  }, [activeTextBlock, fontCatalog, handleFontFamilyChange]);

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

  const renderPageBitmap = useCallback(
    async (pageIdx: number, scaleFactor: number, dprVal: number, signal?: AbortSignal) => {
      if (!engine || !docHandle) {
        throw new Error('Engine or document handle not available');
      }
      return engine.renderPage(docHandle, pageIdx, { scale: scaleFactor, dpr: dprVal }, signal);
    },
    [engine, docHandle]
  );

  const renderThumbnail = useCallback(
    async (pageIdx: number) => {
      if (!engine || !docHandle) return null;
      try {
        return await engine.renderPage(docHandle, pageIdx, { scale: 0.18, dpr: 1 });
      } catch {
        return null;
      }
    },
    [engine, docHandle]
  );

  const getPageMetric = useCallback(
    (pageIdx: number): PageMetric => {
      return pageMetricsMap.get(pageIdx) ?? { width: 595.28, height: 841.89, rotation: 0 };
    },
    [pageMetricsMap]
  );

  const getPageTextRuns = useCallback(
    async (pageIdx: number) => {
      if (pageTextRunsMap.has(pageIdx)) {
        return pageTextRunsMap.get(pageIdx)!;
      }
      if (!engine || !docHandle) return [];
      try {
        const runs = await engine.extractText(docHandle, pageIdx);
        setPageTextRunsMap((prev) => new Map(prev).set(pageIdx, runs));
        return runs;
      } catch {
        return [];
      }
    },
    [engine, docHandle, pageTextRunsMap]
  );

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
        id: 'insert-image',
        category: t('commands.categoryEdit'),
        title: 'Insert Image',
        onSelect: () => imageFileInputRef.current?.click()
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

      {/* Contextual Toolbar (Phase 6, 7 & 8 wired) */}
      <ContextualToolbar
        hasSelectedImage={selectedImage !== null}
        isCropping={isCropping}
        effectiveDpi={imageDpiResult?.minDpi}
        isLowRes={imageDpiResult?.isLowRes}
        onInsertImage={() => imageFileInputRef.current?.click()}
        onReplaceImage={() => replaceFileInputRef.current?.click()}
        onDeleteImage={handleDeleteObjects}
        onCrop={handleCropPreset}
        onApplyCrop={handleApplyCrop}
        onCancelCrop={() => {
          setIsCropping(false);
          setCropBoxPdf(null);
        }}
        onRotateCw={() => handleRotate90(90)}
        onRotateCcw={() => handleRotate90(-90)}
        onFlipHorizontal={() => handleFlip('horizontal')}
        onFlipVertical={() => handleFlip('vertical')}
        onBringForward={() => handleLayerReorder('forward')}
        onSendBackward={() => handleLayerReorder('backward')}
        onBringToFront={() => handleLayerReorder('front')}
        onSendToBack={() => handleLayerReorder('back')}
        onOpacityChange={handleOpacityChange}
        onAddText={handleAddTextBox}
        onSelectRegion={() => setIsRegionSelectMode((prev) => !prev)}
        onToggleFindReplace={() => setIsFindReplaceOpen((prev) => !prev)}
        isRegionSelectActive={isRegionSelectMode}
        selectedFontFamily={activeTextBlock?.primaryFont}
        onFontFamilyChange={handleFontFamilyChange}
        selectedFontSize={activeTextBlock?.primaryFontSize}
        onFontSizeChange={handleFontSizeChange}
        selectedIsBold={activeTextBlock?.isBold}
        onToggleBold={handleToggleBold}
        selectedIsItalic={activeTextBlock?.isItalic}
        onToggleItalic={handleToggleItalic}
        selectedIsUnderline={activeTextBlock?.isUnderline}
        onToggleUnderline={handleToggleUnderline}
        selectedIsStrike={activeTextBlock?.isStrikethrough}
        onToggleStrike={handleToggleStrike}
        selectedIsSuperscript={activeTextBlock?.isSuperscript}
        onToggleSuperscript={handleToggleSuperscript}
        selectedIsSubscript={activeTextBlock?.isSubscript}
        onToggleSubscript={handleToggleSubscript}
        selectedAlignment={activeTextBlock?.alignment}
        onAlignmentChange={handleAlignmentChange}
        selectedTextColor={
          activeTextBlock
            ? `#${activeTextBlock.primaryColor.r.toString(16).padStart(2, '0')}${activeTextBlock.primaryColor.g.toString(16).padStart(2, '0')}${activeTextBlock.primaryColor.b.toString(16).padStart(2, '0')}`
            : undefined
        }
        onTextColorChange={handleTextColorChange}
        selectedHighlightColor={
          activeTextBlock?.highlightColor
            ? `#${activeTextBlock.highlightColor.r.toString(16).padStart(2, '0')}${activeTextBlock.highlightColor.g.toString(16).padStart(2, '0')}${activeTextBlock.highlightColor.b.toString(16).padStart(2, '0')}`
            : null
        }
        onHighlightColorChange={handleHighlightColorChange}
        lineSpacing={activeTextBlock?.lineSpacing}
        letterSpacing={activeTextBlock?.letterSpacing}
        paragraphSpacing={activeTextBlock?.paragraphSpacing}
        onSpacingChange={handleSpacingChange}
        originalFontName={
          activeTextBlock?.originalFontName ||
          (activeTextBlock?.fontReusability?.isSubset
            ? activeTextBlock.fontReusability.fontName
            : undefined)
        }
        onMatchOriginalFont={handleMatchOriginalFont}
        hasSelectedTextBlock={Boolean(activeTextBlock)}
        onDeleteText={handleDeleteObjects}
      />

      {/* Main Workspace Area: Rail + Canvas + Properties */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Tool Rail (Left) */}
        <EditorToolRail
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((s) => !s)}
        />

        {/* Central Canvas Viewport */}
        <div style={{ flex: 1, height: '100%', overflow: 'hidden', position: 'relative' }}>
          <FindReplaceBar
            isOpen={isFindReplaceOpen}
            onClose={() => setIsFindReplaceOpen(false)}
            matches={findMatches}
            currentIndex={currentFindMatchIndex}
            onSearch={handleFindSearch}
            onNextMatch={handleNextFindMatch}
            onPrevMatch={handlePrevFindMatch}
            onReplaceCurrent={handleReplaceCurrent}
            onReplaceAll={handleReplaceAll}
            hasOverflowWarning={findOverflowWarning}
          />
          {currentDocId ? (
            <PdfViewer
              docId={currentDocId}
              docHandle={docHandle}
              engine={engine ?? undefined}
              pageCount={pageCount || 1}
              theme={theme}
              getPageMetric={getPageMetric}
              renderPageBitmap={renderPageBitmap}
              renderThumbnail={renderThumbnail}
              getPageTextRuns={getPageTextRuns}
              error={docError}
              onBackToHome={() => closeDoc()}
              renderOverlay={(pageIdx, metric) => {
                if (pageIdx !== activePageIdx) return null;
                const editingBlock = editingTextBlockId
                  ? currentTextBlocks.find((b) => b.id === editingTextBlockId)
                  : null;

                return (
                  <>
                    <SelectionOverlay
                      pageWidthPt={metric.width}
                      pageHeightPt={metric.height}
                      rotation={metric.rotation}
                      scale={scale}
                      activeMode={activeMode}
                      isCropping={isCropping}
                      cropBoxPdf={cropBoxPdf}
                      pageObjects={currentObjects}
                      selectedIds={selectedIds}
                      textBlocks={currentTextBlocks}
                      activeBlockId={activeTextBlock?.id || activeTextBlockId}
                      isRegionSelectMode={isRegionSelectMode}
                      onSelectBlock={(blockId) => {
                        setActiveTextBlockId(blockId);
                        const blk = currentTextBlocks.find((b) => b.id === blockId);
                        if (blk) {
                          editSession.selectAll(
                            activePageIdx,
                            blk.runs.map((r) => r.id)
                          );
                        }
                      }}
                      onDoubleClickBlock={(blockId) => {
                        setActiveTextBlockId(blockId);
                        setEditingTextBlockId(blockId);
                      }}
                      onRegionSelected={handleRegionSelected}
                      onSelectIds={(ids) => editSession.selectAll(activePageIdx, ids)}
                      onMove={handleMoveObjects}
                      onResize={handleResizeObjects}
                      onRotate={handleRotateObjects}
                      onClearSelection={() => {
                        setActiveTextBlockId(null);
                        editSession.clearSelection();
                      }}
                      onOcrDetectRequested={() => {
                        alert('OCR text detection will become active in Phase 10.');
                      }}
                    />
                    {editingBlock && (
                      <TextEditorOverlay
                        block={editingBlock}
                        pageWidthPt={metric.width}
                        pageHeightPt={metric.height}
                        rotation={metric.rotation}
                        scale={scale}
                        onCommit={handleCommitTextBlock}
                        onCancel={() => setEditingTextBlockId(null)}
                        onGrowDownward={handleGrowDownward}
                        onShrinkToFit={handleShrinkToFit}
                      />
                    )}
                  </>
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

          {isLoadingDoc && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 12,
                zIndex: 30
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: '3px solid var(--bg-border)',
                  borderTopColor: 'var(--bg-primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }}
              />
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--bg-foreground)' }}>
                {t('common.loading', { defaultValue: 'Loading document...' })}
              </span>
            </div>
          )}
        </div>

        {/* Properties Panel (Right) (Tasks 6.4, 6.5, 6.10, 6.11, 6.12, 8.16) */}
        <PropertiesPanel
          open={propertiesOpen}
          onToggle={() => setPropertiesOpen((p) => !p)}
          selectedObject={selectedObject}
          onMatchOriginalFont={handleMatchOriginalFont}
          onBringForward={() => handleLayerReorder('forward')}
          onSendBackward={() => handleLayerReorder('backward')}
          onBringToFront={() => handleLayerReorder('front')}
          onSendToBack={() => handleLayerReorder('back')}
          onFlipHorizontal={() => handleFlip('horizontal')}
          onFlipVertical={() => handleFlip('vertical')}
          onRotateCw={() => handleRotate90(90)}
          onRotateCcw={() => handleRotate90(-90)}
          onDownloadImage={handleDownloadImage}
          onUpdateObject={async (updates) => {
            if (!selectedObject) return;
            const updated = { ...selectedObject, ...updates };
            setSelectedObject(updated);

            if (selectedIds.length === 1) {
              const targetId = selectedIds[0]!;
              // Position moved
              if (updates.x !== undefined || updates.y !== undefined) {
                const dx = (updates.x ?? selectedObject.x) - selectedObject.x;
                const dy = (updates.y ?? selectedObject.y) - selectedObject.y;
                if (dx !== 0 || dy !== 0) {
                  await handleMoveObjects(dx, dy);
                }
              }
              // Size changed
              if (updates.width !== undefined || updates.height !== undefined) {
                const newBounds: Rect = {
                  left: updated.x,
                  bottom: updated.y,
                  right: updated.x + updated.width,
                  top: updated.y + updated.height
                };
                await handleResizeObjects(newBounds);
              }
              // Rotation changed
              if (updates.rotation !== undefined) {
                await handleRotateObjects(updates.rotation);
              }
              // Opacity changed
              if (updates.opacity !== undefined) {
                await handleOpacityChange(updates.opacity);
              }
              // Adjustments changed (brightness / contrast / grayscale)
              if (
                updates.brightness !== undefined ||
                updates.contrast !== undefined ||
                updates.grayscale !== undefined
              ) {
                setPageObjectsMap((prev) => {
                  const next = new Map(prev);
                  const list = next.get(activePageIdx) || [];
                  next.set(
                    activePageIdx,
                    list.map((o) =>
                      o.id === targetId
                        ? {
                            ...o,
                            brightness: updates.brightness ?? selectedObject.brightness,
                            contrast: updates.contrast ?? selectedObject.contrast,
                            grayscale: updates.grayscale ?? selectedObject.grayscale
                          }
                        : o
                    )
                  );
                  return next;
                });
                setDirty(true);
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

      {/* Hidden File Inputs for Insert & Replace (Tasks 6.8 & 6.9) */}
      <input
        ref={imageFileInputRef}
        data-testid="input-file-insert-image"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleInsertImageFile(file);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={replaceFileInputRef}
        data-testid="input-file-replace-image"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleReplaceImageFile(file);
            e.target.value = '';
          }
        }}
      />

      {/* Large Image Delete Confirmation Dialog (Task 6.7) */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Background Image?"
        description="This image covers most of the page (likely a background or scan). Are you sure you want to delete it?"
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="destructive"
            data-testid="btn-confirm-delete-large-image"
            onClick={() => {
              setShowDeleteConfirm(false);
              void executeDeleteObjects();
            }}
          >
            {t('common.delete', { defaultValue: 'Delete Image' })}
          </Button>
        </div>
      </Dialog>

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
