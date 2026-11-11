import React, { useState, useRef, useEffect } from 'react';
import { AlignJustify, Minus, Plus } from 'lucide-react';

interface SpacingPopoverProps {
  lineSpacing: number;
  letterSpacing: number;
  paragraphSpacing: number;
  onChangeSpacing: (spacing: {
    lineSpacing?: number;
    letterSpacing?: number;
    paragraphSpacing?: number;
  }) => void;
  disabled?: boolean;
}

const LINE_SPACING_PRESETS = [1.0, 1.15, 1.5, 2.0];

export const SpacingPopover: React.FC<SpacingPopoverProps> = ({
  lineSpacing,
  letterSpacing,
  paragraphSpacing,
  onChangeSpacing,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={popoverRef}
      style={{ position: 'relative', display: 'inline-block' }}
      data-testid="spacing-popover"
    >
      <button
        type="button"
        data-testid="btn-spacing-popover"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        title="Line and paragraph spacing"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 6px',
          height: 28,
          backgroundColor: 'var(--bg-secondary, #f1f5f9)',
          border: '1px solid var(--border-color, #cbd5e1)',
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'var(--text-primary, #0f172a)'
        }}
      >
        <AlignJustify size={14} />
      </button>

      {isOpen && (
        <div
          data-testid="spacing-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            width: 200,
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            padding: 8
          }}
        >
          {/* Line spacing presets */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#64748b',
                marginBottom: 4
              }}
            >
              LINE SPACING
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {LINE_SPACING_PRESETS.map((ls) => (
                <button
                  key={ls}
                  type="button"
                  data-testid={`btn-linespacing-${ls}`}
                  onClick={() => onChangeSpacing({ lineSpacing: ls })}
                  style={{
                    flex: 1,
                    padding: '3px 0',
                    fontSize: 11,
                    border: '1px solid',
                    borderColor: lineSpacing === ls ? '#2563eb' : '#cbd5e1',
                    backgroundColor: lineSpacing === ls ? '#dbeafe' : '#ffffff',
                    color: lineSpacing === ls ? '#1d4ed8' : '#0f172a',
                    borderRadius: 3,
                    cursor: 'pointer'
                  }}
                >
                  {ls}
                </button>
              ))}
            </div>
          </div>

          {/* Letter spacing */}
          <div style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#64748b',
                marginBottom: 4
              }}
            >
              CHARACTER SPACING
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                padding: '2px 4px'
              }}
            >
              <button
                type="button"
                data-testid="btn-charspacing-minus"
                onClick={() =>
                  onChangeSpacing({ letterSpacing: Math.max(-5, letterSpacing - 0.5) })
                }
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                <Minus size={12} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 500 }}>
                {letterSpacing > 0 ? `+${letterSpacing}pt` : `${letterSpacing}pt`}
              </span>
              <button
                type="button"
                data-testid="btn-charspacing-plus"
                onClick={() =>
                  onChangeSpacing({ letterSpacing: Math.min(20, letterSpacing + 0.5) })
                }
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Paragraph spacing */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#64748b',
                marginBottom: 4
              }}
            >
              PARAGRAPH SPACING
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: 4,
                padding: '2px 4px'
              }}
            >
              <button
                type="button"
                data-testid="btn-paraspacing-minus"
                onClick={() =>
                  onChangeSpacing({ paragraphSpacing: Math.max(0, paragraphSpacing - 2) })
                }
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                <Minus size={12} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 500 }}>{paragraphSpacing}pt</span>
              <button
                type="button"
                data-testid="btn-paraspacing-plus"
                onClick={() =>
                  onChangeSpacing({ paragraphSpacing: Math.min(50, paragraphSpacing + 2) })
                }
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 2
                }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
