import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, X, Check } from 'lucide-react';
import type { AnnotationObject } from '@rhypdf/pdf-model';

export interface StickyNotePopupProps {
  annotation: AnnotationObject;
  position: { x: number; y: number }; // CSS coordinates
  onUpdateContent: (id: string, newContent: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const StickyNotePopup: React.FC<StickyNotePopupProps> = ({
  annotation,
  position,
  onUpdateContent,
  onDelete,
  onClose
}) => {
  const { t } = useTranslation();
  const [content, setContent] = useState(annotation.contents ?? '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    onUpdateContent(annotation.id, content);
    setIsEditing(false);
  };

  const formattedDate = annotation.createdAt ? new Date(annotation.createdAt).toLocaleString() : '';

  return (
    <div
      data-testid="sticky-note-popup"
      style={{
        position: 'absolute',
        left: position.x + 30,
        top: position.y - 10,
        width: 260,
        backgroundColor: '#fef08a', // warm yellow
        border: '1px solid #facc15',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
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
          padding: '6px 10px',
          borderBottom: '1px solid #eab308',
          backgroundColor: '#fde047'
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: '#713f12' }}>
          {annotation.author ?? 'Comment'}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            data-testid="btn-delete-sticky-note"
            onClick={() => onDelete(annotation.id)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#854d0e',
              padding: 2
            }}
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
          <button
            data-testid="btn-close-sticky-note"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: '#854d0e',
              padding: 2
            }}
            title="Close"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isEditing ? (
          <textarea
            data-testid="textarea-sticky-note"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            autoFocus
            style={{
              width: '100%',
              padding: 6,
              fontSize: 12,
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #ca8a04',
              backgroundColor: '#fef9c3',
              boxSizing: 'border-box',
              resize: 'none'
            }}
          />
        ) : (
          <p
            data-testid="text-sticky-note-content"
            onClick={() => setIsEditing(true)}
            style={{
              margin: 0,
              fontSize: 12,
              color: '#422006',
              lineHeight: 1.4,
              cursor: 'text',
              minHeight: 48,
              whiteSpace: 'pre-wrap'
            }}
          >
            {content || t('editor.annotations.emptyNote', { defaultValue: 'Click to add note...' })}
          </p>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 4
          }}
        >
          <span style={{ fontSize: 10, color: '#854d0e' }}>{formattedDate}</span>
          {isEditing && (
            <button
              data-testid="btn-save-sticky-note"
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: '#ca8a04',
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Check size={11} />
              <span>{t('common.save', { defaultValue: 'Save' })}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
