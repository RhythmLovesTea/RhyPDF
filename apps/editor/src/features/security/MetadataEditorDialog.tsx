import React, { useState, useEffect } from 'react';
import { Button } from '@rhypdf/ui';
import { Tag, Trash2, X, Check } from 'lucide-react';
import type { PdfMetadata } from '@rhypdf/edit-core';

export interface MetadataEditorDialogProps {
  isOpen: boolean;
  initialMetadata: PdfMetadata;
  onClose: () => void;
  onSaveMetadata: (metadata: PdfMetadata) => void;
  onStripMetadata: () => void;
}

export const MetadataEditorDialog: React.FC<MetadataEditorDialogProps> = ({
  isOpen,
  initialMetadata,
  onClose,
  onSaveMetadata,
  onStripMetadata
}) => {
  const [title, setTitle] = useState(initialMetadata.title || '');
  const [author, setAuthor] = useState(initialMetadata.author || '');
  const [subject, setSubject] = useState(initialMetadata.subject || '');
  const [keywordsStr, setKeywordsStr] = useState(initialMetadata.keywords?.join(', ') || '');
  const [creator, setCreator] = useState(initialMetadata.creator || '');
  const [producer, setProducer] = useState(initialMetadata.producer || '');

  useEffect(() => {
    setTitle(initialMetadata.title || '');
    setAuthor(initialMetadata.author || '');
    setSubject(initialMetadata.subject || '');
    setKeywordsStr(initialMetadata.keywords?.join(', ') || '');
    setCreator(initialMetadata.creator || '');
    setProducer(initialMetadata.producer || '');
  }, [initialMetadata]);

  if (!isOpen) return null;

  const handleSave = () => {
    const keywords = keywordsStr
      .split(/[,;\s]+/)
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    onSaveMetadata({
      title,
      author,
      subject,
      keywords,
      creator,
      producer
    });
  };

  return (
    <div
      data-testid="dialog-metadata-editor"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--bg-foreground, #0f172a)',
          borderRadius: 12,
          padding: 24,
          width: '90%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={20} color="var(--bg-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
              Document Properties & Metadata
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bg-muted-foreground, #64748b)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <label
              htmlFor="input-meta-title"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Title
            </label>
            <input
              id="input-meta-title"
              data-testid="input-meta-title"
              type="text"
              placeholder="Document title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'inherit',
                fontSize: 13
              }}
            />
          </div>

          <div>
            <label
              htmlFor="input-meta-author"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Author
            </label>
            <input
              id="input-meta-author"
              data-testid="input-meta-author"
              type="text"
              placeholder="Author or organization"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'inherit',
                fontSize: 13
              }}
            />
          </div>

          <div>
            <label
              htmlFor="input-meta-subject"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Subject / Description
            </label>
            <input
              id="input-meta-subject"
              data-testid="input-meta-subject"
              type="text"
              placeholder="Brief summary or subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'inherit',
                fontSize: 13
              }}
            />
          </div>

          <div>
            <label
              htmlFor="input-meta-keywords"
              style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
            >
              Keywords (Comma-separated)
            </label>
            <input
              id="input-meta-keywords"
              data-testid="input-meta-keywords"
              type="text"
              placeholder="e.g. finance, invoice, 2026"
              value={keywordsStr}
              onChange={(e) => setKeywordsStr(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--bg-border, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'inherit',
                fontSize: 13
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label
                htmlFor="input-meta-creator"
                style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
              >
                Creator Application
              </label>
              <input
                id="input-meta-creator"
                data-testid="input-meta-creator"
                type="text"
                placeholder="Creating application"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--bg-border, #cbd5e1)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  color: 'inherit',
                  fontSize: 13
                }}
              />
            </div>

            <div>
              <label
                htmlFor="input-meta-producer"
                style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}
              >
                PDF Producer
              </label>
              <input
                id="input-meta-producer"
                data-testid="input-meta-producer"
                type="text"
                placeholder="PDF producer"
                value={producer}
                onChange={(e) => setProducer(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--bg-border, #cbd5e1)',
                  backgroundColor: 'var(--bg-card, #ffffff)',
                  color: 'inherit',
                  fontSize: 13
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            data-testid="btn-strip-all-metadata"
            variant="destructive"
            size="sm"
            onClick={onStripMetadata}
            style={{ display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Trash2 size={14} />
            <span>Remove All Metadata</span>
          </Button>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              data-testid="btn-save-metadata"
              variant="primary"
              onClick={handleSave}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={15} />
              <span>Save Metadata</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
