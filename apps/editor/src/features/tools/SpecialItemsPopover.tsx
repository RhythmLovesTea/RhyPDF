import React, { useState } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { Calendar, QrCode, Sparkles, ChevronDown } from 'lucide-react';
import type { PathObject } from '@rhypdf/pdf-model';
import type { DateFormatPattern } from '@rhypdf/edit-core';
import { formatCurrentDate, SYMBOL_CATEGORIES, createQrCodePath } from '@rhypdf/edit-core';

export interface SpecialItemsPopoverProps {
  onInsertText: (text: string) => void;
  onInsertPath: (path: PathObject) => void;
  pageWidthPt?: number;
  pageHeightPt?: number;
}

export const SpecialItemsPopover: React.FC<SpecialItemsPopoverProps> = ({
  onInsertText,
  onInsertPath,
  pageWidthPt = 612,
  pageHeightPt = 792
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'date' | 'symbols' | 'qrcode'>('date');

  // Date state
  const [dateFormat, setDateFormat] = useState<DateFormatPattern>('iso');

  // QR state
  const [qrText, setQrText] = useState('https://rhypdf.app');

  // Symbols state
  const [symbolCat, setSymbolCat] = useState('math');

  const handleInsertDate = () => {
    const formatted = formatCurrentDate(dateFormat);
    onInsertText(formatted);
    setIsOpen(false);
  };

  const handleInsertSymbol = (sym: string) => {
    onInsertText(sym);
    setIsOpen(false);
  };

  const handleInsertQr = () => {
    if (!qrText.trim()) return;
    const qrSize = 100;
    const cx = pageWidthPt / 2;
    const cy = pageHeightPt / 2;

    const bounds = {
      left: cx - qrSize / 2,
      bottom: cy - qrSize / 2,
      right: cx + qrSize / 2,
      top: cy + qrSize / 2
    };

    const qrPath = createQrCodePath(qrText.trim(), bounds, 'M');
    onInsertPath(qrPath);
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        data-testid="btn-special-items-menu"
        onClick={() => setIsOpen(!isOpen)}
        title={t('editor.tools.specialItems', 'Insert Special Items')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '6px 10px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--bg-border)',
          backgroundColor: isOpen ? 'var(--bg-secondary)' : 'var(--bg-card)',
          color: 'var(--bg-foreground)',
          cursor: 'pointer',
          fontSize: 13
        }}
      >
        <Sparkles size={16} />
        <span>{t('editor.tools.insert', 'Insert')}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div
          data-testid="popover-special-items"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            zIndex: 1000,
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: 12,
            width: 290,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          {/* Sub tabs */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              borderBottom: '1px solid var(--bg-border)',
              paddingBottom: 6
            }}
          >
            <button
              data-testid="tab-special-date"
              onClick={() => setActiveTab('date')}
              style={{
                flex: 1,
                padding: '4px 0',
                border: 'none',
                borderRadius: 4,
                backgroundColor: activeTab === 'date' ? 'var(--bg-secondary)' : 'transparent',
                fontWeight: activeTab === 'date' ? 600 : 400,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <Calendar size={13} />
              Date
            </button>
            <button
              data-testid="tab-special-symbols"
              onClick={() => setActiveTab('symbols')}
              style={{
                flex: 1,
                padding: '4px 0',
                border: 'none',
                borderRadius: 4,
                backgroundColor: activeTab === 'symbols' ? 'var(--bg-secondary)' : 'transparent',
                fontWeight: activeTab === 'symbols' ? 600 : 400,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <Sparkles size={13} />
              Symbols
            </button>
            <button
              data-testid="tab-special-qr"
              onClick={() => setActiveTab('qrcode')}
              style={{
                flex: 1,
                padding: '4px 0',
                border: 'none',
                borderRadius: 4,
                backgroundColor: activeTab === 'qrcode' ? 'var(--bg-secondary)' : 'transparent',
                fontWeight: activeTab === 'qrcode' ? 600 : 400,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <QrCode size={13} />
              QR Code
            </button>
          </div>

          {activeTab === 'date' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <span>Choose Format:</span>
              <select
                data-testid="select-date-format"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value as DateFormatPattern)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--bg-border)'
                }}
              >
                <option value="iso">ISO (YYYY-MM-DD) — {formatCurrentDate('iso')}</option>
                <option value="us">US (MM/DD/YYYY) — {formatCurrentDate('us')}</option>
                <option value="eu">EU (DD/MM/YYYY) — {formatCurrentDate('eu')}</option>
                <option value="long">Long — {formatCurrentDate('long')}</option>
                <option value="withTime">With Time — {formatCurrentDate('withTime')}</option>
              </select>

              <button
                data-testid="btn-insert-date-confirm"
                onClick={handleInsertDate}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 500,
                  marginTop: 4
                }}
              >
                Insert Date
              </button>
            </div>
          )}

          {activeTab === 'symbols' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Category selector */}
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
                {SYMBOL_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    data-testid={`sym-cat-${cat.id}`}
                    onClick={() => setSymbolCat(cat.id)}
                    style={{
                      padding: '3px 6px',
                      fontSize: 11,
                      borderRadius: 4,
                      border: '1px solid var(--bg-border)',
                      backgroundColor: symbolCat === cat.id ? 'var(--bg-secondary)' : 'transparent',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Symbol grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 4,
                  maxHeight: 140,
                  overflowY: 'auto'
                }}
              >
                {SYMBOL_CATEGORIES.find((c) => c.id === symbolCat)?.symbols.map((sym, idx) => (
                  <button
                    key={idx}
                    data-testid={`btn-symbol-${idx}`}
                    onClick={() => handleInsertSymbol(sym)}
                    style={{
                      height: 32,
                      fontSize: 16,
                      borderRadius: 4,
                      border: '1px solid var(--bg-border)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'qrcode' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <span>Enter Text or URL:</span>
              <input
                data-testid="input-qr-content"
                value={qrText}
                onChange={(e) => setQrText(e.target.value)}
                placeholder="https://example.com"
                style={{
                  padding: '6px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--bg-border)'
                }}
              />

              <div style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>
                Offline pure vector QR Code. Will be placed centered on page.
              </div>

              <button
                data-testid="btn-insert-qr-confirm"
                onClick={handleInsertQr}
                style={{
                  padding: '6px 12px',
                  borderRadius: 4,
                  border: 'none',
                  backgroundColor: 'var(--bg-primary)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontWeight: 500,
                  marginTop: 4
                }}
              >
                Generate & Insert QR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
