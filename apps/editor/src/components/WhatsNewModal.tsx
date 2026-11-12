import React, { useState } from 'react';
import { Sparkles, X, CheckCircle, ShieldCheck, Cpu, Type, Layers, Globe } from 'lucide-react';

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsNewModal({ isOpen, onClose }: WhatsNewModalProps): React.JSX.Element | null {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('rhypdf:whats_new:dismissed', '1.0.0');
      } catch {
        // Ignore storage errors
      }
    }
    onClose();
  };

  const features = [
    {
      icon: <Type size={20} color="#2563eb" />,
      title: 'In-Place Direct Text Editing',
      description:
        'Click any text to edit inline with accurate font matching, metrics detection, and automatic text line reflow.'
    },
    {
      icon: <Layers size={20} color="#0284c7" />,
      title: 'Image Tools & Geometry Snapping',
      description:
        'Select, move, resize, crop, rotate, replace, and delete images with magnetic alignment guides and haptic feedback.'
    },
    {
      icon: <Cpu size={20} color="#8b5cf6" />,
      title: 'Built-in On-Device OCR',
      description:
        'Scan images and flattened documents with Tesseract WebAssembly to generate searchable text without internet access.'
    },
    {
      icon: <ShieldCheck size={20} color="#10b981" />,
      title: '100% Private & Sandboxed',
      description:
        'All PDF parsing and modifications happen exclusively in your browser using OPFS and WebAssembly. No server uploads.'
    },
    {
      icon: <Globe size={20} color="#f59e0b" />,
      title: 'Multi-Language & Accessibility',
      description:
        'Full support for 10 languages (including RTL Arabic), screen reader live announcements, and complete keyboard navigation.'
    }
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      data-testid="whats-new-modal"
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
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') handleClose();
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
          maxWidth: 580,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--bg-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Sparkles size={20} color="#2563eb" />
            </div>
            <div>
              <h2 id="whats-new-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                What&apos;s New in RhyPDF
              </h2>
              <span style={{ fontSize: 13, color: 'var(--bg-muted-foreground, #64748b)' }}>
                Version 1.0 Release Highlights
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="Close what's new dialog"
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

        {/* Features Content */}
        <div
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          {features.map((feat, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 14,
                alignItems: 'flex-start',
                padding: '12px 14px',
                borderRadius: 8,
                backgroundColor: 'var(--bg-muted, #f8fafc)',
                border: '1px solid var(--bg-border, #e2e8f0)'
              }}
            >
              <div style={{ marginTop: 2 }}>{feat.icon}</div>
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px 0' }}>{feat.title}</h4>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--bg-muted-foreground, #64748b)',
                    margin: 0,
                    lineHeight: 1.45
                  }}
                >
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--bg-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-muted, #f8fafc)'
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--bg-muted-foreground, #64748b)',
              cursor: 'pointer'
            }}
          >
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Don&apos;t show again
          </label>
          <button
            onClick={handleClose}
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
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
