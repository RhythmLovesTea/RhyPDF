import React, { useState, useRef, useEffect } from 'react';
import { Minus, Plus, ChevronDown } from 'lucide-react';

interface FontSizeControlProps {
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  disabled?: boolean;
}

const PRESET_SIZES = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];

export const FontSizeControl: React.FC<FontSizeControlProps> = ({
  fontSize,
  onChangeFontSize,
  disabled = false
}) => {
  const [inputValue, setInputValue] = useState(fontSize.toString());
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const commitValue = (valStr: string) => {
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = Math.max(1, Math.min(500, Math.round(parsed * 10) / 10));
      onChangeFontSize(clamped);
      setInputValue(clamped.toString());
    } else {
      setInputValue(fontSize.toString());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue(inputValue);
      (e.target as HTMLInputElement).blur();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChangeFontSize(Math.min(500, fontSize + 1));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChangeFontSize(Math.max(1, fontSize - 1));
    }
  };

  return (
    <div
      ref={dropdownRef}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        backgroundColor: 'var(--bg-secondary, #f1f5f9)',
        border: '1px solid var(--border-color, #cbd5e1)',
        borderRadius: 4,
        height: 28
      }}
      data-testid="font-size-control"
    >
      {/* Minus stepper */}
      <button
        type="button"
        data-testid="btn-fontsize-minus"
        disabled={disabled || fontSize <= 1}
        onClick={() => onChangeFontSize(Math.max(1, fontSize - 1))}
        style={{
          width: 24,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'var(--text-primary, #0f172a)'
        }}
      >
        <Minus size={12} />
      </button>

      {/* Numeric direct input */}
      <input
        type="text"
        data-testid="input-fontsize"
        disabled={disabled}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={() => commitValue(inputValue)}
        onKeyDown={handleKeyDown}
        style={{
          width: 32,
          height: 24,
          border: 'none',
          outline: 'none',
          textAlign: 'center',
          fontSize: 12,
          fontWeight: 500,
          background: 'transparent',
          color: 'var(--text-primary, #0f172a)'
        }}
      />

      {/* Preset dropdown arrow */}
      <button
        type="button"
        data-testid="btn-fontsize-dropdown"
        disabled={disabled}
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        style={{
          width: 16,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: 0,
          opacity: 0.7
        }}
      >
        <ChevronDown size={12} />
      </button>

      {/* Plus stepper */}
      <button
        type="button"
        data-testid="btn-fontsize-plus"
        disabled={disabled || fontSize >= 500}
        onClick={() => onChangeFontSize(Math.min(500, fontSize + 1))}
        style={{
          width: 24,
          height: 26,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          background: 'transparent',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'var(--text-primary, #0f172a)'
        }}
      >
        <Plus size={12} />
      </button>

      {/* Preset dropdown menu */}
      {isDropdownOpen && (
        <div
          data-testid="fontsize-preset-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 80,
            maxHeight: 200,
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000
          }}
        >
          {PRESET_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              data-testid={`preset-fontsize-${size}`}
              onClick={() => {
                onChangeFontSize(size);
                setIsDropdownOpen(false);
              }}
              style={{
                width: '100%',
                padding: '4px 8px',
                textAlign: 'center',
                fontSize: 12,
                border: 'none',
                backgroundColor: fontSize === size ? '#eff6ff' : '#ffffff',
                color: fontSize === size ? '#2563eb' : '#0f172a',
                cursor: 'pointer'
              }}
            >
              {size}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
