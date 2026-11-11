import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Trash2, ArrowUpRight, X } from 'lucide-react';
import type { AnnotationObject } from '@rhypdf/pdf-model';

export interface CommentsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  annotationsByPage: Map<number, AnnotationObject[]>;
  onJumpToPage: (pageIndex: number) => void;
  onSelectComment?: (pageIndex: number, annotId: string) => void;
  onDeleteComment?: (pageIndex: number, annotId: string) => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  isOpen,
  onClose,
  annotationsByPage,
  onJumpToPage,
  onSelectComment,
  onDeleteComment
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // Collect sticky notes and markup annotations with contents
  const entries: Array<{ pageIndex: number; annot: AnnotationObject }> = [];
  annotationsByPage.forEach((annots, pageIndex) => {
    for (const a of annots) {
      if (a.subType === 'Text' || a.contents || a.customText) {
        entries.push({ pageIndex, annot: a });
      }
    }
  });

  return (
    <div
      data-testid="comments-panel"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 300,
        backgroundColor: 'var(--bg-card)',
        borderLeft: '1px solid var(--bg-border)',
        boxShadow: '-4px 0 20px rgba(0, 0, 0, 0.08)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--bg-border)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={16} color="var(--bg-primary)" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {t('editor.annotations.comments', { defaultValue: 'Comments & Notes' })}
          </span>
          <span
            style={{
              fontSize: 11,
              backgroundColor: 'var(--bg-secondary)',
              padding: '2px 6px',
              borderRadius: 10
            }}
          >
            {entries.length}
          </span>
        </div>
        <button
          data-testid="btn-close-comments-panel"
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
        >
          <X size={16} />
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.length === 0 ? (
          <div
            style={{
              padding: 24,
              textAlign: 'center',
              color: 'var(--bg-muted)',
              fontSize: 13
            }}
          >
            {t('editor.annotations.noComments', { defaultValue: 'No comments or sticky notes yet.' })}
          </div>
        ) : (
          entries.map(({ pageIndex, annot }) => {
            const dateStr = annot.createdAt ? new Date(annot.createdAt).toLocaleDateString() : '';
            return (
              <div
                key={annot.id}
                data-testid={`comment-item-${annot.id}`}
                onClick={() => {
                  onJumpToPage(pageIndex);
                  onSelectComment?.(pageIndex, annot.id);
                }}
                style={{
                  padding: 10,
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bg-primary)' }}>
                    Page {pageIndex + 1} • {annot.author ?? 'Anonymous'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToPage(pageIndex);
                      }}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2 }}
                      title="Jump to page"
                    >
                      <ArrowUpRight size={13} />
                    </button>
                    {onDeleteComment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteComment(pageIndex, annot.id);
                        }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, color: '#dc2626' }}
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {annot.customText && (
                  <div
                    style={{
                      fontSize: 11,
                      fontStyle: 'italic',
                      color: 'var(--bg-muted)',
                      borderLeft: '2px solid var(--bg-border)',
                      paddingLeft: 6,
                      marginTop: 2
                    }}
                  >
                    "{annot.customText}"
                  </div>
                )}

                <div style={{ fontSize: 12, color: 'inherit', marginTop: 2 }}>
                  {annot.contents || (annot.subType === 'Text' ? 'Sticky Note' : annot.subType)}
                </div>

                {dateStr && (
                  <span style={{ fontSize: 10, color: 'var(--bg-muted)', alignSelf: 'flex-end' }}>
                    {dateStr}
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
