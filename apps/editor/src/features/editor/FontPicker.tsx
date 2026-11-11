import React, { useState, useRef, useEffect } from 'react';
import {
  FontCatalog,
  type FontCategory,
  importFontFromDevice
} from '@rhypdf/fonts';
import { Search, Check, ChevronDown, Upload, Clock } from 'lucide-react';

interface FontPickerProps {
  currentFamily: string;
  onSelectFont: (family: string) => void;
  disabled?: boolean;
}

export const FontPicker: React.FC<FontPickerProps> = ({
  currentFamily,
  onSelectFont,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FontCategory | 'all'>('all');
  const [selectedScript, setSelectedScript] = useState<string>('all');
  const [importError, setImportError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const catalog = FontCatalog.getInstance();
  const recentFamilies = catalog.getRecentFamilies();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredFonts = catalog.filter({
    searchQuery,
    category: selectedCategory,
    script: selectedScript
  });

  const handleSelect = (family: string) => {
    catalog.addRecentFont(family);
    onSelectFont(family);
    setIsOpen(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    try {
      const result = await importFontFromDevice(file);
      handleSelect(result.entry.family);
    } catch (err: unknown) {
      setImportError((err as Error).message || 'Failed to import font');
    }
  };

  const currentEntry = catalog.getByFamily(currentFamily);
  const displayLabel = currentEntry?.displayName || currentFamily || 'Roboto';

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block' }}
      data-testid="font-picker-container"
    >
      <button
        type="button"
        data-testid="btn-font-picker"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          padding: '4px 8px',
          height: 28,
          minWidth: 120,
          maxWidth: 160,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: currentFamily,
          backgroundColor: 'var(--bg-secondary, #f1f5f9)',
          border: '1px solid var(--border-color, #cbd5e1)',
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'var(--text-primary, #0f172a)'
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {displayLabel}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
      </button>

      {isOpen && (
        <div
          data-testid="font-picker-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 280,
            maxHeight: 380,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Search bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}
          >
            <Search size={14} color="#64748b" />
            <input
              type="text"
              data-testid="input-font-search"
              placeholder="Search fonts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 12
              }}
            />
          </div>

          {/* Category Filter Chips (Task 8.7) */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: '4px 8px',
              overflowX: 'auto',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc'
            }}
          >
            {(['all', 'sans-serif', 'serif', 'monospace', 'handwriting'] as const).map(
              (cat) => (
                <button
                  key={cat}
                  data-testid={`chip-cat-${cat}`}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '2px 6px',
                    fontSize: 10,
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: selectedCategory === cat ? '#2563eb' : '#cbd5e1',
                    backgroundColor: selectedCategory === cat ? '#dbeafe' : '#ffffff',
                    color: selectedCategory === cat ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {cat === 'all'
                    ? 'All'
                    : cat === 'sans-serif'
                    ? 'Sans'
                    : cat === 'serif'
                    ? 'Serif'
                    : cat === 'monospace'
                    ? 'Mono'
                    : 'Script'}
                </button>
              )
            )}
          </div>

          {/* Script Filter Select */}
          <div
            style={{
              padding: '4px 8px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 11,
              color: '#64748b'
            }}
          >
            <span>Script:</span>
            <select
              data-testid="select-font-script"
              value={selectedScript}
              onChange={(e) => setSelectedScript(e.target.value)}
              style={{
                fontSize: 11,
                padding: '1px 4px',
                borderRadius: 3,
                border: '1px solid #cbd5e1'
              }}
            >
              <option value="all">All Scripts</option>
              <option value="latin">Latin / Cyrillic / Greek</option>
              <option value="arabic">Arabic</option>
              <option value="hebrew">Hebrew</option>
              <option value="devanagari">Devanagari (Hindi)</option>
              <option value="bengali">Bengali</option>
              <option value="tamil">Tamil</option>
              <option value="cjk">CJK (Chinese / Japanese / Korean)</option>
              <option value="thai">Thai</option>
            </select>
          </div>

          {/* Import Error Banner */}
          {importError && (
            <div
              style={{
                padding: '4px 8px',
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                fontSize: 11,
                borderBottom: '1px solid #f87171'
              }}
            >
              {importError}
            </div>
          )}

          {/* Font List */}
          <div style={{ overflowY: 'auto', flex: 1, maxHeight: 220 }}>
            {/* Recent Fonts section (Task 8.7) */}
            {!searchQuery && selectedCategory === 'all' && selectedScript === 'all' && recentFamilies.length > 0 && (
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 8px',
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#64748b',
                    backgroundColor: '#f1f5f9'
                  }}
                >
                  <Clock size={10} />
                  <span>RECENT FONTS</span>
                </div>
                {recentFamilies.map((rec) => {
                  const entry = catalog.getByFamily(rec);
                  const isSelected =
                    currentFamily.toLowerCase() === rec.toLowerCase();
                  return (
                    <button
                      key={`recent-${rec}`}
                      data-testid={`font-option-recent-${rec}`}
                      type="button"
                      onClick={() => handleSelect(rec)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: 13,
                        fontFamily: rec,
                        backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <span>{entry?.displayName || rec}</span>
                      {isSelected && <Check size={14} color="#2563eb" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* All Filtered Fonts */}
            <div
              style={{
                padding: '4px 8px',
                fontSize: 10,
                fontWeight: 600,
                color: '#64748b',
                backgroundColor: '#f1f5f9'
              }}
            >
              <span>AVAILABLE FONTS ({filteredFonts.length})</span>
            </div>

            {filteredFonts.length === 0 ? (
              <div
                style={{
                  padding: 12,
                  textAlign: 'center',
                  fontSize: 12,
                  color: '#64748b'
                }}
              >
                No fonts match filter
              </div>
            ) : (
              filteredFonts.map((font) => {
                const isSelected =
                  currentFamily.toLowerCase() === font.family.toLowerCase();
                return (
                  <button
                    key={font.id}
                    data-testid={`font-option-${font.id}`}
                    type="button"
                    onClick={() => handleSelect(font.family)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 13,
                      fontFamily: font.family,
                      backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div>{font.displayName}</div>
                      {font.metricCompatibleWith && (
                        <span
                          style={{
                            fontSize: 10,
                            color: '#64748b',
                            fontFamily: 'sans-serif'
                          }}
                        >
                          Stand-in for {font.metricCompatibleWith[0]}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check size={14} color="#2563eb" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Import Font from Device button (Task 8.6) */}
          <div
            style={{
              padding: '6px 8px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'center'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ttf,.otf,.woff2"
              style={{ display: 'none' }}
              onChange={handleImportFile}
              data-testid="input-import-font-file"
            />
            <button
              type="button"
              data-testid="btn-import-font"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                fontSize: 11,
                color: '#2563eb',
                backgroundColor: 'transparent',
                border: '1px dashed #93c5fd',
                borderRadius: 4,
                cursor: 'pointer'
              }}
            >
              <Upload size={12} />
              <span>Import font from device...</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
