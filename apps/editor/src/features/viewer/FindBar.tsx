import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { THEME_TOKENS, IconButton } from '@rhypdf/ui';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { SearchOptions } from './text-search';

export interface FindBarProps {
  isOpen: boolean;
  initialQuery?: string;
  totalMatches: number;
  currentMatchIndex: number; // 0-indexed, -1 if no match
  onSearch: (query: string, options: SearchOptions) => void;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onClose: () => void;
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
}

export const FindBar: React.FC<FindBarProps> = ({
  isOpen,
  initialQuery = '',
  totalMatches,
  currentMatchIndex,
  onSearch,
  onNextMatch,
  onPrevMatch,
  onClose,
  theme = 'light',
  className = '',
  style
}) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState<string>(initialQuery);
  const [matchCase, setMatchCase] = useState<boolean>(false);
  const [wholeWord, setWholeWord] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isOpen]);

  // Trigger search on query or options change
  const triggerSearch = useCallback(
    (newQuery: string, mc: boolean, ww: boolean) => {
      onSearch(newQuery, { matchCase: mc, wholeWord: ww });
    },
    [onSearch]
  );

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    triggerSearch(val, matchCase, wholeWord);
  };

  const toggleMatchCase = () => {
    const updated = !matchCase;
    setMatchCase(updated);
    triggerSearch(query, updated, wholeWord);
  };

  const toggleWholeWord = () => {
    const updated = !wholeWord;
    setWholeWord(updated);
    triggerSearch(query, matchCase, updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        onPrevMatch();
      } else {
        onNextMatch();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';
  const hasQuery = query.trim().length > 0;
  const matchDisplay =
    hasQuery && totalMatches > 0
      ? t('editor.viewer.matchesCount', {
          current: currentMatchIndex + 1,
          total: totalMatches,
          defaultValue: `${currentMatchIndex + 1} of ${totalMatches}`
        })
      : hasQuery
        ? t('editor.viewer.noMatches', { defaultValue: 'No matches' })
        : '';

  return (
    <div
      data-testid="find-bar-container"
      role="search"
      aria-label={t('editor.viewer.findPlaceholder', { defaultValue: 'Find in document' })}
      className={`find-bar ${className}`}
      style={{
        position: 'absolute',
        top: 16,
        right: 24,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: THEME_TOKENS.radius.md,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        border: isDark ? '1px solid #334155' : '1px solid #cbd5e1',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        color: isDark ? '#f8fafc' : '#0f172a',
        fontSize: 13,
        ...style
      }}
    >
      <Search size={15} style={{ color: isDark ? '#94a3b8' : '#64748b' }} />

      <input
        ref={inputRef}
        data-testid="find-input-field"
        type="text"
        value={query}
        placeholder={t('editor.viewer.findPlaceholder', { defaultValue: 'Find in document...' })}
        onChange={handleQueryChange}
        onKeyDown={handleKeyDown}
        style={{
          border: 'none',
          outline: 'none',
          width: 160,
          fontSize: 13,
          backgroundColor: 'transparent',
          color: isDark ? '#f8fafc' : '#0f172a'
        }}
      />

      {matchDisplay && (
        <span
          data-testid="find-match-counter"
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: totalMatches > 0 ? (isDark ? '#94a3b8' : '#64748b') : '#ef4444',
            marginRight: 4
          }}
        >
          {matchDisplay}
        </span>
      )}

      {/* Prev / Next buttons */}
      <IconButton
        data-testid="find-prev-button"
        aria-label={t('editor.viewer.findPrevious', { defaultValue: 'Previous match' })}
        icon={<ChevronUp size={15} />}
        size="sm"
        disabled={totalMatches === 0}
        onClick={onPrevMatch}
      />
      <IconButton
        data-testid="find-next-button"
        aria-label={t('editor.viewer.findNext', { defaultValue: 'Next match' })}
        icon={<ChevronDown size={15} />}
        size="sm"
        disabled={totalMatches === 0}
        onClick={onNextMatch}
      />

      {/* Match Case option button */}
      <button
        data-testid="find-option-match-case"
        type="button"
        title={t('editor.viewer.matchCase', { defaultValue: 'Match case' })}
        onClick={toggleMatchCase}
        style={{
          padding: '2px 5px',
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 3,
          border: matchCase ? '1px solid #2563eb' : '1px solid transparent',
          backgroundColor: matchCase ? (isDark ? '#1e3a8a' : '#dbeafe') : 'transparent',
          color: matchCase ? '#2563eb' : isDark ? '#94a3b8' : '#64748b',
          cursor: 'pointer'
        }}
      >
        Aa
      </button>

      {/* Whole Word option button */}
      <button
        data-testid="find-option-whole-word"
        type="button"
        title={t('editor.viewer.wholeWord', { defaultValue: 'Whole word' })}
        onClick={toggleWholeWord}
        style={{
          padding: '2px 5px',
          fontSize: 11,
          fontWeight: 700,
          borderRadius: 3,
          border: wholeWord ? '1px solid #2563eb' : '1px solid transparent',
          backgroundColor: wholeWord ? (isDark ? '#1e3a8a' : '#dbeafe') : 'transparent',
          color: wholeWord ? '#2563eb' : isDark ? '#94a3b8' : '#64748b',
          cursor: 'pointer'
        }}
      >
        \b
      </button>

      <div style={{ width: 1, height: 16, backgroundColor: isDark ? '#334155' : '#e2e8f0' }} />

      <IconButton
        data-testid="find-close-button"
        aria-label={t('common.close', { defaultValue: 'Close' })}
        icon={<X size={15} />}
        size="sm"
        onClick={onClose}
      />
    </div>
  );
};
