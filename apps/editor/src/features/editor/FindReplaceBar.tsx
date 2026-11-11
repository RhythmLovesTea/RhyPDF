import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Replace, X, AlertTriangle } from 'lucide-react';
import type { FindReplaceMatch } from '@rhypdf/edit-core';

export interface FindReplaceBarProps {
  isOpen: boolean;
  onClose: () => void;
  matches: FindReplaceMatch[];
  currentIndex: number;
  onSearch: (query: string, options: { caseSensitive: boolean; wholeWord: boolean }) => void;
  onNextMatch: () => void;
  onPrevMatch: () => void;
  onReplaceCurrent: (replacement: string) => void;
  onReplaceAll: (replacement: string) => void;
  hasOverflowWarning?: boolean;
}

export const FindReplaceBar: React.FC<FindReplaceBarProps> = ({
  isOpen,
  onClose,
  matches,
  currentIndex,
  onSearch,
  onNextMatch,
  onPrevMatch,
  onReplaceCurrent,
  onReplaceAll,
  hasOverflowWarning = false
}) => {
  const [query, setQuery] = useState('');
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  if (!isOpen) return null;

  const handleQueryChange = (val: string) => {
    setQuery(val);
    onSearch(val, { caseSensitive, wholeWord });
  };

  const handleCaseToggle = () => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    onSearch(query, { caseSensitive: next, wholeWord });
  };

  const handleWholeWordToggle = () => {
    const next = !wholeWord;
    setWholeWord(next);
    onSearch(query, { caseSensitive, wholeWord: next });
  };

  const totalMatches = matches.length;
  const currentNum = totalMatches > 0 ? currentIndex + 1 : 0;

  return (
    <div
      data-testid="find-replace-bar"
      style={{
        position: 'absolute',
        top: 8,
        right: 16,
        zIndex: 40,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--bg-border)',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 320,
        maxWidth: 400
      }}
    >
      {/* Search Input Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Search size={16} color="var(--bg-muted-foreground)" />
        <input
          data-testid="input-find-text"
          type="text"
          placeholder="Find in document..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (e.shiftKey) onPrevMatch();
              else onNextMatch();
            } else if (e.key === 'Escape') {
              onClose();
            }
          }}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: 13,
            border: '1px solid var(--bg-border)',
            borderRadius: 4,
            backgroundColor: 'transparent',
            color: 'inherit',
            outline: 'none'
          }}
        />
        <span
          data-testid="find-match-counter"
          style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', minWidth: 48, textAlign: 'center' }}
        >
          {totalMatches > 0 ? `${currentNum} of ${totalMatches}` : query ? '0 matches' : ''}
        </span>
        <button
          data-testid="btn-find-prev"
          onClick={onPrevMatch}
          disabled={totalMatches === 0}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: totalMatches > 0 ? 'pointer' : 'default',
            padding: 4,
            color: totalMatches > 0 ? 'inherit' : 'var(--bg-muted-foreground)'
          }}
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp size={16} />
        </button>
        <button
          data-testid="btn-find-next"
          onClick={onNextMatch}
          disabled={totalMatches === 0}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: totalMatches > 0 ? 'pointer' : 'default',
            padding: 4,
            color: totalMatches > 0 ? 'inherit' : 'var(--bg-muted-foreground)'
          }}
          title="Next match (Enter)"
        >
          <ChevronDown size={16} />
        </button>
        <button
          data-testid="btn-close-find"
          onClick={onClose}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}
          title="Close (Esc)"
        >
          <X size={16} />
        </button>
      </div>

      {/* Replace Input Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Replace size={16} color="var(--bg-muted-foreground)" />
        <input
          data-testid="input-replace-text"
          type="text"
          placeholder="Replace with..."
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          style={{
            flex: 1,
            padding: '4px 8px',
            fontSize: 13,
            border: '1px solid var(--bg-border)',
            borderRadius: 4,
            backgroundColor: 'transparent',
            color: 'inherit',
            outline: 'none'
          }}
        />
        <button
          data-testid="btn-replace-one"
          onClick={() => onReplaceCurrent(replacement)}
          disabled={totalMatches === 0}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            border: '1px solid var(--bg-border)',
            borderRadius: 4,
            backgroundColor: 'var(--bg-secondary)',
            cursor: totalMatches > 0 ? 'pointer' : 'default',
            color: totalMatches > 0 ? 'inherit' : 'var(--bg-muted-foreground)'
          }}
        >
          Replace
        </button>
        <button
          data-testid="btn-replace-all"
          onClick={() => onReplaceAll(replacement)}
          disabled={totalMatches === 0}
          style={{
            padding: '4px 8px',
            fontSize: 12,
            border: 'none',
            borderRadius: 4,
            backgroundColor: '#2563eb',
            color: '#ffffff',
            cursor: totalMatches > 0 ? 'pointer' : 'default',
            opacity: totalMatches > 0 ? 1 : 0.5
          }}
        >
          Replace all
        </button>
      </div>

      {/* Options Row (Match Case, Whole Word) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          data-testid="label-match-case"
        >
          <input
            data-testid="checkbox-match-case"
            type="checkbox"
            checked={caseSensitive}
            onChange={handleCaseToggle}
          />
          Match case
        </label>
        <label
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}
          data-testid="label-whole-word"
        >
          <input
            data-testid="checkbox-whole-word"
            type="checkbox"
            checked={wholeWord}
            onChange={handleWholeWordToggle}
          />
          Whole word
        </label>
      </div>

      {/* Overflow Warning Banner (Task 7.18) */}
      {hasOverflowWarning && (
        <div
          data-testid="replace-overflow-warning"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 11,
            color: '#b45309'
          }}
        >
          <AlertTriangle size={14} color="#b45309" />
          <span>Warning: Replacement text overflows original box boundaries.</span>
        </div>
      )}
    </div>
  );
};
