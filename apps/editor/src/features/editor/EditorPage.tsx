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
  type CommitTextBlockOptions,
  type ShapeObject,
  InsertShapeCommand,
  type DrawingStrokeObject,
  type DrawingTool,
  AddDrawingStrokeCommand,
  EraseDrawingStrokeCommand,
  type GeneratedTable,
  InsertTableCommand,
  ApplyHeaderFooterCommand,
  ApplyWatermarkCommand,
  SetPageBackgroundCommand,
  type WatermarkObject,
  type ObjectLink,
  SetObjectLinkCommand,
  RemoveObjectLinkCommand,
  toggleBulletList,
  toggleNumberedList,
  indentList,
  outdentList,
  extractTextStyle,
  applyTextStyleToBlock,
  type TextStyleAttributes,
  alignObjects,
  distributeObjects,
  AlignObjectsCommand,
  type AlignmentMode,
  createPageBackground,
  type AcroFormField,
  type TextMarkupType,
  createMarkupAnnotation,
  markupToVectorPaths,
  createStickyNote,
  createStampAnnotation,
  createInitialsAnnotation,
  createDateStampAnnotation,
  InsertSignatureCommand,
  AddAnnotationCommand,
  UpdateAnnotationCommand,
  DeleteAnnotationCommand,
  detectXfaForm,
  detectFormFieldsFromAnnotations,
  autofillFormFields,
  SetFormFieldValueCommand,
  CreateFormFieldCommand,
  type CreateFormFieldOptions,
  type AutofillProfile,
  RotatePagesCommand,
  DeletePagesCommand,
  InsertBlankPageCommand,
  DuplicatePageCommand,
  ReorderPagesCommand,
  CropPageCommand,
  ResizePageCommand,
  UpdateBookmarksCommand,
  extractPagesFromPdf,
  type BookmarkItem,
  exportPdfDocument,
  compressPdf,
  validateSavedPdf,
  type ExportOptions,
  type CompressPdfOptions,
  type PrintOptions,
  type VersionRecord,
  encryptPdf,
  decryptPdf,
  applyTrueRedaction,
  ApplyRedactionCommand,
  getPdfMetadata,
  setPdfMetadata,
  stripAllMetadata,
  validateLinkSafety,
  type RedactionArea,
  type PdfSecurityOptions,
  type PdfMetadata
} from '@rhypdf/edit-core';
import {
  PasswordSecurityDialog,
  RedactionDialog,
  MetadataEditorDialog,
  LocalDataLockDialog,
  ExternalLinkConfirmDialog,
  ClearDataConfirmDialog
} from '../security';
import {
  wipeDocumentWorkingData,
  clearAllLocalData,
  pruneExpiredRecovery
} from '../../lib/secureStorage';
import { logger } from '../../lib/logger';
import {
  ConfirmSaveOriginalDialog,
  ExportOptionsDialog,
  CompressPdfDialog,
  PrintDialog,
  SaveProgressModal,
  UnsavedChangesDialog,
  VersionHistoryDialog
} from '../export';
import {
  saveToOriginalFile,
  downloadPdfCopy,
  sharePdfFile,
  printPdfDocument,
  runWithSaveProgress
} from '../../lib/fileSave';
import { saveDocumentVersion } from '../../lib/versionHistory';
import {
  PageOrganizerPage,
  BookmarksPanel,
  InsertBlankPageDialog,
  CropPageDialog,
  ResizePageDialog
} from '../pages';
import {
  StampsPopover,
  SignatureDialog,
  StickyNotePopup,
  CommentsPanel,
  AnnotationSummaryDialog
} from '../annotations';
import { XfaWarningBanner, AcroFormOverlay, AutofillDialog, CreateFormFieldDialog } from '../forms';
import { FontCatalog } from '@rhypdf/fonts';
import type {
  PageObject,
  ImageObject,
  Rect,
  TextRun,
  PathObject,
  AnnotationObject
} from '@rhypdf/pdf-model';
import { useDocStore } from '../../stores/docStore';
import { useUIStore } from '../../stores/uiStore';
import { PdfViewer, PageMetric } from '../viewer/PdfViewer';
import {
  PdfiumEngine,
  MockPdfEngine,
  type PdfEngine,
  type DocumentHandle
} from '@rhypdf/pdf-engine';
import { EditorTopBar } from './EditorTopBar';
import { EditorToolRail } from './EditorToolRail';
import { ContextualToolbar } from './ContextualToolbar';
import { PropertiesPanel, SelectedObjectProps } from './PropertiesPanel';
import { EditorStatusBar } from './EditorStatusBar';
import { SelectionOverlay } from './SelectionOverlay';
import { TextEditorOverlay } from './TextEditorOverlay';
import { FindReplaceBar } from './FindReplaceBar';
import { DrawingCanvasOverlay } from './DrawingCanvasOverlay';
import { RulerGridOverlay } from './RulerGridOverlay';
import {
  InsertTableDialog,
  HeaderFooterDialog,
  WatermarkDialog,
  LinkDialog,
  LinkChip
} from '../tools';
import { CommandPalette, CommandItem } from '../../components/CommandPalette';
import { ShortcutsHelpDialog } from '../../components/ShortcutsHelpDialog';
import { AutosaveManager } from '../../lib/autosave';
import { loadWorkingCopy, saveWorkingCopy } from '../../lib/workingCopy';
import { FitMode } from '../viewer/fit-mode';
import {
  detectScannedPage,
  TesseractOcrEngine,
  BatchOcrProcessor,
  createSearchableInvisibleLayer,
  convertOcrToTextBlocks,
  createImageData,
  type ScannedPageDetectionResult,
  type OcrPageResult,
  type OcrOutputMode,
  type OcrProgress
} from '@rhypdf/ocr';
import { ScannedPageBanner, OcrProgressModal, OcrReviewDialog, BatchOcrDialog } from '../ocr';

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
    fileHandle,
    pageCount,
    setPageCount,
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

  // OCR state (Phase 10)
  const [ocrLanguage, setOcrLanguage] = useState('eng');
  const [isOcrRunning, setIsOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrAbortController, setOcrAbortController] = useState<AbortController | null>(null);
  const [pendingOcrResult, setPendingOcrResult] = useState<OcrPageResult | null>(null);
  const [pendingOcrMode, setPendingOcrMode] = useState<OcrOutputMode>('editable');
  const [isOcrReviewOpen, setIsOcrReviewOpen] = useState(false);
  const [isBatchOcrOpen, setIsBatchOcrOpen] = useState(false);
  const [scannedBannerDismissed, setScannedBannerDismissed] = useState<Set<number>>(new Set());

  // Phase 11 Word-like Tools state
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [isHeaderFooterDialogOpen, setIsHeaderFooterDialogOpen] = useState(false);
  const [isWatermarkDialogOpen, setIsWatermarkDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [objectLinks, setObjectLinks] = useState<Map<string, ObjectLink>>(new Map());
  const [isFormatPainterActive, setIsFormatPainterActive] = useState(false);
  const [formatPainterStyle, setFormatPainterStyle] = useState<TextStyleAttributes | null>(null);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isGridActive, setIsGridActive] = useState(false);
  const [drawingStrokesMap, setDrawingStrokesMap] = useState<Map<number, DrawingStrokeObject[]>>(
    new Map()
  );
  const [annotateTool, setAnnotateTool] = useState<DrawingTool>('pen');
  const [annotateColor, setAnnotateColor] = useState('#0f172a');
  const [annotateStrokeWidth, setAnnotateStrokeWidth] = useState(2.5);

  // Phase 12 Annotations, Signatures & Forms state
  const [annotationsByPage, setAnnotationsByPage] = useState<Map<number, AnnotationObject[]>>(
    new Map()
  );
  const [formFieldsByPage, setFormFieldsByPage] = useState<Map<number, AcroFormField[]>>(new Map());
  const [xfaWarning, setXfaWarning] = useState<string | null>(null);
  const [isStampsPopoverOpen, setIsStampsPopoverOpen] = useState(false);
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [isAutofillDialogOpen, setIsAutofillDialogOpen] = useState(false);
  const [isCreateFormFieldDialogOpen, setIsCreateFormFieldDialogOpen] = useState(false);
  const [isAnnotationSummaryDialogOpen, setIsAnnotationSummaryDialogOpen] = useState(false);
  const [isCommentsPanelOpen, setIsCommentsPanelOpen] = useState(false);
  const [activeStickyNote, setActiveStickyNote] = useState<{
    annot: AnnotationObject;
    cssPos: { x: number; y: number };
  } | null>(null);

  // Phase 13 Page Management & Bookmarks state
  const [isPageOrganizerOpen, setIsPageOrganizerOpen] = useState(false);
  const [isBookmarksPanelOpen, setIsBookmarksPanelOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isInsertBlankPageOpen, setIsInsertBlankPageOpen] = useState(false);
  const [isCropPageOpen, setIsCropPageOpen] = useState(false);
  const [isResizePageOpen, setIsResizePageOpen] = useState(false);
  const [workingBytes, setWorkingBytes] = useState<Uint8Array | null>(null);
  const [, setRenderTick] = useState(0);

  // Phase 14 Save, Export, Share, Print state
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [isExportOptionsOpen, setIsExportOptionsOpen] = useState(false);
  const [isCompressOpen, setIsCompressOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isSaveProgressOpen, setIsSaveProgressOpen] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveProgressStatus, setSaveProgressStatus] = useState('');
  const [saveAbortController, setSaveAbortController] = useState<AbortController | null>(null);
  const [isUnsavedChangesOpen, setIsUnsavedChangesOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [currentFileSize, setCurrentFileSize] = useState(0);

  // Security & Utilities states (Phase 15)
  const [isPasswordSecurityOpen, setIsPasswordSecurityOpen] = useState(false);
  const [isRedactionOpen, setIsRedactionOpen] = useState(false);
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [isLocalLockOpen, setIsLocalLockOpen] = useState(false);
  const [isClearDataOpen, setIsClearDataOpen] = useState(false);
  const [isExternalLinkConfirmOpen, setIsExternalLinkConfirmOpen] = useState(false);
  const [pendingExternalUrl, setPendingExternalUrl] = useState<string>('');
  const [currentDocMetadata, setCurrentDocMetadata] = useState<PdfMetadata>({});

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
        if (bytes) {
          setWorkingBytes(new Uint8Array(bytes));
          setCurrentFileSize(bytes.byteLength);
        }
        let handle: DocumentHandle;
        let totalPages = 1;

        if (bytes && bytes.byteLength > 0) {
          const xfaCheck = detectXfaForm(new Uint8Array(bytes));
          if (xfaCheck.hasXfa) {
            setXfaWarning(xfaCheck.warning ?? null);
          }
          handle = await eng.open(bytes);
          totalPages = await eng.pageCount(handle);
        } else {
          // Fallback empty document
          try {
            const emptyBytes = new Uint8Array([
              0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a
            ]);
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
            const annots = initialObjs.filter((o) => o.type === 'annotation') as AnnotationObject[];
            if (annots.length > 0) {
              setAnnotationsByPage((prev) => new Map(prev).set(0, annots));
              const fields = detectFormFieldsFromAnnotations(annots, 0);
              if (fields.length > 0) {
                setFormFieldsByPage((prev) => new Map(prev).set(0, fields));
              }
            }
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
          const annots = objs.filter((o) => o.type === 'annotation') as AnnotationObject[];
          if (annots.length > 0) {
            setAnnotationsByPage((prev) => new Map(prev).set(activePageIdx, annots));
            const fields = detectFormFieldsFromAnnotations(annots, activePageIdx);
            if (fields.length > 0) {
              setFormFieldsByPage((prev) => new Map(prev).set(activePageIdx, fields));
            }
          }
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

  // Task 10.1: Scanned page detector
  const scannedDetection = useMemo<ScannedPageDetectionResult | null>(() => {
    if (!currentMetric || currentObjects.length === 0) return null;
    return detectScannedPage(currentObjects, currentMetric.width, currentMetric.height);
  }, [currentObjects, currentMetric]);

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

  const handleRotatePages = useCallback(
    (indices: number[], delta: number) => {
      const targets = indices.length === 0 ? [activePageIdx] : indices;
      const cmd = new RotatePagesCommand(targets, delta, (pageIdxs, d) => {
        setPageMetricsMap((prev) => {
          const next = new Map(prev);
          for (const idx of pageIdxs) {
            const current = next.get(idx);
            if (current) {
              const curRot = current.rotation ?? 0;
              const nextRot = ((((curRot + d) % 360) + 360) % 360) as 0 | 90 | 180 | 270;
              next.set(idx, { ...current, rotation: nextRot });
            }
          }
          return next;
        });
        setRenderTick((t) => t + 1);
      });
      void editSession.execute(cmd);
    },
    [activePageIdx, editSession]
  );

  const handleRotate90 = useCallback(
    async (deltaDeg: 90 | -90) => {
      if (activeMode === 'pages') {
        handleRotatePages([activePageIdx], deltaDeg);
        return;
      }
      if (!selectedImage) return;
      await handleRotateObjects(deltaDeg);
    },
    [activeMode, activePageIdx, handleRotatePages, selectedImage, handleRotateObjects]
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

  // Task 14.8: beforeunload guard when unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSaveRef = useRef<() => Promise<void>>(() => Promise.resolve());
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });

  // Global keyboard shortcuts (Tasks 5.9, 5.10, 5.11, 6.2, 6.3, 14.1, 14.5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        // Save (Ctrl+S)
        e.preventDefault();
        void handleSaveRef.current();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p' && !isInput) {
        // Print (Ctrl+P)
        e.preventDefault();
        setIsPrintOpen(true);
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
        editSession.selectAll(
          activePageIdx,
          block.runs.map((r) => r.id)
        );
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
      void handleCommitTextBlock(
        blockId,
        block.lines.map((l) => l.text),
        {
          fontSize: newFontSize
        }
      );
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
            list.map((o) =>
              runIds.has(o.id) && o.type === 'text' ? { ...o, fontName: family } : o
            )
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
            list.map((o) =>
              runIds.has(o.id) && o.type === 'text' ? { ...o, fillColor: color } : o
            )
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
    async (spacing: {
      lineSpacing?: number;
      letterSpacing?: number;
      paragraphSpacing?: number;
    }) => {
      if (!activeTextBlock) return;
      const targetId = activeTextBlock.id;
      const oldSpacing = {
        lineSpacing: activeTextBlock.lineSpacing,
        letterSpacing: activeTextBlock.letterSpacing,
        paragraphSpacing: activeTextBlock.paragraphSpacing
      };
      const runIds = new Set(activeTextBlock.runs.map((r) => r.id));

      const applyFn = (sp: {
        lineSpacing?: number;
        letterSpacing?: number;
        paragraphSpacing?: number;
      }) => {
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

  const getEffectiveBytes = useCallback(async (): Promise<Uint8Array | null> => {
    if (workingBytes && workingBytes.byteLength > 0) {
      return workingBytes;
    }
    if (currentDocId) {
      const bytes = await loadWorkingCopy(currentDocId);
      if (bytes) {
        const u8 = new Uint8Array(bytes);
        setWorkingBytes(u8);
        setCurrentFileSize(u8.byteLength);
        return u8;
      }
    }
    return null;
  }, [workingBytes, currentDocId]);

  const handleDownloadCopy = useCallback(async () => {
    const bytes = await getEffectiveBytes();
    if (!bytes) return;

    const controller = new AbortController();
    setSaveAbortController(controller);
    setIsSaveProgressOpen(true);

    try {
      await runWithSaveProgress(
        async (onProg) => {
          onProg(50, 'Validating and generating copy...');
          const validation = await validateSavedPdf(bytes, pageCount);
          if (!validation.valid) {
            throw new Error(validation.error || 'Invalid PDF structure');
          }
          downloadPdfCopy(bytes, filename || 'document.pdf');

          if (currentDocId) {
            await saveDocumentVersion(
              currentDocId,
              filename || 'document.pdf',
              bytes,
              'Downloaded copy'
            );
          }
        },
        (pct, msg) => {
          setSaveProgress(pct);
          setSaveProgressStatus(msg);
        },
        controller.signal
      );

      setDirty(false);
      setLastSavedAt(Date.now());
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        alert(`Download failed: ${(err as Error).message}`);
      }
    } finally {
      setIsSaveProgressOpen(false);
      setSaveAbortController(null);
    }
  }, [getEffectiveBytes, pageCount, filename, currentDocId, setDirty, setLastSavedAt]);

  const handleSave = useCallback(async () => {
    if (fileHandle) {
      setIsConfirmSaveOpen(true);
    } else {
      await handleDownloadCopy();
    }
  }, [fileHandle, handleDownloadCopy]);

  const handleConfirmSaveOriginal = useCallback(async () => {
    if (!fileHandle) return;
    setIsConfirmSaveOpen(false);

    const bytes = await getEffectiveBytes();
    if (!bytes) return;

    const controller = new AbortController();
    setSaveAbortController(controller);
    setIsSaveProgressOpen(true);

    try {
      await runWithSaveProgress(
        async (onProg) => {
          onProg(40, 'Validating document...');
          const validation = await validateSavedPdf(bytes, pageCount);
          if (!validation.valid) {
            throw new Error(validation.error || 'Validation failed');
          }

          onProg(75, 'Atomically saving to original file...');
          const result = await saveToOriginalFile(fileHandle, bytes, pageCount);
          if (!result.success) {
            throw new Error(result.error || 'Failed to write to file');
          }

          if (currentDocId) {
            await saveDocumentVersion(
              currentDocId,
              filename || 'document.pdf',
              bytes,
              'Saved to original file'
            );
          }
        },
        (pct, msg) => {
          setSaveProgress(pct);
          setSaveProgressStatus(msg);
        },
        controller.signal
      );

      setDirty(false);
      setLastSavedAt(Date.now());
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        alert(`Save failed: ${(err as Error).message}`);
      }
    } finally {
      setIsSaveProgressOpen(false);
      setSaveAbortController(null);
    }
  }, [fileHandle, getEffectiveBytes, pageCount, currentDocId, filename, setDirty, setLastSavedAt]);

  const handleExportWithOptions = useCallback(
    async (options: ExportOptions) => {
      setIsExportOptionsOpen(false);
      const bytes = await getEffectiveBytes();
      if (!bytes) return;

      const controller = new AbortController();
      setSaveAbortController(controller);
      setIsSaveProgressOpen(true);

      try {
        await runWithSaveProgress(
          async (onProg) => {
            onProg(40, 'Applying export options...');
            const exportedBytes = await exportPdfDocument(bytes, options);
            onProg(75, 'Validating exported PDF...');
            const validation = await validateSavedPdf(exportedBytes);
            if (!validation.valid) {
              throw new Error(validation.error || 'Validation failed on export');
            }
            downloadPdfCopy(exportedBytes, filename || 'document.pdf', '-exported');

            if (currentDocId) {
              await saveDocumentVersion(
                currentDocId,
                filename || 'document.pdf',
                exportedBytes,
                'Custom Export'
              );
            }
          },
          (pct, msg) => {
            setSaveProgress(pct);
            setSaveProgressStatus(msg);
          },
          controller.signal
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          alert(`Export failed: ${(err as Error).message}`);
        }
      } finally {
        setIsSaveProgressOpen(false);
        setSaveAbortController(null);
      }
    },
    [getEffectiveBytes, filename, currentDocId]
  );

  const handleCompress = useCallback(
    async (options: CompressPdfOptions) => {
      setIsCompressOpen(false);
      const bytes = await getEffectiveBytes();
      if (!bytes) return;

      const controller = new AbortController();
      setSaveAbortController(controller);
      setIsSaveProgressOpen(true);

      try {
        await runWithSaveProgress(
          async (onProg) => {
            onProg(45, 'Compressing PDF objects...');
            const result = await compressPdf(bytes, options);
            onProg(80, 'Validating compressed PDF...');
            const validation = await validateSavedPdf(result.bytes);
            if (!validation.valid) {
              throw new Error(validation.error || 'Compressed PDF validation failed');
            }
            downloadPdfCopy(result.bytes, filename || 'document.pdf', '-compressed');
          },
          (pct, msg) => {
            setSaveProgress(pct);
            setSaveProgressStatus(msg);
          },
          controller.signal
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          alert(`Compression failed: ${(err as Error).message}`);
        }
      } finally {
        setIsSaveProgressOpen(false);
        setSaveAbortController(null);
      }
    },
    [getEffectiveBytes, filename]
  );

  const handlePrint = useCallback(
    async (options: PrintOptions) => {
      setIsPrintOpen(false);
      const bytes = await getEffectiveBytes();
      if (!bytes) return;
      await printPdfDocument(bytes, filename || 'document.pdf', options);
    },
    [getEffectiveBytes, filename]
  );

  const handleShare = useCallback(async () => {
    const bytes = await getEffectiveBytes();
    if (!bytes) return;
    await sharePdfFile(bytes, filename || 'document.pdf');
  }, [getEffectiveBytes, filename]);

  const handleRestoreVersion = useCallback(
    async (restoredBytes: Uint8Array, _version?: Partial<VersionRecord>) => {
      if (!currentDocId) return;
      setWorkingBytes(restoredBytes);
      setCurrentFileSize(restoredBytes.byteLength);
      await saveWorkingCopy(currentDocId, restoredBytes);
      if (engine) {
        const handle = await engine.open(restoredBytes);
        setDocHandle(handle);
        const count = await engine.pageCount(handle);
        setPageCount(count);
      }
      setDirty(false);
      setRenderTick((t) => t + 1);
    },
    [currentDocId, engine, setPageCount, setDirty]
  );

  // Auto-prune recovery entries older than 7 days on mount (Task 15.8)
  useEffect(() => {
    void pruneExpiredRecovery();
  }, []);

  const handleApplyPasswordSecurity = useCallback(
    async (options: PdfSecurityOptions) => {
      try {
        setIsPasswordSecurityOpen(false);
        const bytes = await getEffectiveBytes();
        if (!bytes || !engine) return;
        const encrypted = await encryptPdf(bytes, options, engine);
        await handleRestoreVersion(encrypted, {
          id: `sec-${Date.now()}`,
          timestamp: Date.now(),
          sizeBytes: encrypted.byteLength,
          description: 'Added password security'
        });
      } catch (err) {
        logger.error('Security', 'Failed to encrypt document', err);
      }
    },
    [getEffectiveBytes, engine, handleRestoreVersion]
  );

  const handleRemovePasswordSecurity = useCallback(async () => {
    try {
      setIsPasswordSecurityOpen(false);
      const bytes = await getEffectiveBytes();
      if (!bytes || !engine) return;
      const decrypted = await decryptPdf(bytes, '', engine);
      await handleRestoreVersion(decrypted, {
        id: `sec-${Date.now()}`,
        timestamp: Date.now(),
        sizeBytes: decrypted.byteLength,
        description: 'Removed password security'
      });
    } catch (err) {
      logger.error('Security', 'Failed to remove password', err);
    }
  }, [getEffectiveBytes, engine, handleRestoreVersion]);

  const handleApplyRedaction = useCallback(
    async (redaction: RedactionArea) => {
      try {
        setIsRedactionOpen(false);
        const bytes = await getEffectiveBytes();
        if (!bytes) return;
        const { updatedBytes, updatedObjectsMap } = await applyTrueRedaction(
          bytes,
          [redaction],
          pageObjectsMap
        );
        const cmd = new ApplyRedactionCommand(
          activePageIdx,
          bytes,
          updatedBytes,
          pageObjectsMap,
          updatedObjectsMap,
          (b, objs) => {
            setPageObjectsMap(new Map(objs));
            void handleRestoreVersion(b, {
              id: `red-${Date.now()}`,
              timestamp: Date.now(),
              sizeBytes: b.byteLength,
              description: 'Applied true redaction'
            });
          }
        );
        await editSession.execute(cmd);
      } catch (err) {
        logger.error('Redaction', 'Failed to apply redactions', err);
      }
    },
    [getEffectiveBytes, pageObjectsMap, activePageIdx, editSession, handleRestoreVersion]
  );

  const handleOpenMetadata = useCallback(async () => {
    try {
      const bytes = await getEffectiveBytes();
      if (bytes) {
        const meta = await getPdfMetadata(bytes);
        setCurrentDocMetadata(meta);
      } else {
        setCurrentDocMetadata({});
      }
    } catch (err) {
      logger.warn('Metadata', 'Failed to read metadata', err);
      setCurrentDocMetadata({});
    }
    setIsMetadataOpen(true);
  }, [getEffectiveBytes]);

  const handleSaveMetadata = useCallback(
    async (meta: PdfMetadata) => {
      try {
        setIsMetadataOpen(false);
        const bytes = await getEffectiveBytes();
        if (!bytes) return;
        const updated = await setPdfMetadata(bytes, meta);
        await handleRestoreVersion(updated, {
          id: `meta-${Date.now()}`,
          timestamp: Date.now(),
          sizeBytes: updated.byteLength,
          description: 'Updated document metadata'
        });
        setCurrentDocMetadata(meta);
      } catch (err) {
        logger.error('Metadata', 'Failed to save metadata', err);
      }
    },
    [getEffectiveBytes, handleRestoreVersion]
  );

  const handleStripMetadata = useCallback(async () => {
    try {
      setIsMetadataOpen(false);
      const bytes = await getEffectiveBytes();
      if (!bytes) return;
      const clean = await stripAllMetadata(bytes);
      await handleRestoreVersion(clean, {
        id: `meta-${Date.now()}`,
        timestamp: Date.now(),
        sizeBytes: clean.byteLength,
        description: 'Stripped all metadata'
      });
      setCurrentDocMetadata({});
    } catch (err) {
      logger.error('Metadata', 'Failed to strip metadata', err);
    }
  }, [getEffectiveBytes, handleRestoreVersion]);

  const handleClearAllData = useCallback(async () => {
    setIsClearDataOpen(false);
    await clearAllLocalData();
    closeDoc();
  }, [closeDoc]);

  const handleSafeNavigateLink = useCallback((url: string) => {
    const check = validateLinkSafety(url);
    if (!check.isSafe) {
      alert(check.reason || 'Blocked unsafe link');
      return;
    }
    if (check.requiresConfirmation) {
      setPendingExternalUrl(check.sanitizedUrl || url);
      setIsExternalLinkConfirmOpen(true);
    } else {
      window.open(check.sanitizedUrl || url, '_blank', 'noopener,noreferrer');
    }
  }, []);

  const handleBackToHome = useCallback(() => {
    if (isDirty) {
      setIsUnsavedChangesOpen(true);
    } else {
      if (currentDocId) {
        void wipeDocumentWorkingData(currentDocId);
      }
      closeDoc();
    }
  }, [isDirty, currentDocId, closeDoc]);

  const handleDownload = useCallback(async () => {
    await handleDownloadCopy();
  }, [handleDownloadCopy]);

  const ocrEngine = useMemo(() => new TesseractOcrEngine(), []);

  const handleConfirmOcrResult = useCallback(
    (result: OcrPageResult, modeOverride?: OcrOutputMode) => {
      if (!currentMetric) return;
      const mode = modeOverride || pendingOcrMode;
      setIsOcrReviewOpen(false);

      if (mode === 'searchable') {
        // Mode A: Invisible text layer under original image
        const invisibleRuns = createSearchableInvisibleLayer(
          result,
          currentMetric.width,
          currentMetric.height
        );
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const list = next.get(activePageIdx) || [];
          next.set(activePageIdx, [...list, ...invisibleRuns]);
          return next;
        });
      } else {
        // Mode B: Fully editable text blocks
        const blocks = convertOcrToTextBlocks(result, currentMetric.width, currentMetric.height);
        for (const b of blocks) {
          const cmd = new InsertTextBlockCommand(
            activePageIdx,
            b.text,
            b.bounds,
            b.fontFamily,
            b.fontSize,
            { r: 0, g: 0, b: 0, a: 255 },
            (_p, run) => {
              setPageObjectsMap((prev) => {
                const next = new Map(prev);
                const list = next.get(activePageIdx) || [];
                next.set(activePageIdx, [...list, run]);
                return next;
              });
            }
          );
          void editSession.execute(cmd);
        }
      }
      setScannedBannerDismissed((prev) => new Set(prev).add(activePageIdx));
    },
    [currentMetric, pendingOcrMode, activePageIdx, editSession]
  );

  const handleStartPageOcr = useCallback(
    async (mode: OcrOutputMode) => {
      if (!currentMetric) return;

      const controller = new AbortController();
      setOcrAbortController(controller);
      setPendingOcrMode(mode);
      setIsOcrRunning(true);
      setOcrProgress({ status: 'loading', progress: 0.1, message: 'Initializing OCR engine...' });

      try {
        let imgData: ImageData;
        if (engine && docHandle) {
          try {
            const bmp = await engine.renderPage(
              docHandle,
              activePageIdx,
              { scale: 2, dpr: 1 },
              controller.signal
            );
            const canvas = document.createElement('canvas');
            canvas.width = bmp.width;
            canvas.height = bmp.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bmp, 0, 0);
              imgData = ctx.getImageData(0, 0, bmp.width, bmp.height);
            } else {
              imgData = createImageData(bmp.width, bmp.height);
            }
          } catch {
            const w = Math.round(currentMetric.width * 2);
            const h = Math.round(currentMetric.height * 2);
            imgData = createImageData(w, h);
          }
        } else {
          const w = Math.round(currentMetric.width * 2);
          const h = Math.round(currentMetric.height * 2);
          imgData = createImageData(w, h);
        }

        setOcrProgress({ status: 'recognizing', progress: 0.4, message: 'Recognizing text...' });

        const result = await ocrEngine.recognize(imgData, {
          language: ocrLanguage,
          signal: controller.signal,
          onProgress: (p) => setOcrProgress(p)
        });

        setIsOcrRunning(false);
        setPendingOcrResult(result);

        // Task 10.9: Open review dialog if meanConfidence < 85 or handwriting suspected
        if (result.meanConfidence < 85 || result.isHandwritingSuspected) {
          setIsOcrReviewOpen(true);
        } else {
          handleConfirmOcrResult(result, mode);
        }
      } catch {
        setIsOcrRunning(false);
      }
    },
    [
      currentMetric,
      engine,
      docHandle,
      activePageIdx,
      ocrEngine,
      ocrLanguage,
      handleConfirmOcrResult
    ]
  );

  const handleStartBatchOcr = useCallback(
    async (options: {
      pageIndices: number[];
      language: string;
      outputMode: OcrOutputMode;
      downloadAfter: boolean;
    }) => {
      setIsBatchOcrOpen(false);
      const processor = new BatchOcrProcessor(ocrEngine);
      setIsOcrRunning(true);

      const renderPageImg = async (pIdx: number) => {
        if (engine && docHandle) {
          try {
            const bmp = await engine.renderPage(docHandle, pIdx, { scale: 2, dpr: 1 });
            const canvas = document.createElement('canvas');
            canvas.width = bmp.width;
            canvas.height = bmp.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(bmp, 0, 0);
              return ctx.getImageData(0, 0, bmp.width, bmp.height);
            }
          } catch {
            // fallback
          }
        }
        const w = currentMetric ? Math.round(currentMetric.width * 2) : 600;
        const h = currentMetric ? Math.round(currentMetric.height * 2) : 800;
        return createImageData(w, h);
      };

      const controller = new AbortController();
      setOcrAbortController(controller);

      try {
        await processor.processBatch(renderPageImg, pageCount || 1, {
          pageIndices: options.pageIndices,
          language: options.language,
          outputMode: options.outputMode,
          signal: controller.signal,
          onProgress: (p) => {
            setOcrProgress({
              status: 'recognizing',
              progress: p.overallPercent / 100,
              message: p.statusMessage
            });
          }
        });
        setIsOcrRunning(false);
        if (options.downloadAfter) {
          void handleDownload();
        }
      } catch {
        setIsOcrRunning(false);
      }
    },
    [ocrEngine, engine, docHandle, currentMetric, pageCount, handleDownload]
  );

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

  // Phase 11 Handlers
  const handleInsertShape = useCallback(
    async (shape: ShapeObject) => {
      const cmd = new InsertShapeCommand(
        activePageIdx,
        shape,
        async (pIdx, s) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(pIdx) || [];
            next.set(pIdx, [...list, s]);
            return next;
          });
        },
        async (pIdx, sId) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(pIdx) || [];
            next.set(
              pIdx,
              list.filter((o) => o.id !== sId)
            );
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [activePageIdx, editSession]
  );

  const handleCommitDrawingStroke = useCallback(
    async (stroke: DrawingStrokeObject) => {
      setDrawingStrokesMap((prev) => {
        const next = new Map(prev);
        const list = next.get(activePageIdx) || [];
        next.set(activePageIdx, [...list, stroke]);
        return next;
      });

      const cmd = new AddDrawingStrokeCommand(
        activePageIdx,
        stroke,
        async (pIdx, s) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(pIdx) || [];
            next.set(pIdx, [...list, s]);
            return next;
          });
        },
        async (pIdx, sId) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(pIdx) || [];
            next.set(
              pIdx,
              list.filter((o) => o.id !== sId)
            );
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [activePageIdx, editSession]
  );

  const handleEraseDrawingStroke = useCallback(
    async (strokeId: string) => {
      const pageStrokes = drawingStrokesMap.get(activePageIdx) || [];
      const stroke = pageStrokes.find((s) => s.id === strokeId);
      if (!stroke) return;

      setDrawingStrokesMap((prev) => {
        const next = new Map(prev);
        const list = next.get(activePageIdx) || [];
        next.set(
          activePageIdx,
          list.filter((s) => s.id !== strokeId)
        );
        return next;
      });

      const cmd = new EraseDrawingStrokeCommand(
        activePageIdx,
        stroke,
        async (pIdx, sId) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(pIdx) || [];
            next.set(
              pIdx,
              list.filter((o) => o.id !== sId)
            );
            return next;
          });
        },
        async (pIdx, s) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(pIdx) || [];
            next.set(pIdx, [...list, s]);
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [activePageIdx, drawingStrokesMap, editSession]
  );

  const handleInsertTable = useCallback(
    async (generated: GeneratedTable) => {
      const cmd = new InsertTableCommand(
        generated,
        async (table) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(table.structure.pageIndex) || [];
            const textRuns: TextRun[] = table.textBlocks.map((b) => ({
              id: b.id,
              type: 'text',
              text: b.lines[0]?.text || '',
              fontName: b.primaryFont,
              fontSize: b.primaryFontSize,
              fillColor: b.primaryColor,
              bounds: b.bounds,
              matrix: [1, 0, 0, 1, 0, 0],
              zIndex: 30,
              isEmbeddedSubset: false
            }));
            next.set(table.structure.pageIndex, [...list, table.gridPath, ...textRuns]);
            return next;
          });
        },
        async (table) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(table.structure.pageIndex) || [];
            const blockIds = new Set(table.textBlocks.map((b) => b.id));
            next.set(
              table.structure.pageIndex,
              list.filter((o) => o.id !== table.gridPath.id && !blockIds.has(o.id))
            );
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [editSession]
  );

  const handleApplyHeaderFooterBlocks = useCallback(
    async (blocks: TextBlock[]) => {
      const cmd = new ApplyHeaderFooterCommand(
        blocks,
        async (blks) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            for (const b of blks) {
              const list = next.get(b.pageIndex) || [];
              const run: TextRun = {
                id: b.id,
                type: 'text',
                text: b.lines[0]?.text || '',
                fontName: b.primaryFont,
                fontSize: b.primaryFontSize,
                fillColor: b.primaryColor,
                bounds: b.bounds,
                matrix: [1, 0, 0, 1, 0, 0],
                zIndex: 35,
                isEmbeddedSubset: false
              };
              next.set(b.pageIndex, [...list, run]);
            }
            return next;
          });
        },
        async (blockIds) => {
          const idSet = new Set(blockIds);
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            for (const [pIdx, list] of next.entries()) {
              next.set(
                pIdx,
                list.filter((o) => !idSet.has(o.id))
              );
            }
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [editSession]
  );

  const handleApplyWatermark = useCallback(
    async (objects: WatermarkObject[]) => {
      const cmd = new ApplyWatermarkCommand(
        objects,
        async (objs) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            for (const obj of objs) {
              const pIdx = 'pageIndex' in obj ? (obj.pageIndex as number) : activePageIdx;
              const list = next.get(pIdx) || [];
              if ('type' in obj && (obj as ImageObject).type === 'image') {
                next.set(pIdx, [...list, obj as ImageObject]);
              } else {
                const b = obj as TextBlock;
                const run: TextRun = {
                  id: b.id,
                  type: 'text',
                  text: b.lines[0]?.text || '',
                  fontName: b.primaryFont,
                  fontSize: b.primaryFontSize,
                  fillColor: b.primaryColor,
                  bounds: b.bounds,
                  matrix: [1, 0, 0, 1, 0, 0],
                  zIndex: 15,
                  isEmbeddedSubset: false
                };
                next.set(pIdx, [...list, run]);
              }
            }
            return next;
          });
        },
        async (objIds) => {
          const idSet = new Set(objIds);
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            for (const [pIdx, list] of next.entries()) {
              next.set(
                pIdx,
                list.filter((o) => !idSet.has(o.id))
              );
            }
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [activePageIdx, editSession]
  );

  const handlePageBgColorChange = useCallback(
    async (colorHex: string) => {
      const clean = colorHex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16) || 0;
      const g = parseInt(clean.substring(2, 4), 16) || 0;
      const b = parseInt(clean.substring(4, 6), 16) || 0;
      const bgPath = createPageBackground(currentMetric.width, currentMetric.height, {
        r,
        g,
        b,
        a: 255
      });

      const cmd = new SetPageBackgroundCommand(
        [activePageIdx],
        [bgPath],
        async (pIndices, paths) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            for (const pIdx of pIndices) {
              const list = next.get(pIdx) || [];
              next.set(pIdx, [paths[0]!, ...list]);
            }
            return next;
          });
        },
        async (pIndices, pathIds) => {
          const idSet = new Set(pathIds);
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            for (const pIdx of pIndices) {
              const list = next.get(pIdx) || [];
              next.set(
                pIdx,
                list.filter((o) => !idSet.has(o.id))
              );
            }
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [activePageIdx, currentMetric, editSession]
  );

  const handleToggleFormatPainter = useCallback(() => {
    if (!activeTextBlock) return;
    if (isFormatPainterActive) {
      setIsFormatPainterActive(false);
      setFormatPainterStyle(null);
    } else {
      const style = extractTextStyle(activeTextBlock);
      setFormatPainterStyle(style);
      setIsFormatPainterActive(true);
    }
  }, [activeTextBlock, isFormatPainterActive]);

  const handleToggleBulletList = useCallback(() => {
    if (!activeTextBlock) return;
    const lines = activeTextBlock.lines.map((l) => l.text);
    const fullText = lines.join('\n');
    const updated = toggleBulletList(fullText);
    void handleCommitTextBlock(activeTextBlock.id, updated.split('\n'));
  }, [activeTextBlock, handleCommitTextBlock]);

  const handleToggleNumberedList = useCallback(() => {
    if (!activeTextBlock) return;
    const lines = activeTextBlock.lines.map((l) => l.text);
    const fullText = lines.join('\n');
    const updated = toggleNumberedList(fullText);
    void handleCommitTextBlock(activeTextBlock.id, updated.split('\n'));
  }, [activeTextBlock, handleCommitTextBlock]);

  const handleIndentList = useCallback(() => {
    if (!activeTextBlock) return;
    const lines = activeTextBlock.lines.map((l) => l.text);
    const fullText = lines.join('\n');
    const updated = indentList(fullText);
    void handleCommitTextBlock(activeTextBlock.id, updated.split('\n'));
  }, [activeTextBlock, handleCommitTextBlock]);

  const handleOutdentList = useCallback(() => {
    if (!activeTextBlock) return;
    const lines = activeTextBlock.lines.map((l) => l.text);
    const fullText = lines.join('\n');
    const updated = outdentList(fullText);
    void handleCommitTextBlock(activeTextBlock.id, updated.split('\n'));
  }, [activeTextBlock, handleCommitTextBlock]);

  const handleAlign = useCallback(
    async (mode: AlignmentMode) => {
      const objsToAlign = currentObjects.filter((o) => selectedIds.includes(o.id));
      if (objsToAlign.length < 2 && activeTextBlock) {
        const pageTargetRect: Rect = {
          left: 36,
          bottom: 36,
          right: currentMetric.width - 36,
          top: currentMetric.height - 36
        };
        const pseudoObj: PageObject = {
          id: activeTextBlock.id,
          type: 'text',
          text: '',
          fontName: activeTextBlock.primaryFont,
          fontSize: activeTextBlock.primaryFontSize,
          fillColor: activeTextBlock.primaryColor,
          bounds: activeTextBlock.bounds,
          matrix: [1, 0, 0, 1, 0, 0],
          zIndex: 10,
          isEmbeddedSubset: false
        };
        const deltas = alignObjects([pseudoObj], mode, pageTargetRect);
        if (deltas[0]) {
          void handleCommitTextBlock(
            activeTextBlock.id,
            activeTextBlock.lines.map((l) => l.text)
          );
          handleResizeObjects(deltas[0].newBounds);
        }
        return;
      }

      if (objsToAlign.length >= 2) {
        const deltas = alignObjects(objsToAlign, mode);
        const cmd = new AlignObjectsCommand(
          activePageIdx,
          deltas,
          `Align ${mode}`,
          async (pIdx, dlts) => {
            const dltMap = new Map(dlts.map((d) => [d.id, d.newBounds]));
            setPageObjectsMap((prev) => {
              const next = new Map(prev);
              const list = next.get(pIdx) || [];
              next.set(
                pIdx,
                list.map((o) => (dltMap.has(o.id) ? { ...o, bounds: dltMap.get(o.id)! } : o))
              );
              return next;
            });
          },
          async (pIdx, dlts) => {
            const dltMap = new Map(dlts.map((d) => [d.id, d.newBounds]));
            setPageObjectsMap((prev) => {
              const next = new Map(prev);
              const list = next.get(pIdx) || [];
              next.set(
                pIdx,
                list.map((o) => (dltMap.has(o.id) ? { ...o, bounds: dltMap.get(o.id)! } : o))
              );
              return next;
            });
          }
        );
        await editSession.execute(cmd);
      }
    },
    [
      activePageIdx,
      activeTextBlock,
      currentMetric,
      currentObjects,
      editSession,
      handleCommitTextBlock,
      selectedIds
    ]
  );

  const handleDistribute = useCallback(
    async (axis: 'horizontal' | 'vertical') => {
      const objs = currentObjects.filter((o) => selectedIds.includes(o.id));
      if (objs.length < 3) return;

      const deltas = distributeObjects(objs, axis);
      const cmd = new AlignObjectsCommand(
        activePageIdx,
        deltas,
        `Distribute ${axis}`,
        async (pIdx, dlts) => {
          const dltMap = new Map(dlts.map((d) => [d.id, d.newBounds]));
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(pIdx) || [];
            next.set(
              pIdx,
              list.map((o) => (dltMap.has(o.id) ? { ...o, bounds: dltMap.get(o.id)! } : o))
            );
            return next;
          });
        },
        async (pIdx, dlts) => {
          const dltMap = new Map(dlts.map((d) => [d.id, d.newBounds]));
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(pIdx) || [];
            next.set(
              pIdx,
              list.map((o) => (dltMap.has(o.id) ? { ...o, bounds: dltMap.get(o.id)! } : o))
            );
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [activePageIdx, currentObjects, editSession, selectedIds]
  );

  const handleInsertSpecialText = useCallback(
    async (text: string) => {
      const cx = currentMetric.width / 2;
      const cy = currentMetric.height / 2;
      const bounds: Rect = {
        left: cx - 80,
        bottom: cy - 12,
        right: cx + 80,
        top: cy + 12
      };

      const cmd = new InsertTextBlockCommand(
        activePageIdx,
        text,
        bounds,
        'Roboto-Regular',
        14,
        { r: 15, g: 23, b: 42, a: 255 },
        async (pIdx, run) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = next.get(pIdx) || [];
            next.set(pIdx, [...list, run]);
            return next;
          });
        },
        async (pIdx, runId) => {
          setPageObjectsMap((prev) => {
            const next = new Map(prev);
            const list = (next.get(pIdx) || []).filter((o) => o.id !== runId);
            next.set(pIdx, list);
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [activePageIdx, currentMetric, editSession]
  );

  const handleInsertSpecialPath = useCallback(
    async (path: PathObject) => {
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const list = next.get(activePageIdx) || [];
        next.set(activePageIdx, [...list, path]);
        return next;
      });
    },
    [activePageIdx]
  );

  const targetLinkId = selectedIds[0] || activeTextBlockId;

  const handleSaveLink = useCallback(
    async (link: ObjectLink) => {
      if (!targetLinkId) return;
      const prevLink = objectLinks.get(targetLinkId);

      const cmd = new SetObjectLinkCommand(
        activePageIdx,
        targetLinkId,
        link,
        prevLink,
        async (_pIdx, objId, lk) => {
          setObjectLinks((prev) => {
            const next = new Map(prev);
            if (lk) next.set(objId, lk);
            else next.delete(objId);
            return next;
          });
        }
      );
      await editSession.execute(cmd);
    },
    [activePageIdx, editSession, objectLinks, targetLinkId]
  );

  const handleRemoveLink = useCallback(async () => {
    if (!targetLinkId) return;
    const prevLink = objectLinks.get(targetLinkId);
    if (!prevLink) return;

    const cmd = new RemoveObjectLinkCommand(
      activePageIdx,
      targetLinkId,
      prevLink,
      async (_pIdx, objId, lk) => {
        setObjectLinks((prev) => {
          const next = new Map(prev);
          if (lk) next.set(objId, lk);
          else next.delete(objId);
          return next;
        });
      }
    );
    await editSession.execute(cmd);
  }, [activePageIdx, editSession, objectLinks, targetLinkId]);

  // Phase 12: Annotation, Signature & Form Handlers
  const handleSelectStamp = useCallback(
    async (options: {
      stampType: any;
      customText?: string;
      customColor?: any;
      imageUri?: string;
      bounds: Rect;
    }) => {
      const stamp = createStampAnnotation(options);
      const list = annotationsByPage.get(activePageIdx) || [];
      const cmd = new AddAnnotationCommand(activePageIdx, stamp, list, () => {
        setAnnotationsByPage((prev) => new Map(prev).set(activePageIdx, [...list]));
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const objs = next.get(activePageIdx) || [];
          next.set(activePageIdx, [...objs, stamp]);
          return next;
        });
      });
      await editSession.execute(cmd);
    },
    [activePageIdx, annotationsByPage, editSession]
  );

  const handleInsertSignature = useCallback(
    async (options: {
      mode: any;
      data: string;
      fontFamily?: string;
      bounds: Rect;
      color?: any;
    }) => {
      const list = annotationsByPage.get(activePageIdx) || [];
      const cmd = new InsertSignatureCommand(activePageIdx, options, list, () => {
        setAnnotationsByPage((prev) => new Map(prev).set(activePageIdx, [...list]));
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const objs = next.get(activePageIdx) || [];
          next.set(activePageIdx, [...objs, cmd.annotation]);
          return next;
        });
      });
      await editSession.execute(cmd);
    },
    [activePageIdx, annotationsByPage, editSession]
  );

  const handleInsertInitials = useCallback(async () => {
    const cx = currentMetric.width / 2;
    const cy = currentMetric.height / 2;
    const initials = createInitialsAnnotation('INITIALS', { x: cx - 40, y: cy });
    const list = annotationsByPage.get(activePageIdx) || [];
    const cmd = new AddAnnotationCommand(activePageIdx, initials, list, () => {
      setAnnotationsByPage((prev) => new Map(prev).set(activePageIdx, [...list]));
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const objs = next.get(activePageIdx) || [];
        next.set(activePageIdx, [...objs, initials]);
        return next;
      });
    });
    await editSession.execute(cmd);
  }, [activePageIdx, annotationsByPage, currentMetric, editSession]);

  const handleInsertDateStamp = useCallback(async () => {
    const cx = currentMetric.width / 2;
    const cy = currentMetric.height / 2;
    const today = new Date().toISOString().split('T')[0]!;
    const dateStamp = createDateStampAnnotation(today, { x: cx - 50, y: cy });
    const list = annotationsByPage.get(activePageIdx) || [];
    const cmd = new AddAnnotationCommand(activePageIdx, dateStamp, list, () => {
      setAnnotationsByPage((prev) => new Map(prev).set(activePageIdx, [...list]));
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const objs = next.get(activePageIdx) || [];
        next.set(activePageIdx, [...objs, dateStamp]);
        return next;
      });
    });
    await editSession.execute(cmd);
  }, [activePageIdx, annotationsByPage, currentMetric, editSession]);

  const handleAddStickyNote = useCallback(async () => {
    const cx = currentMetric.width / 2;
    const cy = currentMetric.height / 2;
    const note = createStickyNote({
      position: { x: cx - 12, y: cy - 12 },
      contents: 'New note'
    });
    const list = annotationsByPage.get(activePageIdx) || [];
    const cmd = new AddAnnotationCommand(activePageIdx, note, list, () => {
      setAnnotationsByPage((prev) => new Map(prev).set(activePageIdx, [...list]));
      setPageObjectsMap((prev) => {
        const next = new Map(prev);
        const objs = next.get(activePageIdx) || [];
        next.set(activePageIdx, [...objs, note]);
        return next;
      });
    });
    await editSession.execute(cmd);
    setActiveStickyNote({ annot: note, cssPos: { x: cx, y: currentMetric.height - cy } });
  }, [activePageIdx, annotationsByPage, currentMetric, editSession]);

  const handleTextMarkupSelect = useCallback(
    async (subType: TextMarkupType, colorHex?: string) => {
      const targetBounds = activeTextBlock?.bounds || {
        left: currentMetric.width * 0.2,
        bottom: currentMetric.height * 0.7,
        right: currentMetric.width * 0.8,
        top: currentMetric.height * 0.73
      };
      const clean = (colorHex || '#fef08a').replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16) || 254;
      const g = parseInt(clean.substring(2, 4), 16) || 240;
      const b = parseInt(clean.substring(4, 6), 16) || 138;
      const annot = createMarkupAnnotation({
        subType,
        bounds: targetBounds,
        color: { r, g, b, a: subType === 'Highlight' ? 128 : 255 },
        text: activeTextBlock ? activeTextBlock.lines.map((l) => l.text).join('\n') : undefined
      });
      const list = annotationsByPage.get(activePageIdx) || [];
      const vectorPaths = markupToVectorPaths(annot);
      const cmd = new AddAnnotationCommand(activePageIdx, annot, list, () => {
        setAnnotationsByPage((prev) => new Map(prev).set(activePageIdx, [...list]));
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const objs = next.get(activePageIdx) || [];
          next.set(activePageIdx, [...objs, ...vectorPaths]);
          return next;
        });
      });
      await editSession.execute(cmd);
    },
    [activePageIdx, activeTextBlock, annotationsByPage, currentMetric, editSession]
  );

  const handleFormFieldValueChange = useCallback(
    async (fieldId: string, val: string | boolean | string[]) => {
      const list = formFieldsByPage.get(activePageIdx) || [];
      const cmd = new SetFormFieldValueCommand(activePageIdx, fieldId, val, list, () => {
        setFormFieldsByPage((prev) => new Map(prev).set(activePageIdx, [...list]));
      });
      await editSession.execute(cmd);
    },
    [activePageIdx, editSession, formFieldsByPage]
  );

  const handleCreateFormField = useCallback(
    async (options: CreateFormFieldOptions) => {
      const list = formFieldsByPage.get(activePageIdx) || [];
      const cmd = new CreateFormFieldCommand(activePageIdx, options, list, () => {
        setFormFieldsByPage((prev) => new Map(prev).set(activePageIdx, [...list]));
      });
      await editSession.execute(cmd);
    },
    [activePageIdx, editSession, formFieldsByPage]
  );

  const handleApplyAutofill = useCallback(
    async (profile: AutofillProfile) => {
      const fields = formFieldsByPage.get(activePageIdx) || [];
      const matched = autofillFormFields(fields, profile);
      for (const [fId, val] of matched.entries()) {
        const cmd = new SetFormFieldValueCommand(activePageIdx, fId, val, fields, () => {
          setFormFieldsByPage((prev) => new Map(prev).set(activePageIdx, [...fields]));
        });
        await editSession.execute(cmd);
      }
    },
    [activePageIdx, editSession, formFieldsByPage]
  );

  const handleUpdateStickyNoteContent = useCallback(
    async (id: string, newContent: string) => {
      const list = annotationsByPage.get(activePageIdx) || [];
      const cmd = new UpdateAnnotationCommand(
        activePageIdx,
        id,
        { contents: newContent },
        list,
        () => {
          setAnnotationsByPage((prev) => new Map(prev).set(activePageIdx, [...list]));
        }
      );
      await editSession.execute(cmd);
    },
    [activePageIdx, annotationsByPage, editSession]
  );

  const handleDeleteAnnotation = useCallback(
    async (pIdx: number, annotId: string) => {
      const list = annotationsByPage.get(pIdx) || [];
      const cmd = new DeleteAnnotationCommand(pIdx, annotId, list, () => {
        setAnnotationsByPage((prev) => new Map(prev).set(pIdx, [...list]));
        setPageObjectsMap((prev) => {
          const next = new Map(prev);
          const objs = (next.get(pIdx) || []).filter(
            (o) => o.id !== annotId && !o.id.startsWith(annotId)
          );
          next.set(pIdx, objs);
          return next;
        });
      });
      await editSession.execute(cmd);
      if (activeStickyNote?.annot.id === annotId) {
        setActiveStickyNote(null);
      }
    },
    [activeStickyNote, annotationsByPage, editSession]
  );

  // Phase 13 Page Management Callbacks
  const handleDeletePages = useCallback(
    (indices: number[]) => {
      const total = pageCount || 1;
      if (indices.length >= total) return;
      const cmd = new DeletePagesCommand(
        indices,
        (deleted) => {
          setPageCount(total - deleted.length);
          setCurrentPage((cur) => Math.max(1, Math.min(cur, total - deleted.length)));
          setRenderTick((t) => t + 1);
        },
        () => {
          setPageCount(total);
          setRenderTick((t) => t + 1);
        }
      );
      void editSession.execute(cmd);
    },
    [editSession, pageCount]
  );

  const handleInsertBlankPage = useCallback(
    (params: { targetIndex: number; width: number; height: number; preset: string }) => {
      const prevCount = pageCount || 1;
      const cmd = new InsertBlankPageCommand(
        params.targetIndex,
        params.width,
        params.height,
        (targetIdx, w, h) => {
          setPageCount(prevCount + 1);
          setPageMetricsMap((prev) => {
            const next = new Map(prev);
            next.set(targetIdx, { width: w, height: h, rotation: 0 });
            return next;
          });
          setCurrentPage(targetIdx + 1);
          setRenderTick((t) => t + 1);
        },
        (targetIdx) => {
          setPageCount(prevCount);
          setCurrentPage(Math.max(1, targetIdx));
          setRenderTick((t) => t + 1);
        }
      );
      void editSession.execute(cmd);
    },
    [editSession, pageCount]
  );

  const handleDuplicatePage = useCallback(
    (sourceIndex: number) => {
      const prevCount = pageCount || 1;
      const targetIndex = sourceIndex + 1;
      const cmd = new DuplicatePageCommand(
        sourceIndex,
        targetIndex,
        () => {
          setPageCount(prevCount + 1);
          setCurrentPage(targetIndex + 1);
          setRenderTick((t) => t + 1);
        },
        () => {
          setPageCount(prevCount);
          setCurrentPage(Math.max(1, sourceIndex + 1));
          setRenderTick((t) => t + 1);
        }
      );
      void editSession.execute(cmd);
    },
    [editSession, pageCount]
  );

  const handleReorderPages = useCallback(
    (newOrder: number[]) => {
      const prevOrder = Array.from({ length: newOrder.length }, (_, i) => i);
      const cmd = new ReorderPagesCommand(prevOrder, newOrder, () => {
        setRenderTick((t) => t + 1);
      });
      void editSession.execute(cmd);
    },
    [editSession]
  );

  const handleCropPage = useCallback(
    (pageIndex: number, cropBox: Rect) => {
      const prevMetric = pageMetricsMap.get(pageIndex);
      const cmd = new CropPageCommand(pageIndex, undefined, cropBox, (idx, box) => {
        setPageMetricsMap((prev) => {
          const next = new Map(prev);
          const cur = next.get(idx);
          if (cur) {
            next.set(idx, {
              ...cur,
              width: box ? box.right - box.left : (prevMetric?.width ?? cur.width),
              height: box ? box.top - box.bottom : (prevMetric?.height ?? cur.height)
            });
          }
          return next;
        });
        setRenderTick((t) => t + 1);
      });
      void editSession.execute(cmd);
    },
    [editSession, pageMetricsMap]
  );

  const handleResizePage = useCallback(
    (pageIndex: number, width: number, height: number, scaleContent: boolean) => {
      const curMetric = pageMetricsMap.get(pageIndex) || { width: 595, height: 842 };
      const cmd = new ResizePageCommand(
        pageIndex,
        { width: curMetric.width, height: curMetric.height },
        { width, height },
        scaleContent,
        (idx, w, h) => {
          setPageMetricsMap((prev) => {
            const next = new Map(prev);
            const cur = next.get(idx);
            if (cur) {
              next.set(idx, { ...cur, width: w, height: h });
            }
            return next;
          });
          setRenderTick((t) => t + 1);
        }
      );
      void editSession.execute(cmd);
    },
    [editSession, pageMetricsMap]
  );

  const handleUpdateBookmarks = useCallback(
    (newBookmarks: BookmarkItem[]) => {
      const prevBookmarks = bookmarks;
      const cmd = new UpdateBookmarksCommand(prevBookmarks, newBookmarks, (bms) => {
        setBookmarks(bms);
      });
      void editSession.execute(cmd);
    },
    [bookmarks, editSession]
  );

  const handleExtractPages = useCallback(
    async (indices: number[]) => {
      if (!workingBytes) return;
      try {
        const extractedBytes = await extractPagesFromPdf(workingBytes, indices);
        const blob = new Blob([extractedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename ? filename.replace(/\.pdf$/i, '') : 'document'}_extracted.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('[EditorPage] Extract pages error:', err);
      }
    },
    [workingBytes, filename]
  );

  // Commands list for CommandPalette
  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'save',
        category: t('commands.categoryApp'),
        title: 'Save Document',
        shortcut: 'Ctrl+S',
        onSelect: () => void handleSave()
      },
      {
        id: 'download-copy',
        category: t('commands.categoryApp'),
        title: 'Download a Copy',
        onSelect: () => void handleDownloadCopy()
      },
      {
        id: 'export-options',
        category: t('commands.categoryApp'),
        title: 'Export Options...',
        onSelect: () => setIsExportOptionsOpen(true)
      },
      {
        id: 'compress-pdf',
        category: t('commands.categoryApp'),
        title: 'Compress PDF...',
        onSelect: () => setIsCompressOpen(true)
      },
      {
        id: 'version-history',
        category: t('commands.categoryApp'),
        title: 'Version History...',
        onSelect: () => setIsVersionHistoryOpen(true)
      },
      {
        id: 'password-security',
        category: 'Security & Privacy',
        title: 'Document Password & Permissions...',
        onSelect: () => setIsPasswordSecurityOpen(true)
      },
      {
        id: 'redaction',
        category: 'Security & Privacy',
        title: 'Apply True Redaction...',
        onSelect: () => setIsRedactionOpen(true)
      },
      {
        id: 'document-metadata',
        category: 'Security & Privacy',
        title: 'Document Metadata & Properties...',
        onSelect: () => void handleOpenMetadata()
      },
      {
        id: 'local-data-lock',
        category: 'Security & Privacy',
        title: 'Local Data Encryption Lock...',
        onSelect: () => setIsLocalLockOpen(true)
      },
      {
        id: 'clear-local-data',
        category: 'Security & Privacy',
        title: 'Clear All Local Data...',
        onSelect: () => setIsClearDataOpen(true)
      },
      {
        id: 'print',
        category: t('commands.categoryApp'),
        title: 'Print Document',
        shortcut: 'Ctrl+P',
        onSelect: () => setIsPrintOpen(true)
      },
      {
        id: 'share',
        category: t('commands.categoryApp'),
        title: 'Share Document',
        onSelect: () => void handleShare()
      },
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
      handleSave,
      handleDownloadCopy,
      handleShare,
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
        onBackToHome={handleBackToHome}
        onDownload={handleDownload}
        onSave={handleSave}
        onDownloadCopy={handleDownloadCopy}
        onOpenExportOptions={() => setIsExportOptionsOpen(true)}
        onOpenCompress={() => setIsCompressOpen(true)}
        onPrint={() => setIsPrintOpen(true)}
        onShare={handleShare}
        onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
        onToggleSearch={() => {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true })
          );
        }}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenShortcutsHelp={() => setShortcutsHelpOpen(true)}
        onOpenBatchOcr={() => setIsBatchOcrOpen(true)}
        onOpenPasswordSecurity={() => setIsPasswordSecurityOpen(true)}
        onOpenRedaction={() => setIsRedactionOpen(true)}
        onOpenMetadata={() => void handleOpenMetadata()}
        onOpenLocalDataLock={() => setIsLocalLockOpen(true)}
        onOpenClearData={() => setIsClearDataOpen(true)}
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
        onToggleBulletList={handleToggleBulletList}
        onToggleNumberedList={handleToggleNumberedList}
        onIndentList={handleIndentList}
        onOutdentList={handleOutdentList}
        isFormatPainterActive={isFormatPainterActive}
        onToggleFormatPainter={handleToggleFormatPainter}
        onAlign={handleAlign}
        onDistribute={handleDistribute}
        onInsertShape={handleInsertShape}
        onOpenInsertTable={() => setIsTableDialogOpen(true)}
        onOpenHeaderFooter={() => setIsHeaderFooterDialogOpen(true)}
        onOpenWatermark={() => setIsWatermarkDialogOpen(true)}
        onPageBgColorChange={handlePageBgColorChange}
        onInsertSpecialText={handleInsertSpecialText}
        onInsertSpecialPath={handleInsertSpecialPath}
        onOpenLinkDialog={() => setIsLinkDialogOpen(true)}
        hasLink={Boolean(targetLinkId && objectLinks.has(targetLinkId))}
        isRulerActive={isRulerActive}
        onToggleRuler={() => setIsRulerActive((r) => !r)}
        isGridActive={isGridActive}
        onToggleGrid={() => setIsGridActive((g) => !g)}
        annotateTool={annotateTool}
        onAnnotateToolChange={setAnnotateTool}
        annotateColor={annotateColor}
        onAnnotateColorChange={setAnnotateColor}
        annotateStrokeWidth={annotateStrokeWidth}
        onAnnotateStrokeWidthChange={setAnnotateStrokeWidth}
        onOpenStamps={() => setIsStampsPopoverOpen(true)}
        onOpenSignatures={() => setIsSignatureDialogOpen(true)}
        onInsertInitials={handleInsertInitials}
        onInsertDateStamp={handleInsertDateStamp}
        onAddStickyNote={handleAddStickyNote}
        onTextMarkupSelect={handleTextMarkupSelect}
        onOpenAutofill={() => setIsAutofillDialogOpen(true)}
        onOpenCreateFormField={() => setIsCreateFormFieldDialogOpen(true)}
        onOpenAnnotationSummary={() => setIsAnnotationSummaryDialogOpen(true)}
        onToggleCommentsPanel={() => setIsCommentsPanelOpen((p) => !p)}
        commentCount={
          (annotationsByPage.get(activePageIdx) || []).filter(
            (a) => a.subType === 'Text' || a.contents
          ).length
        }
        onOpenPageOrganizer={() => setIsPageOrganizerOpen(true)}
        onToggleBookmarksPanel={() => setIsBookmarksPanelOpen((p) => !p)}
        onOpenInsertBlankPage={() => setIsInsertBlankPageOpen(true)}
        onOpenCropPage={() => setIsCropPageOpen(true)}
        onOpenResizePage={() => setIsResizePageOpen(true)}
        bookmarkCount={bookmarks.length}
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
          {xfaWarning && <XfaWarningBanner onDismiss={() => setXfaWarning(null)} />}
          {scannedDetection?.isScanned && !scannedBannerDismissed.has(activePageIdx) && (
            <ScannedPageBanner
              pageIndex={activePageIdx}
              reason={scannedDetection.reason}
              selectedLanguage={ocrLanguage}
              onSelectLanguage={setOcrLanguage}
              onStartOcr={handleStartPageOcr}
              onDismiss={() =>
                setScannedBannerDismissed((prev) => new Set(prev).add(activePageIdx))
              }
            />
          )}
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
                    <RulerGridOverlay
                      pageWidthPt={metric.width}
                      pageHeightPt={metric.height}
                      rotation={metric.rotation}
                      scale={scale}
                      showRuler={isRulerActive}
                      showGrid={isGridActive}
                    />
                    {activeMode === 'annotate' && (
                      <DrawingCanvasOverlay
                        pageWidthPt={metric.width}
                        pageHeightPt={metric.height}
                        rotation={metric.rotation}
                        scale={scale}
                        tool={annotateTool}
                        color={annotateColor}
                        strokeWidth={annotateStrokeWidth}
                        existingStrokes={drawingStrokesMap.get(activePageIdx) || []}
                        onCommitStroke={handleCommitDrawingStroke}
                        onEraseStroke={handleEraseDrawingStroke}
                      />
                    )}
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
                        if (isFormatPainterActive && formatPainterStyle) {
                          const target = currentTextBlocks.find((b) => b.id === blockId);
                          if (target) {
                            const updated = applyTextStyleToBlock(target, formatPainterStyle);
                            void handleCommitTextBlock(
                              updated.id,
                              updated.lines.map((l) => l.text),
                              {
                                fontName: updated.primaryFont,
                                fontSize: updated.primaryFontSize,
                                color: updated.primaryColor
                              }
                            );
                            setIsFormatPainterActive(false);
                            setFormatPainterStyle(null);
                          }
                          return;
                        }
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
                        void handleStartPageOcr('editable');
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
                    {targetLinkId && objectLinks.has(targetLinkId) && !editingBlock && (
                      <LinkChip
                        link={objectLinks.get(targetLinkId)!}
                        onEdit={() => setIsLinkDialogOpen(true)}
                        onRemove={handleRemoveLink}
                        onNavigatePage={(pIdx) => setCurrentPage(pIdx + 1)}
                        onOpenLink={handleSafeNavigateLink}
                      />
                    )}
                    <AcroFormOverlay
                      pageWidthPt={metric.width}
                      pageHeightPt={metric.height}
                      rotation={metric.rotation}
                      scale={scale}
                      fields={formFieldsByPage.get(activePageIdx) || []}
                      onFieldValueChange={handleFormFieldValueChange}
                    />
                    {activeStickyNote && (
                      <StickyNotePopup
                        annotation={activeStickyNote.annot}
                        position={activeStickyNote.cssPos}
                        onUpdateContent={handleUpdateStickyNoteContent}
                        onDelete={(id) => handleDeleteAnnotation(activePageIdx, id)}
                        onClose={() => setActiveStickyNote(null)}
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

      {/* OCR Modals (Phase 10) */}
      <OcrProgressModal
        isOpen={isOcrRunning}
        progress={ocrProgress}
        onCancel={() => {
          ocrAbortController?.abort();
          setIsOcrRunning(false);
        }}
      />
      <OcrReviewDialog
        isOpen={isOcrReviewOpen}
        result={pendingOcrResult}
        outputMode={pendingOcrMode}
        onConfirm={(updated) => handleConfirmOcrResult(updated)}
        onCancel={() => setIsOcrReviewOpen(false)}
      />
      <BatchOcrDialog
        isOpen={isBatchOcrOpen}
        totalPages={pageCount || 1}
        currentPage={activePageIdx}
        onStartBatch={handleStartBatchOcr}
        onClose={() => setIsBatchOcrOpen(false)}
      />

      {/* Phase 11 Dialogs */}
      <InsertTableDialog
        isOpen={isTableDialogOpen}
        onClose={() => setIsTableDialogOpen(false)}
        onInsertTable={handleInsertTable}
        pageIndex={activePageIdx}
        pageWidthPt={currentMetric.width}
        pageHeightPt={currentMetric.height}
      />
      <HeaderFooterDialog
        isOpen={isHeaderFooterDialogOpen}
        onClose={() => setIsHeaderFooterDialogOpen(false)}
        onApplyBlocks={handleApplyHeaderFooterBlocks}
        totalPages={pageCount || 1}
        pageWidthPt={currentMetric.width}
        pageHeightPt={currentMetric.height}
      />
      <WatermarkDialog
        isOpen={isWatermarkDialogOpen}
        onClose={() => setIsWatermarkDialogOpen(false)}
        onApplyWatermark={handleApplyWatermark}
        totalPages={pageCount || 1}
        pageWidthPt={currentMetric.width}
        pageHeightPt={currentMetric.height}
      />
      <LinkDialog
        isOpen={isLinkDialogOpen}
        onClose={() => setIsLinkDialogOpen(false)}
        onSaveLink={handleSaveLink}
        onRemoveLink={handleRemoveLink}
        initialLink={targetLinkId ? objectLinks.get(targetLinkId) : undefined}
        totalPages={pageCount || 1}
      />

      {/* Comments Panel (Task 12.2) */}
      <CommentsPanel
        isOpen={isCommentsPanelOpen}
        onClose={() => setIsCommentsPanelOpen(false)}
        annotationsByPage={annotationsByPage}
        onJumpToPage={(pIdx) => setCurrentPage(pIdx + 1)}
        onDeleteComment={handleDeleteAnnotation}
      />

      {/* Phase 12 Dialogs */}
      <StampsPopover
        isOpen={isStampsPopoverOpen}
        onClose={() => setIsStampsPopoverOpen(false)}
        onSelectStamp={handleSelectStamp}
      />
      <SignatureDialog
        isOpen={isSignatureDialogOpen}
        onClose={() => setIsSignatureDialogOpen(false)}
        onInsertSignature={handleInsertSignature}
      />
      <AutofillDialog
        isOpen={isAutofillDialogOpen}
        onClose={() => setIsAutofillDialogOpen(false)}
        onApplyAutofill={handleApplyAutofill}
      />
      <CreateFormFieldDialog
        isOpen={isCreateFormFieldDialogOpen}
        onClose={() => setIsCreateFormFieldDialogOpen(false)}
        pageIndex={activePageIdx}
        onCreateField={handleCreateFormField}
      />
      <AnnotationSummaryDialog
        isOpen={isAnnotationSummaryDialogOpen}
        onClose={() => setIsAnnotationSummaryDialogOpen(false)}
        annotationsByPage={annotationsByPage}
        documentName={filename || 'document'}
      />

      {/* Bookmarks Panel (Task 13.13) */}
      <BookmarksPanel
        open={isBookmarksPanelOpen}
        onClose={() => setIsBookmarksPanelOpen(false)}
        bookmarks={bookmarks}
        currentPageIndex={activePageIdx}
        totalPages={pageCount || 1}
        onJumpToPage={(pIdx) => setCurrentPage(pIdx + 1)}
        onUpdateBookmarks={handleUpdateBookmarks}
      />

      {/* Insert Blank Page Dialog (Task 13.4) */}
      <InsertBlankPageDialog
        open={isInsertBlankPageOpen}
        onClose={() => setIsInsertBlankPageOpen(false)}
        currentPageIndex={activePageIdx}
        totalPages={pageCount || 1}
        onInsert={handleInsertBlankPage}
      />

      {/* Crop Page Dialog (Task 13.10) */}
      <CropPageDialog
        open={isCropPageOpen}
        onClose={() => setIsCropPageOpen(false)}
        pageIndex={activePageIdx}
        pageWidth={currentMetric.width}
        pageHeight={currentMetric.height}
        onApplyCrop={handleCropPage}
      />

      {/* Resize Page Dialog (Task 13.11) */}
      <ResizePageDialog
        open={isResizePageOpen}
        onClose={() => setIsResizePageOpen(false)}
        pageIndex={activePageIdx}
        currentWidth={currentMetric.width}
        currentHeight={currentMetric.height}
        onApplyResize={handleResizePage}
      />

      {/* Page Organizer Modal Overlay (Task 13.1) */}
      {isPageOrganizerOpen && (
        <div
          data-testid="page-organizer-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'var(--bg-card)',
            zIndex: 100,
            overflowY: 'auto'
          }}
        >
          <PageOrganizerPage
            initialPages={Array.from({ length: pageCount || 1 }, (_, i) => {
              const m = pageMetricsMap.get(i) || { width: 595, height: 842, rotation: 0 };
              return {
                id: `page_${i + 1}`,
                originalIndex: i,
                rotation: m.rotation ?? 0,
                width: m.width,
                height: m.height
              };
            })}
            documentBytes={workingBytes ?? undefined}
            bookmarks={bookmarks}
            onClose={() => setIsPageOrganizerOpen(false)}
            onRotatePages={handleRotatePages}
            onDeletePages={handleDeletePages}
            onDuplicatePage={handleDuplicatePage}
            onReorderPages={handleReorderPages}
            onExtractPages={handleExtractPages}
            onInsertBlankPage={handleInsertBlankPage}
            onCropPage={handleCropPage}
            onResizePage={handleResizePage}
          />
        </div>
      )}
      {/* Phase 14 Dialogs: Save, Export, Print, Share, Compress, Version History */}
      <ConfirmSaveOriginalDialog
        isOpen={isConfirmSaveOpen}
        filename={filename || 'document.pdf'}
        onClose={() => setIsConfirmSaveOpen(false)}
        onSaveOriginal={handleConfirmSaveOriginal}
        onDownloadCopy={handleDownloadCopy}
      />

      <ExportOptionsDialog
        isOpen={isExportOptionsOpen}
        currentFileSize={currentFileSize}
        onClose={() => setIsExportOptionsOpen(false)}
        onExport={handleExportWithOptions}
      />

      <CompressPdfDialog
        isOpen={isCompressOpen}
        currentFileSize={currentFileSize}
        onClose={() => setIsCompressOpen(false)}
        onCompress={handleCompress}
      />

      <PrintDialog
        isOpen={isPrintOpen}
        pageCount={pageCount || 1}
        currentPageIndex={activePageIdx}
        onClose={() => setIsPrintOpen(false)}
        onPrint={handlePrint}
      />

      <SaveProgressModal
        isOpen={isSaveProgressOpen}
        progress={saveProgress}
        statusMessage={saveProgressStatus}
        onCancel={() => {
          saveAbortController?.abort();
          setIsSaveProgressOpen(false);
          setSaveAbortController(null);
        }}
      />

      <UnsavedChangesDialog
        isOpen={isUnsavedChangesOpen}
        filename={filename || 'document.pdf'}
        onSave={async () => {
          setIsUnsavedChangesOpen(false);
          await handleSave();
          closeDoc();
        }}
        onDiscard={() => {
          setIsUnsavedChangesOpen(false);
          setDirty(false);
          if (currentDocId) {
            void wipeDocumentWorkingData(currentDocId);
          }
          closeDoc();
        }}
        onCancel={() => setIsUnsavedChangesOpen(false)}
      />

      <VersionHistoryDialog
        isOpen={isVersionHistoryOpen}
        docId={currentDocId}
        onClose={() => setIsVersionHistoryOpen(false)}
        onRestore={handleRestoreVersion}
      />

      <PasswordSecurityDialog
        isOpen={isPasswordSecurityOpen}
        onClose={() => setIsPasswordSecurityOpen(false)}
        onApplyPassword={handleApplyPasswordSecurity}
        onRemovePassword={handleRemovePasswordSecurity}
      />

      <RedactionDialog
        isOpen={isRedactionOpen}
        pageIndex={activePageIdx}
        onClose={() => setIsRedactionOpen(false)}
        onApplyRedaction={handleApplyRedaction}
      />

      <MetadataEditorDialog
        isOpen={isMetadataOpen}
        initialMetadata={currentDocMetadata}
        onClose={() => setIsMetadataOpen(false)}
        onSaveMetadata={handleSaveMetadata}
        onStripMetadata={handleStripMetadata}
      />

      <LocalDataLockDialog isOpen={isLocalLockOpen} onClose={() => setIsLocalLockOpen(false)} />

      <ClearDataConfirmDialog
        isOpen={isClearDataOpen}
        onClose={() => setIsClearDataOpen(false)}
        onConfirmClear={handleClearAllData}
      />

      <ExternalLinkConfirmDialog
        isOpen={isExternalLinkConfirmOpen}
        targetUrl={pendingExternalUrl}
        onClose={() => setIsExternalLinkConfirmOpen(false)}
        onConfirmOpen={() => {
          setIsExternalLinkConfirmOpen(false);
          window.open(pendingExternalUrl, '_blank', 'noopener,noreferrer');
        }}
      />
    </div>
  );
}
