import React, { useState } from 'react';
import { Button } from '@rhypdf/ui';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  RotateCw,
  RotateCcw,
  Trash2,
  Copy,
  Plus,
  FilePlus,
  GitMerge,
  Scissors,
  Crop,
  Maximize2,
  FileImage,
  Image,
  ArrowLeft,
  GripVertical
} from 'lucide-react';
import { InsertBlankPageDialog } from './InsertBlankPageDialog';
import { InsertPagesFromPdfDialog } from './InsertPagesFromPdfDialog';
import { MergePdfDialog } from './MergePdfDialog';
import { SplitPdfDialog } from './SplitPdfDialog';
import { CropPageDialog } from './CropPageDialog';
import { ResizePageDialog } from './ResizePageDialog';
import { ImagesToPdfDialog } from './ImagesToPdfDialog';
import { PdfToImagesDialog } from './PdfToImagesDialog';
import type { BookmarkItem } from '@rhypdf/edit-core';

export interface PageItemModel {
  id: string;
  originalIndex: number;
  rotation: number;
  width: number;
  height: number;
}

export interface PageOrganizerPageProps {
  initialPages?: PageItemModel[];
  documentBytes?: Uint8Array;
  bookmarks?: BookmarkItem[];
  onClose?: () => void;
  onRotatePages?: (indices: number[], delta: number) => void;
  onDeletePages?: (indices: number[]) => void;
  onDuplicatePage?: (sourceIndex: number) => void;
  onReorderPages?: (newOrder: number[]) => void;
  onExtractPages?: (indices: number[]) => void;
  onInsertBlankPage?: (params: { targetIndex: number; width: number; height: number; preset: string }) => void;
  onInsertPagesFromPdf?: (params: { sourceBytes: Uint8Array; pageRange: string; targetIndex: number }) => void;
  onCropPage?: (pageIndex: number, cropBox: { left: number; bottom: number; right: number; top: number }) => void;
  onResizePage?: (pageIndex: number, width: number, height: number, scaleContent: boolean) => void;
}

interface SortablePageCardProps {
  page: PageItemModel;
  index: number;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onRotate: (id: string, delta: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCrop: (page: PageItemModel) => void;
  onResize: (page: PageItemModel) => void;
}

const SortablePageCard: React.FC<SortablePageCardProps> = ({
  page,
  index,
  isSelected,
  onToggleSelect,
  onRotate,
  onDuplicate,
  onDelete,
  onCrop,
  onResize
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--bg-border)',
    borderRadius: 'var(--radius-md)',
    padding: 12,
    backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'var(--bg-card)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative',
    userSelect: 'none'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`page-card-${page.id}`}
      onClick={() => onToggleSelect(page.id)}
    >
      {/* Top Header: Drag Handle & Selection Checkbox */}
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <button
          {...attributes}
          {...listeners}
          data-testid={`drag-handle-${page.id}`}
          type="button"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'grab',
            color: 'var(--bg-muted-foreground)',
            padding: 2
          }}
          title="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bg-muted-foreground)' }}>
          Page {index + 1}
        </span>

        <input
          data-testid={`page-select-checkbox-${page.id}`}
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(page.id);
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>

      {/* Page Preview Thumbnail Box */}
      <div
        style={{
          width: 120,
          height: 160,
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          boxShadow: 'var(--shadow-sm)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          transform: `rotate(${page.rotation}deg)`,
          transition: 'transform 0.2s ease',
          marginBottom: 10,
          color: '#1e293b'
        }}
      >
        <span style={{ fontSize: 16 }}>{index + 1}</span>
        <span style={{ fontSize: 10, color: '#64748b' }}>{Math.round(page.width)}×{Math.round(page.height)}</span>
      </div>

      {/* Rotation indicator */}
      <div style={{ fontSize: 11, color: 'var(--bg-muted-foreground)', marginBottom: 8 }}>
        {page.rotation}&deg;
      </div>

      {/* Card Quick Action Buttons */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button
          data-testid={`rotate-cw-${page.id}`}
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onRotate(page.id, 90);
          }}
          title="Rotate 90° Clockwise"
        >
          <RotateCw size={13} />
        </Button>
        <Button
          data-testid={`crop-${page.id}`}
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onCrop(page);
          }}
          title="Crop page"
        >
          <Crop size={13} />
        </Button>
        <Button
          data-testid={`resize-${page.id}`}
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onResize(page);
          }}
          title="Resize page"
        >
          <Maximize2 size={13} />
        </Button>
        <Button
          data-testid={`duplicate-${page.id}`}
          size="sm"
          variant="secondary"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(page.id);
          }}
          title="Duplicate page"
        >
          <Copy size={13} />
        </Button>
        <Button
          data-testid={`delete-${page.id}`}
          size="sm"
          variant="destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(page.id);
          }}
          title="Delete page"
        >
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  );
};

export default function PageOrganizerPage({
  initialPages,
  documentBytes = new Uint8Array(),
  bookmarks = [],
  onClose,
  onRotatePages,
  onDeletePages,
  onDuplicatePage,
  onReorderPages,
  onExtractPages,
  onInsertBlankPage,
  onInsertPagesFromPdf,
  onCropPage,
  onResizePage
}: PageOrganizerPageProps): React.JSX.Element {
  const [pages, setPages] = useState<PageItemModel[]>(() => {
    if (initialPages && initialPages.length > 0) return initialPages;
    return [
      { id: 'p_1', originalIndex: 0, rotation: 0, width: 595, height: 842 },
      { id: 'p_2', originalIndex: 1, rotation: 0, width: 595, height: 842 },
      { id: 'p_3', originalIndex: 2, rotation: 0, width: 595, height: 842 },
      { id: 'p_4', originalIndex: 3, rotation: 0, width: 595, height: 842 }
    ];
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dialog States
  const [openInsertBlank, setOpenInsertBlank] = useState(false);
  const [openInsertPdf, setOpenInsertPdf] = useState(false);
  const [openMerge, setOpenMerge] = useState(false);
  const [openSplit, setOpenSplit] = useState(false);
  const [openCrop, setOpenCrop] = useState<PageItemModel | null>(null);
  const [openResize, setOpenResize] = useState<PageItemModel | null>(null);
  const [openImagesToPdf, setOpenImagesToPdf] = useState(false);
  const [openPdfToImages, setOpenPdfToImages] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);
        onReorderPages?.(reordered.map((p) => p.originalIndex));
        return reordered;
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(pages.map((p) => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const rotatePage = (id: string, delta: number) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rotation: ((p.rotation + delta) % 360 + 360) % 360 } : p))
    );
    const target = pages.find((p) => p.id === id);
    if (target) {
      onRotatePages?.([target.originalIndex], delta);
    }
  };

  const rotateSelected = (delta: number) => {
    const targetIds = selectedIds.size > 0 ? selectedIds : new Set(pages.map((p) => p.id));
    setPages((prev) =>
      prev.map((p) =>
        targetIds.has(p.id) ? { ...p, rotation: ((p.rotation + delta) % 360 + 360) % 360 } : p
      )
    );
    const targetIndices = pages.filter((p) => targetIds.has(p.id)).map((p) => p.originalIndex);
    onRotatePages?.(targetIndices, delta);
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) {
      alert('Cannot delete all pages from PDF: at least one page must remain.');
      return;
    }
    const target = pages.find((p) => p.id === id);
    setPages((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (target) {
      onDeletePages?.([target.originalIndex]);
    }
  };

  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (selectedIds.size >= pages.length) {
      alert('Cannot delete all pages from PDF: at least one page must remain.');
      return;
    }
    const targetIndices = pages.filter((p) => selectedIds.has(p.id)).map((p) => p.originalIndex);
    setPages((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectedIds(new Set());
    onDeletePages?.(targetIndices);
  };

  const duplicatePage = (id: string) => {
    const targetIndex = pages.findIndex((p) => p.id === id);
    const target = pages[targetIndex];
    if (!target) return;

    const newPage: PageItemModel = {
      id: `p_dup_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      originalIndex: target.originalIndex,
      rotation: target.rotation,
      width: target.width,
      height: target.height
    };

    setPages((prev) => {
      const next = [...prev];
      next.splice(targetIndex + 1, 0, newPage);
      return next;
    });

    onDuplicatePage?.(target.originalIndex);
  };

  const extractSelected = () => {
    const targetIndices = pages
      .filter((p) => selectedIds.has(p.id))
      .map((p) => p.originalIndex);

    if (targetIndices.length === 0) return;
    onExtractPages?.(targetIndices);
  };

  const activePageIndex = pages[0]?.originalIndex ?? 0;

  return (
    <div data-testid="page-organizer" style={{ padding: 24, maxWidth: 1200, marginInline: 'auto' }}>
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          borderBottom: '1px solid var(--bg-border)',
          paddingBottom: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {onClose && (
            <Button data-testid="back-to-editor-btn" variant="secondary" onClick={onClose}>
              <ArrowLeft size={16} style={{ marginRight: 6 }} /> Back to Editor
            </Button>
          )}
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Page Organizer</h1>
            <p style={{ color: 'var(--bg-muted-foreground)', fontSize: 13, margin: '2px 0 0' }}>
              {pages.length} {pages.length === 1 ? 'page' : 'pages'} &bull; {selectedIds.size} selected
            </p>
          </div>
        </div>

        {/* Global Page Tools */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            data-testid="insert-blank-page-btn"
            variant="secondary"
            onClick={() => setOpenInsertBlank(true)}
          >
            <Plus size={15} style={{ marginRight: 4 }} /> Blank Page
          </Button>
          <Button
            data-testid="insert-pdf-btn"
            variant="secondary"
            onClick={() => setOpenInsertPdf(true)}
          >
            <FilePlus size={15} style={{ marginRight: 4 }} /> Insert PDF
          </Button>
          <Button
            data-testid="merge-pdfs-btn"
            variant="secondary"
            onClick={() => setOpenMerge(true)}
          >
            <GitMerge size={15} style={{ marginRight: 4 }} /> Merge
          </Button>
          <Button
            data-testid="split-pdf-btn"
            variant="secondary"
            onClick={() => setOpenSplit(true)}
          >
            <Scissors size={15} style={{ marginRight: 4 }} /> Split
          </Button>
          <Button
            data-testid="images-to-pdf-btn"
            variant="secondary"
            onClick={() => setOpenImagesToPdf(true)}
          >
            <Image size={15} style={{ marginRight: 4 }} /> Images to PDF
          </Button>
          <Button
            data-testid="pdf-to-images-btn"
            variant="secondary"
            onClick={() => setOpenPdfToImages(true)}
          >
            <FileImage size={15} style={{ marginRight: 4 }} /> Export Images
          </Button>
        </div>
      </header>

      {/* Action Toolbar for Selection */}
      <div
        data-testid="organizer-selection-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-muted)',
          padding: '8px 16px',
          borderRadius: 8,
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="sm" variant="secondary" onClick={selectAll} data-testid="select-all-pages-btn">
            Select All
          </Button>
          <Button size="sm" variant="secondary" onClick={deselectAll} data-testid="deselect-all-pages-btn">
            Deselect All
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Button
            data-testid="rotate-cw-selected-btn"
            size="sm"
            variant="secondary"
            onClick={() => rotateSelected(90)}
          >
            <RotateCw size={14} style={{ marginRight: 4 }} /> Rotate CW
          </Button>
          <Button
            data-testid="rotate-ccw-selected-btn"
            size="sm"
            variant="secondary"
            onClick={() => rotateSelected(-90)}
          >
            <RotateCcw size={14} style={{ marginRight: 4 }} /> Rotate CCW
          </Button>
          <Button
            data-testid="extract-selected-btn"
            size="sm"
            variant="secondary"
            onClick={extractSelected}
            disabled={selectedIds.size === 0}
          >
            Extract Selected
          </Button>
          <Button
            data-testid="delete-selected-btn"
            size="sm"
            variant="destructive"
            onClick={deleteSelected}
            disabled={selectedIds.size === 0}
          >
            <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
          </Button>
        </div>
      </div>

      {/* Sortable Thumbnail Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
          <div
            data-testid="pages-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 20
            }}
          >
            {pages.map((page, index) => (
              <SortablePageCard
                key={page.id}
                page={page}
                index={index}
                isSelected={selectedIds.has(page.id)}
                onToggleSelect={toggleSelect}
                onRotate={rotatePage}
                onDuplicate={duplicatePage}
                onDelete={deletePage}
                onCrop={(p) => setOpenCrop(p)}
                onResize={(p) => setOpenResize(p)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Dialogs */}
      {openInsertBlank && (
        <InsertBlankPageDialog
          open={openInsertBlank}
          onClose={() => setOpenInsertBlank(false)}
          currentPageIndex={activePageIndex}
          totalPages={pages.length}
          onInsert={(params) => {
            const newPage: PageItemModel = {
              id: `p_new_${Date.now()}`,
              originalIndex: params.targetIndex,
              rotation: 0,
              width: params.width,
              height: params.height
            };
            setPages((prev) => {
              const copy = [...prev];
              copy.splice(params.targetIndex, 0, newPage);
              return copy;
            });
            onInsertBlankPage?.(params);
          }}
        />
      )}

      {openInsertPdf && (
        <InsertPagesFromPdfDialog
          open={openInsertPdf}
          onClose={() => setOpenInsertPdf(false)}
          currentPageIndex={activePageIndex}
          totalPages={pages.length}
          onInsertPages={(params) => {
            onInsertPagesFromPdf?.(params);
          }}
        />
      )}

      {openMerge && (
        <MergePdfDialog
          open={openMerge}
          onClose={() => setOpenMerge(false)}
          currentDocumentBytes={documentBytes}
        />
      )}

      {openSplit && (
        <SplitPdfDialog
          open={openSplit}
          onClose={() => setOpenSplit(false)}
          documentBytes={documentBytes}
          totalPages={pages.length}
          selectedPages={pages.filter((p) => selectedIds.has(p.id)).map((p) => p.originalIndex)}
          bookmarks={bookmarks}
        />
      )}

      {openCrop && (
        <CropPageDialog
          open={!!openCrop}
          onClose={() => setOpenCrop(null)}
          pageIndex={openCrop.originalIndex}
          pageWidth={openCrop.width}
          pageHeight={openCrop.height}
          onApplyCrop={(idx, cropBox) => {
            onCropPage?.(idx, cropBox);
          }}
        />
      )}

      {openResize && (
        <ResizePageDialog
          open={!!openResize}
          onClose={() => setOpenResize(null)}
          pageIndex={openResize.originalIndex}
          currentWidth={openResize.width}
          currentHeight={openResize.height}
          onApplyResize={(idx, w, h, scale) => {
            setPages((prev) =>
              prev.map((p) => (p.originalIndex === idx ? { ...p, width: w, height: h } : p))
            );
            onResizePage?.(idx, w, h, scale);
          }}
        />
      )}

      {openImagesToPdf && (
        <ImagesToPdfDialog
          open={openImagesToPdf}
          onClose={() => setOpenImagesToPdf(false)}
        />
      )}

      {openPdfToImages && (
        <PdfToImagesDialog
          open={openPdfToImages}
          onClose={() => setOpenPdfToImages(false)}
          currentPageIndex={activePageIndex}
          totalPages={pages.length}
        />
      )}
    </div>
  );
}
