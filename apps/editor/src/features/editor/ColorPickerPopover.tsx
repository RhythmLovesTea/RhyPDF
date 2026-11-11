import React, { useState, useRef, useEffect } from 'react';
import type { ColorRGBA } from '@rhypdf/pdf-model';
import { Pipette, Check, Ban } from 'lucide-react';

interface ColorPickerPopoverProps {
  label: string;
  color: ColorRGBA | null;
  opacity?: number;
  allowNone?: boolean;
  onChangeColor: (color: ColorRGBA | null, opacity?: number) => void;
  onPickFromPage?: () => void;
  disabled?: boolean;
}

const PALETTE_COLORS: string[] = [
  '#000000',
  '#434343',
  '#666666',
  '#999999',
  '#b7b7b7',
  '#cccccc',
  '#d9d9d9',
  '#efefef',
  '#f3f3f3',
  '#ffffff',
  '#980000',
  '#ff0000',
  '#ff9900',
  '#ffff00',
  '#00ff00',
  '#00ffff',
  '#4a86e8',
  '#0000ff',
  '#9900ff',
  '#ff00ff',
  '#e6b8af',
  '#f4cccc',
  '#fce5cd',
  '#fff2cc',
  '#d9ead3',
  '#d0e0e3',
  '#c9daf8',
  '#cfe2f3',
  '#d9d2e9',
  '#ead1dc'
];

function hexToRgba(hex: string, alpha = 255): ColorRGBA {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return { r, g, b, a: alpha };
}

function rgbaToHex(c: ColorRGBA | null): string {
  if (!c) return '#ffffff';
  const r = c.r.toString(16).padStart(2, '0');
  const g = c.g.toString(16).padStart(2, '0');
  const b = c.b.toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  label,
  color,
  opacity = 1.0,
  allowNone = false,
  onChangeColor,
  onPickFromPage,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hexInput, setHexInput] = useState(rgbaToHex(color));
  const [currentOpacity, setCurrentOpacity] = useState(opacity);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHexInput(rgbaToHex(color));
  }, [color]);

  useEffect(() => {
    setCurrentOpacity(opacity);
  }, [opacity]);

  // Load recent colors
  useEffect(() => {
    try {
      const stored = localStorage.getItem('rhypdf_recent_colors');
      if (stored) {
        setRecentColors(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, []);

  const saveRecentColor = (hex: string) => {
    const next = [hex, ...recentColors.filter((c) => c !== hex)].slice(0, 10);
    setRecentColors(next);
    try {
      localStorage.setItem('rhypdf_recent_colors', JSON.stringify(next));
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
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

  const handleSelectHex = (hex: string) => {
    setHexInput(hex);
    saveRecentColor(hex);
    const alpha = Math.round(currentOpacity * 255);
    onChangeColor(hexToRgba(hex, alpha), currentOpacity);
  };

  const handleOpacityChange = (val: number) => {
    setCurrentOpacity(val);
    if (color) {
      const alpha = Math.round(val * 255);
      onChangeColor({ ...color, a: alpha }, val);
    }
  };

  const handleEyeDropper = async () => {
    const globalObj = typeof window !== 'undefined' ? (window as any) : null;
    if (globalObj && 'EyeDropper' in globalObj) {
      try {
        const eyeDropper = new globalObj.EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          handleSelectHex(result.sRGBHex);
        }
      } catch {
        // User cancelled eyedropper
      }
    } else if (onPickFromPage) {
      onPickFromPage();
    }
  };

  const currentColorHex = rgbaToHex(color);

  return (
    <div
      ref={popoverRef}
      style={{ position: 'relative', display: 'inline-block' }}
      data-testid="color-picker-popover"
    >
      <button
        type="button"
        data-testid={`btn-color-picker-${label.toLowerCase().replace(/\s+/g, '-')}`}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        title={label}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 6px',
          height: 28,
          backgroundColor: 'var(--bg-secondary, #f1f5f9)',
          border: '1px solid var(--border-color, #cbd5e1)',
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'pointer'
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            backgroundColor: color ? currentColorHex : 'transparent',
            border: '1px solid rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: color
              ? undefined
              : 'repeating-linear-gradient(45deg, #ccc, #ccc 2px, #fff 2px, #fff 4px)'
          }}
        >
          {!color && <Ban size={10} color="#dc2626" />}
        </div>
      </button>

      {isOpen && (
        <div
          data-testid="color-picker-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 220,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            padding: 8
          }}
        >
          {/* Header & None button if allowed */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 6,
              fontSize: 11,
              fontWeight: 600,
              color: '#475569'
            }}
          >
            <span>{label.toUpperCase()}</span>
            {allowNone && (
              <button
                type="button"
                data-testid="btn-color-none"
                onClick={() => {
                  onChangeColor(null);
                  setIsOpen(false);
                }}
                style={{
                  fontSize: 10,
                  padding: '1px 4px',
                  borderRadius: 3,
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  cursor: 'pointer'
                }}
              >
                None
              </button>
            )}
          </div>

          {/* Palette Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(10, 1fr)',
              gap: 3,
              marginBottom: 8
            }}
          >
            {PALETTE_COLORS.map((hex) => {
              const isSelected = color && currentColorHex.toLowerCase() === hex.toLowerCase();
              return (
                <button
                  key={hex}
                  type="button"
                  data-testid={`palette-color-${hex.replace('#', '')}`}
                  onClick={() => handleSelectHex(hex)}
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: hex,
                    borderRadius: 2,
                    border: '1px solid rgba(0, 0, 0, 0.15)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {isSelected && (
                    <Check
                      size={10}
                      color={
                        ['#ffffff', '#efefef', '#ffff00', '#00ffff'].includes(hex)
                          ? '#000000'
                          : '#ffffff'
                      }
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Recent Colors */}
          {recentColors.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: 3
                }}
              >
                RECENT COLORS
              </div>
              <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                {recentColors.map((hex) => (
                  <button
                    key={`recent-${hex}`}
                    type="button"
                    data-testid={`recent-color-${hex.replace('#', '')}`}
                    onClick={() => handleSelectHex(hex)}
                    style={{
                      width: 16,
                      height: 16,
                      backgroundColor: hex,
                      borderRadius: 2,
                      border: '1px solid rgba(0, 0, 0, 0.15)',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Custom Hex input & Eyedropper */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 8,
              paddingTop: 6,
              borderTop: '1px solid #e2e8f0'
            }}
          >
            <input
              type="text"
              data-testid="input-custom-hex"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onBlur={() => {
                if (/^#[0-9a-fA-F]{6}$/.test(hexInput)) {
                  handleSelectHex(hexInput);
                } else {
                  setHexInput(currentColorHex);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (/^#[0-9a-fA-F]{6}$/.test(hexInput)) {
                    handleSelectHex(hexInput);
                  }
                }
              }}
              style={{
                width: 70,
                fontSize: 11,
                padding: '2px 4px',
                border: '1px solid #cbd5e1',
                borderRadius: 3
              }}
            />

            <button
              type="button"
              data-testid="btn-eyedropper"
              onClick={handleEyeDropper}
              title="Pick color from page (Eyedropper)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 6px',
                fontSize: 11,
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: 3,
                cursor: 'pointer'
              }}
            >
              <Pipette size={12} />
              <span>Pick</span>
            </button>
          </div>

          {/* Opacity slider (Task 8.12) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              color: '#475569'
            }}
          >
            <span>Opacity:</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              data-testid="input-opacity-slider"
              value={currentOpacity}
              onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
              style={{ flex: 1 }}
            />
            <span style={{ width: 30, textAlign: 'right' }}>
              {Math.round(currentOpacity * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
