import React from 'react';
import { Button } from '@rhypdf/ui';
import { ShieldCheck, Lock, HardDrive, EyeOff, ArrowLeft } from 'lucide-react';

export interface PrivacyPolicyPageProps {
  onBack?: () => void;
}

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div
      data-testid="page-privacy-policy"
      style={{
        padding: '32px 24px',
        maxWidth: 780,
        margin: '0 auto',
        color: 'var(--bg-foreground, #0f172a)'
      }}
    >
      {onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}
        >
          <ArrowLeft size={16} />
          <span>Back</span>
        </Button>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <ShieldCheck size={32} color="#10b981" />
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700 }}>Privacy & Data Architecture</h1>
      </div>

      <p style={{ fontSize: 14, color: 'var(--bg-muted-foreground, #64748b)', marginBottom: 28 }}>
        RhyPDF is built on an uncompromising zero-trust privacy model: your files never leave your
        computer.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, lineHeight: 1.6 }}>
        <section
          style={{
            padding: 18,
            borderRadius: 8,
            backgroundColor: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--bg-border, #e2e8f0)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <HardDrive size={18} color="var(--bg-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              100% Client-Side On-Device Processing
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--bg-muted-foreground, #64748b)' }}>
            Every operation — text rendering, editing, OCR, page manipulation, compression, and
            saving — runs strictly inside your web browser via WebAssembly (PDFium, HarfBuzz,
            Tesseract). No document bytes are ever uploaded or transmitted over the network.
          </p>
        </section>

        <section
          style={{
            padding: 18,
            borderRadius: 8,
            backgroundColor: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--bg-border, #e2e8f0)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <EyeOff size={18} color="#f59e0b" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Zero Tracking of Document Content
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--bg-muted-foreground, #64748b)' }}>
            We do not collect document contents, filenames, metadata, or search queries. Any
            diagnostics are strictly opt-in, anonymous, cookie-less, and content-free.
          </p>
        </section>

        <section
          style={{
            padding: 18,
            borderRadius: 8,
            backgroundColor: 'var(--bg-card, #ffffff)',
            border: '1px solid var(--bg-border, #e2e8f0)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Lock size={18} color="#8b5cf6" />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              Local Encryption & Safe Storage
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--bg-muted-foreground, #64748b)' }}>
            Signatures and local data are protected using WebCrypto PBKDF2 with 100,000 iterations
            and 256-bit AES-GCM encryption. Temporary working copies are saved in your browser's
            private origin filesystem (OPFS) and are wiped upon closing or manual clearing.
          </p>
        </section>
      </div>
    </div>
  );
};
