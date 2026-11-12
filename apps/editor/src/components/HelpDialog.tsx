import React, { useState } from 'react';
import {
  HelpCircle,
  X,
  Type,
  Image as ImageIcon,
  ScanText,
  LayoutGrid,
  PenTool,
  CheckCircle
} from 'lucide-react';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type HelpCategory = 'text' | 'image' | 'ocr' | 'pages' | 'signatures';

export function HelpDialog({ isOpen, onClose }: HelpDialogProps): React.JSX.Element | null {
  const [activeTab, setActiveTab] = useState<HelpCategory>('text');

  if (!isOpen) return null;

  const categories: Array<{ id: HelpCategory; label: string; icon: React.ReactNode }> = [
    { id: 'text', label: 'Edit Text', icon: <Type size={16} /> },
    { id: 'image', label: 'Images', icon: <ImageIcon size={16} /> },
    { id: 'ocr', label: 'OCR Scan', icon: <ScanText size={16} /> },
    { id: 'pages', label: 'Organize Pages', icon: <LayoutGrid size={16} /> },
    { id: 'signatures', label: 'Signatures & Forms', icon: <PenTool size={16} /> }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-guide-title"
      data-testid="help-guide-dialog"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1px solid var(--bg-border, #e2e8f0)',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          width: '100%',
          maxWidth: 720,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--bg-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <HelpCircle size={18} color="#2563eb" />
            </div>
            <div>
              <h2 id="help-guide-title" style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>
                Feature Guides &amp; Video Clips
              </h2>
              <span style={{ fontSize: 13, color: 'var(--bg-muted-foreground, #64748b)' }}>
                Learn how to get the most out of RhyPDF
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close help dialog"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 6,
              color: 'var(--bg-muted-foreground, #64748b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab selector */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '10px 24px',
            borderBottom: '1px solid var(--bg-border, #e2e8f0)',
            backgroundColor: 'var(--bg-muted, #f8fafc)',
            overflowX: 'auto'
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveTab(cat.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                backgroundColor: activeTab === cat.id ? '#ffffff' : 'transparent',
                color: activeTab === cat.id ? '#2563eb' : 'var(--bg-muted-foreground, #64748b)',
                boxShadow: activeTab === cat.id ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'
              }}
            >
              {cat.icon}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'text' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px 0' }}>
                In-Place Direct Text Editing
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--bg-muted-foreground, #64748b)',
                  lineHeight: 1.5,
                  margin: '0 0 16px 0'
                }}
              >
                Double-click or press Enter on any text block on the page to start editing. The
                editor detects the exact original font, baseline, and point size.
              </p>
              {/* Animated clip simulation */}
              <div
                style={{
                  height: 140,
                  backgroundColor: '#0f172a',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#ffffff',
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Type size={18} color="#38bdf8" />
                  <span style={{ fontFamily: 'monospace', fontSize: 14 }}>
                    &ldquo;Invoice #40291 for Acme Corp&rdquo;
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Tip: Use Ctrl+B, Ctrl+I, Ctrl+U to format selected spans instantly.
                </div>
              </div>
              <ul
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary, #334155)',
                  margin: 0,
                  paddingLeft: 20,
                  lineHeight: 1.6
                }}
              >
                <li>
                  Press <strong>Tab</strong> to cycle between text blocks on the page.
                </li>
                <li>
                  Press <strong>Escape</strong> to finish editing and commit your changes.
                </li>
                <li>
                  Fonts not embedded in the document fall back smoothly to clean metrics-matched
                  system fonts.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'image' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px 0' }}>
                Image Manipulation &amp; Snapping
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--bg-muted-foreground, #64748b)',
                  lineHeight: 1.5,
                  margin: '0 0 16px 0'
                }}
              >
                Switch to Image Mode to select, move, scale, rotate, crop, replace, and delete
                graphics on the page.
              </p>
              <div
                style={{
                  height: 140,
                  backgroundColor: '#0f172a',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#ffffff',
                  marginBottom: 16
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <ImageIcon size={20} color="#38bdf8" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    Magnetic Snap Alignment Active
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Hold Shift while dragging corners to maintain aspect ratio.
                </div>
              </div>
              <ul
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary, #334155)',
                  margin: 0,
                  paddingLeft: 20,
                  lineHeight: 1.6
                }}
              >
                <li>
                  Drag bounding box handles to resize; arrow keys nudge by 1pt (Shift+arrows for
                  10pt).
                </li>
                <li>
                  Click <strong>Crop</strong> to adjust the visible rect without altering original
                  image data.
                </li>
                <li>
                  Haptic vibration pulses whenever an object snaps to page centers or neighboring
                  object boundaries.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'ocr' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px 0' }}>
                On-Device WebAssembly OCR
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--bg-muted-foreground, #64748b)',
                  lineHeight: 1.5,
                  margin: '0 0 16px 0'
                }}
              >
                Automatically turn scanned PDFs or photographed documents into editable or
                searchable text.
              </p>
              <div
                style={{
                  height: 140,
                  backgroundColor: '#0f172a',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#ffffff',
                  marginBottom: 16
                }}
              >
                <ScanText size={24} color="#10b981" style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Tesseract.js WASM Engine</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  100% Client-Side. No network calls or OCR telemetry.
                </div>
              </div>
              <ul
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary, #334155)',
                  margin: 0,
                  paddingLeft: 20,
                  lineHeight: 1.6
                }}
              >
                <li>
                  RhyPDF detects scanned pages upon opening and displays a convenient prompt banner.
                </li>
                <li>
                  Choose between <strong>Editable Text Blocks</strong> or{' '}
                  <strong>Invisible Searchable Text Layer</strong>.
                </li>
                <li>Review confidence scores and correct low-confidence words before applying.</li>
              </ul>
            </div>
          )}

          {activeTab === 'pages' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px 0' }}>Page Organizer</h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--bg-muted-foreground, #64748b)',
                  lineHeight: 1.5,
                  margin: '0 0 16px 0'
                }}
              >
                Reorder, rotate, extract, split, or remove pages from multi-page documents.
              </p>
              <div
                style={{
                  height: 140,
                  backgroundColor: '#0f172a',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#ffffff',
                  marginBottom: 16
                }}
              >
                <LayoutGrid size={24} color="#f59e0b" style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>Drag-and-Drop Thumbnail Grid</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Reorder pages instantly or extract single pages as separate PDFs.
                </div>
              </div>
              <ul
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary, #334155)',
                  margin: 0,
                  paddingLeft: 20,
                  lineHeight: 1.6
                }}
              >
                <li>Rotate pages 90° clockwise or counter-clockwise with a single click.</li>
                <li>Insert blank pages or merge additional PDF documents.</li>
                <li>
                  All page operations update your working session with full undo / redo support.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'signatures' && (
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px 0' }}>
                Signatures &amp; Form Filling
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--bg-muted-foreground, #64748b)',
                  lineHeight: 1.5,
                  margin: '0 0 16px 0'
                }}
              >
                Sign agreements and fill standard AcroForms directly without printing or scanning.
              </p>
              <div
                style={{
                  height: 140,
                  backgroundColor: '#0f172a',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#ffffff',
                  marginBottom: 16
                }}
              >
                <PenTool size={24} color="#ec4899" style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  Vector Signature Capture &amp; Stamps
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Draw, type, or upload transparent PNG signatures saved locally.
                </div>
              </div>
              <ul
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary, #334155)',
                  margin: 0,
                  paddingLeft: 20,
                  lineHeight: 1.6
                }}
              >
                <li>AcroForm text fields, checkboxes, and radio buttons are fully interactive.</li>
                <li>Form values are baked into the PDF document stream upon saving.</li>
                <li>
                  Signatures are stored in browser IndexedDB and never transmitted over the
                  internet.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--bg-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            backgroundColor: 'var(--bg-muted, #f8fafc)'
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <CheckCircle size={16} />
            Close Help
          </button>
        </div>
      </div>
    </div>
  );
}
