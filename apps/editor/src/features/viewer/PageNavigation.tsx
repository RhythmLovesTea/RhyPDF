import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { THEME_TOKENS, IconButton } from '@rhypdf/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PageNavigationProps {
  currentPage: number; // 1-indexed
  pageCount: number;
  onPageChange: (pageIndex: number) => void; // 0-indexed
  theme?: 'light' | 'dark';
  className?: string;
  style?: React.CSSProperties;
  enableKeyboardNav?: boolean;
}

export const PageNavigation: React.FC<PageNavigationProps> = ({
  currentPage,
  pageCount,
  onPageChange,
  theme = 'light',
  className = '',
  style,
  enableKeyboardNav = true
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [inputValue, setInputValue] = useState<string>(String(currentPage));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(currentPage));
    }
  }, [currentPage, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handlePrev = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 2);
    }
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < pageCount) {
      onPageChange(currentPage);
    }
  }, [currentPage, pageCount, onPageChange]);

  const handleFirst = useCallback(() => {
    if (pageCount > 0) {
      onPageChange(0);
    }
  }, [pageCount, onPageChange]);

  const handleLast = useCallback(() => {
    if (pageCount > 0) {
      onPageChange(pageCount - 1);
    }
  }, [pageCount, onPageChange]);

  const submitPage = useCallback(() => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, 1), pageCount);
      onPageChange(clamped - 1);
    }
    setIsEditing(false);
  }, [inputValue, pageCount, onPageChange]);

  // Keyboard navigation: PgUp, PgDn, Home, End
  useEffect(() => {
    if (!enableKeyboardNav) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'PageDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Home') {
        e.preventDefault();
        handleFirst();
      } else if (e.key === 'End') {
        e.preventDefault();
        handleLast();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enableKeyboardNav, handleNext, handlePrev, handleFirst, handleLast]);

  const isDark = theme === 'dark';

  return (
    <nav
      data-testid="page-navigation-container"
      role="navigation"
      aria-label={t('editor.viewer.goToPage', { defaultValue: 'Page navigation' })}
      className={`page-navigation ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 6px',
        borderRadius: THEME_TOKENS.radius.sm,
        backgroundColor: isDark ? '#1e293b' : '#ffffff',
        border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
        color: isDark ? '#f8fafc' : '#0f172a',
        fontSize: 13,
        ...style
      }}
    >
      <IconButton
        data-testid="nav-prev-page"
        aria-label={t('editor.viewer.goToPage', { defaultValue: 'Previous page' })}
        icon={<ChevronLeft size={16} />}
        size="sm"
        disabled={currentPage <= 1}
        onClick={handlePrev}
      />

      <div
        data-testid="page-indicator-badge"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '0 4px',
          fontWeight: 500
        }}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            data-testid="page-input-field"
            type="text"
            inputMode="numeric"
            value={inputValue}
            aria-label={t('editor.viewer.goToPage', { defaultValue: 'Go to page' })}
            onChange={(e) => setInputValue(e.target.value)}
            onBlur={submitPage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitPage();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setIsEditing(false);
                setInputValue(String(currentPage));
              }
            }}
            style={{
              width: 36,
              height: 22,
              textAlign: 'center',
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 3,
              border: '1px solid #2563eb',
              backgroundColor: isDark ? '#0f172a' : '#ffffff',
              color: isDark ? '#f8fafc' : '#0f172a',
              outline: 'none'
            }}
          />
        ) : (
          <span
            data-testid="page-number-display"
            title={t('editor.viewer.goToPage', { defaultValue: 'Click to go to page' })}
            onClick={() => setIsEditing(true)}
            style={{
              cursor: 'pointer',
              padding: '1px 5px',
              borderRadius: 3,
              backgroundColor: isDark ? '#334155' : '#f1f5f9',
              minWidth: 24,
              textAlign: 'center'
            }}
          >
            {currentPage}
          </span>
        )}

        <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>/</span>
        <span data-testid="page-count-display">{pageCount}</span>
      </div>

      <IconButton
        data-testid="nav-next-page"
        aria-label={t('editor.viewer.goToPage', { defaultValue: 'Next page' })}
        icon={<ChevronRight size={16} />}
        size="sm"
        disabled={currentPage >= pageCount}
        onClick={handleNext}
      />
    </nav>
  );
};
