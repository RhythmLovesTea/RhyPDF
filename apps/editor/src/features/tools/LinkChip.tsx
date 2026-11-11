import React from 'react';
import { ExternalLink, Edit3, Unlink } from 'lucide-react';
import type { ObjectLink } from '@rhypdf/edit-core';

export interface LinkChipProps {
  link: ObjectLink;
  onEdit: () => void;
  onRemove: () => void;
  onNavigatePage?: (pageIndex: number) => void;
  onOpenLink?: (url: string) => void;
  position?: { x: number; y: number };
}

export const LinkChip: React.FC<LinkChipProps> = ({
  link,
  onEdit,
  onRemove,
  onNavigatePage,
  onOpenLink,
  position
}) => {

  const getDisplayText = () => {
    switch (link.target.type) {
      case 'url':
        return link.target.url;
      case 'email':
        return `mailto:${link.target.email}`;
      case 'phone':
        return `tel:${link.target.phone}`;
      case 'page':
        return `Page ${link.target.pageIndex + 1}`;
    }
  };

  const handleOpen = () => {
    if (link.target.type === 'url') {
      if (onOpenLink) {
        onOpenLink(link.target.url);
      } else {
        window.open(link.target.url, '_blank', 'noopener,noreferrer');
      }
    } else if (link.target.type === 'email') {
      window.location.href = `mailto:${link.target.email}`;
    } else if (link.target.type === 'phone') {
      window.location.href = `tel:${link.target.phone}`;
    } else if (link.target.type === 'page' && onNavigatePage) {
      onNavigatePage(link.target.pageIndex);
    }
  };

  const displayText = getDisplayText();
  const truncated = displayText.length > 30 ? displayText.slice(0, 27) + '...' : displayText;

  return (
    <div
      data-testid="link-chip"
      style={{
        position: 'absolute',
        top: position ? position.y : 0,
        left: position ? position.x : 0,
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 8px',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--bg-border)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
        fontSize: 12
      }}
    >
      <button
        data-testid="btn-open-link-chip"
        onClick={handleOpen}
        title={displayText}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          border: 'none',
          background: 'transparent',
          color: 'var(--bg-primary)',
          cursor: 'pointer',
          textDecoration: 'underline',
          maxWidth: 180,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        <span>{truncated}</span>
        <ExternalLink size={12} />
      </button>

      <div style={{ width: 1, height: 14, backgroundColor: 'var(--bg-border)' }} />

      <button
        data-testid="btn-edit-link-chip"
        onClick={onEdit}
        title="Edit link"
        style={{
          display: 'flex',
          alignItems: 'center',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: 'var(--bg-foreground)',
          padding: 2
        }}
      >
        <Edit3 size={13} />
      </button>

      <button
        data-testid="btn-remove-link-chip"
        onClick={onRemove}
        title="Remove link"
        style={{
          display: 'flex',
          alignItems: 'center',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: '#ef4444',
          padding: 2
        }}
      >
        <Unlink size={13} />
      </button>
    </div>
  );
};
