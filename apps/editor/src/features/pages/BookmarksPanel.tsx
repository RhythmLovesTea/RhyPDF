import React, { useState } from 'react';
import { Button } from '@rhypdf/ui';
import {
  type BookmarkItem,
  addBookmark,
  updateBookmark,
  deleteBookmark,
  flattenBookmarks
} from '@rhypdf/edit-core';
import { Plus, Trash2, Edit2, Check, X, ChevronRight, Bookmark } from 'lucide-react';

export interface BookmarksPanelProps {
  open: boolean;
  onClose: () => void;
  bookmarks: BookmarkItem[];
  currentPageIndex: number;
  totalPages: number;
  onJumpToPage: (pageIndex: number) => void;
  onUpdateBookmarks: (newBookmarks: BookmarkItem[]) => void;
}

export const BookmarksPanel: React.FC<BookmarksPanelProps> = ({
  open,
  onClose,
  bookmarks,
  currentPageIndex,
  totalPages,
  onJumpToPage,
  onUpdateBookmarks
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingPage, setEditingPage] = useState(1);
  const [newTitle, setNewTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [parentTargetId, setParentTargetId] = useState<string | null>(null);

  if (!open) return null;

  const handleStartAdd = (parentId: string | null = null) => {
    setParentTargetId(parentId);
    setNewTitle(`Section ${bookmarks.length + 1}`);
    setShowAddForm(true);
  };

  const handleConfirmAdd = () => {
    if (!newTitle.trim()) return;
    const { tree } = addBookmark(bookmarks, parentTargetId, {
      title: newTitle.trim(),
      pageIndex: currentPageIndex
    });
    onUpdateBookmarks(tree);
    setShowAddForm(false);
    setNewTitle('');
    setParentTargetId(null);
  };

  const handleStartEdit = (item: BookmarkItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingPage(item.pageIndex + 1);
  };

  const handleSaveEdit = (id: string) => {
    if (!editingTitle.trim()) return;
    const clampedPage = Math.max(0, Math.min(editingPage - 1, totalPages - 1));
    const updated = updateBookmark(bookmarks, id, {
      title: editingTitle.trim(),
      pageIndex: clampedPage
    });
    onUpdateBookmarks(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = deleteBookmark(bookmarks, id);
    onUpdateBookmarks(updated);
  };

  const flatList = flattenBookmarks(bookmarks);

  return (
    <aside
      data-testid="bookmarks-panel"
      style={{
        position: 'fixed',
        top: 48,
        left: 0,
        bottom: 28,
        width: 320,
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--bg-border)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--bg-border)',
          backgroundColor: 'var(--bg-muted)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bookmark size={18} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Document Bookmarks</h2>
        </div>
        <button
          data-testid="close-bookmarks-panel-btn"
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: 'var(--bg-muted-foreground)'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Toolbar */}
      <div
        style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--bg-border)',
          display: 'flex',
          gap: 8
        }}
      >
        <Button
          data-testid="add-bookmark-btn"
          size="sm"
          variant="secondary"
          onClick={() => handleStartAdd(null)}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          <Plus size={14} style={{ marginRight: 6 }} /> Add Bookmark (Page {currentPageIndex + 1})
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div
          data-testid="add-bookmark-form"
          style={{
            padding: 12,
            backgroundColor: 'var(--bg-muted)',
            borderBottom: '1px solid var(--bg-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <input
            data-testid="new-bookmark-title-input"
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Bookmark title..."
            autoFocus
            style={{
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              fontSize: 13
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <Button size="sm" variant="secondary" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
            <Button
              data-testid="confirm-add-bookmark-btn"
              size="sm"
              variant="primary"
              onClick={handleConfirmAdd}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {flatList.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 32,
              color: 'var(--bg-muted-foreground)',
              fontSize: 13
            }}
          >
            No bookmarks found in this document. Click "Add Bookmark" to create chapters and
            sections.
          </div>
        ) : (
          flatList.map(({ item, depth }) => (
            <div
              key={item.id}
              data-testid={`bookmark-item-${item.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 12px 6px ' + (12 + depth * 16) + 'px',
                borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
                cursor: 'pointer',
                backgroundColor:
                  item.pageIndex === currentPageIndex ? 'rgba(59, 130, 246, 0.08)' : 'transparent'
              }}
            >
              {editingId === item.id ? (
                <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                  <input
                    data-testid={`edit-title-input-${item.id}`}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      borderRadius: 4,
                      border: '1px solid var(--bg-border)',
                      fontSize: 12
                    }}
                  />
                  <input
                    data-testid={`edit-page-input-${item.id}`}
                    type="number"
                    min="1"
                    max={totalPages}
                    value={editingPage}
                    onChange={(e) => setEditingPage(parseInt(e.target.value, 10) || 1)}
                    style={{
                      width: 50,
                      padding: '4px 6px',
                      borderRadius: 4,
                      border: '1px solid var(--bg-border)',
                      fontSize: 12
                    }}
                  />
                  <button
                    data-testid={`save-edit-btn-${item.id}`}
                    type="button"
                    onClick={() => handleSaveEdit(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#16a34a',
                      padding: 4
                    }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#ef4444',
                      padding: 4
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    data-testid={`bookmark-jump-${item.id}`}
                    onClick={() => onJumpToPage(item.pageIndex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flex: 1,
                      overflow: 'hidden'
                    }}
                  >
                    <ChevronRight
                      size={12}
                      style={{ color: 'var(--bg-muted-foreground)', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.title}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--bg-muted-foreground)',
                        marginLeft: 'auto',
                        paddingRight: 8
                      }}
                    >
                      p. {item.pageIndex + 1}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      data-testid={`add-child-btn-${item.id}`}
                      type="button"
                      title="Add child section"
                      onClick={() => handleStartAdd(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--bg-muted-foreground)',
                        padding: 4
                      }}
                    >
                      <Plus size={13} />
                    </button>
                    <button
                      data-testid={`edit-btn-${item.id}`}
                      type="button"
                      title="Edit"
                      onClick={() => handleStartEdit(item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--bg-muted-foreground)',
                        padding: 4
                      }}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      data-testid={`delete-btn-${item.id}`}
                      type="button"
                      title="Delete"
                      onClick={() => handleDelete(item.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: 4
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
