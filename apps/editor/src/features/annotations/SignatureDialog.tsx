import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@rhypdf/ui';
import { PenTool, Type, Upload, Trash2, Check, Lock } from 'lucide-react';
import type { SignatureMode, StoredSignatureRecord } from '@rhypdf/edit-core';
import {
  saveStoredSignature,
  loadStoredSignatures,
  deleteStoredSignature
} from '@rhypdf/edit-core';
import type { Rect, ColorRGBA } from '@rhypdf/pdf-model';

export interface SignatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSignature: (options: {
    mode: SignatureMode;
    data: string;
    fontFamily?: string;
    bounds: Rect;
    color?: ColorRGBA;
  }) => void;
  defaultPosition?: { x: number; y: number };
}

const SCRIPT_FONTS = [
  { name: 'Dancing Script', label: 'Dancing Script (Fluid Cursive)', family: "'Dancing Script', cursive" },
  { name: 'Caveat', label: 'Caveat (Casual Handwriting)', family: "'Caveat', cursive" },
  { name: 'Pacifico', label: 'Pacifico (Brush Script)', family: "'Pacifico', cursive" },
  { name: 'Great Vibes', label: 'Great Vibes (Formal Calligraphy)', family: "'Great Vibes', cursive" },
  { name: 'Homemade Apple', label: 'Homemade Apple (Clean Pen)', family: "'Homemade Apple', cursive" }
];

export const SignatureDialog: React.FC<SignatureDialogProps> = ({
  isOpen,
  onClose,
  onInsertSignature,
  defaultPosition = { x: 150, y: 350 }
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(SCRIPT_FONTS[0]!.name);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);
  const [saveLocally, setSaveLocally] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [savedSignatures, setSavedSignatures] = useState<StoredSignatureRecord[]>([]);

  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [drawColor, setDrawColor] = useState('#0f172a');

  // Load saved signatures on open
  useEffect(() => {
    if (isOpen) {
      loadStoredSignatures(passphrase || undefined).then((list) => {
        setSavedSignatures(list);
      });
    }
  }, [isOpen, passphrase]);

  // Handle pointer drawing on canvas
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 2.5;

    isDrawingRef.current = true;
    setHasDrawn(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setUploadedImageUri(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteSavedSignature = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteStoredSignature(id);
    const updated = await loadStoredSignatures(passphrase || undefined);
    setSavedSignatures(updated);
  };

  const handleApplySavedSignature = (sig: StoredSignatureRecord) => {
    onInsertSignature({
      mode: sig.mode,
      data: sig.data,
      fontFamily: sig.fontFamily,
      bounds: {
        left: defaultPosition.x,
        bottom: defaultPosition.y - 60,
        right: defaultPosition.x + 180,
        top: defaultPosition.y
      }
    });
    onClose();
  };

  const handleInsert = async () => {
    let finalData = '';
    let chosenFont: string | undefined = undefined;

    if (mode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) return;
      finalData = canvas.toDataURL('image/png');
    } else if (mode === 'type') {
      if (!typedName.trim()) return;
      finalData = typedName.trim();
      chosenFont = selectedFont;
    } else if (mode === 'upload') {
      if (!uploadedImageUri) return;
      finalData = uploadedImageUri;
    }

    if (!finalData) return;

    // Optional local storage encryption
    if (saveLocally) {
      await saveStoredSignature(
        {
          id: `sig-${Date.now()}`,
          label: mode === 'type' ? typedName : `Signature (${new Date().toLocaleDateString()})`,
          mode,
          data: finalData,
          fontFamily: chosenFont
        },
        passphrase || undefined
      );
    }

    onInsertSignature({
      mode,
      data: finalData,
      fontFamily: chosenFont,
      bounds: {
        left: defaultPosition.x,
        bottom: defaultPosition.y - 60,
        right: defaultPosition.x + (mode === 'type' ? Math.max(typedName.length * 16, 160) : 180),
        top: defaultPosition.y
      }
    });

    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={t('editor.annotations.signatures', { defaultValue: 'Add Signature' })}
    >
      <div data-testid="signature-dialog" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Mode Selector Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-secondary)',
            padding: 4,
            borderRadius: 'var(--radius-md)',
            gap: 4
          }}
        >
          <button
            data-testid="tab-sig-draw"
            onClick={() => setMode('draw')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: mode === 'draw' ? 600 : 400,
              backgroundColor: mode === 'draw' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'draw' ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <PenTool size={16} />
            <span>{t('editor.annotations.drawSignature', { defaultValue: 'Draw' })}</span>
          </button>
          <button
            data-testid="tab-sig-type"
            onClick={() => setMode('type')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: mode === 'type' ? 600 : 400,
              backgroundColor: mode === 'type' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'type' ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <Type size={16} />
            <span>{t('editor.annotations.typeSignature', { defaultValue: 'Type' })}</span>
          </button>
          <button
            data-testid="tab-sig-upload"
            onClick={() => setMode('upload')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: mode === 'upload' ? 600 : 400,
              backgroundColor: mode === 'upload' ? 'var(--bg-card)' : 'transparent',
              color: mode === 'upload' ? 'var(--bg-primary)' : 'inherit',
              cursor: 'pointer'
            }}
          >
            <Upload size={16} />
            <span>{t('editor.annotations.uploadSignature', { defaultValue: 'Upload' })}</span>
          </button>
        </div>

        {/* Tab 1: Draw */}
        {mode === 'draw' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{
                position: 'relative',
                border: '1.5px dashed var(--bg-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#ffffff',
                touchAction: 'none'
              }}
            >
              <canvas
                ref={canvasRef}
                data-testid="canvas-signature-draw"
                width={420}
                height={160}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ width: '100%', height: 160, display: 'block', cursor: 'crosshair' }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 12,
                  right: 12,
                  borderBottom: '1px solid #cbd5e1',
                  pointerEvents: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--bg-muted)' }}>Color:</span>
                <input
                  data-testid="input-sig-color"
                  type="color"
                  value={drawColor}
                  onChange={(e) => setDrawColor(e.target.value)}
                  style={{ width: 26, height: 26, border: 'none', padding: 0, cursor: 'pointer' }}
                />
              </div>
              <button
                data-testid="btn-clear-sig-canvas"
                onClick={handleClearCanvas}
                style={{
                  fontSize: 12,
                  color: 'var(--bg-muted)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                {t('common.clear', { defaultValue: 'Clear' })}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Type */}
        {mode === 'type' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              data-testid="input-sig-typed-name"
              type="text"
              placeholder={t('editor.annotations.typeNamePlaceholder', { defaultValue: 'Type your full name...' })}
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                fontSize: 14,
                boxSizing: 'border-box'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SCRIPT_FONTS.map((font) => {
                const isSelected = selectedFont === font.name;
                return (
                  <div
                    key={font.name}
                    data-testid={`option-font-${font.name.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setSelectedFont(font.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${isSelected ? 'var(--bg-primary)' : 'var(--bg-border)'}`,
                      backgroundColor: isSelected ? 'var(--bg-secondary)' : 'var(--bg-card)',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontFamily: font.family, fontSize: 22, color: '#0f172a' }}>
                      {typedName || 'Your Signature'}
                    </span>
                    {isSelected && <Check size={16} color="var(--bg-primary)" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Upload */}
        {mode === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              data-testid="input-sig-upload-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageFileChange}
              style={{ fontSize: 13 }}
            />
            {uploadedImageUri && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: 12,
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <img
                  src={uploadedImageUri}
                  alt="Signature Preview"
                  style={{ maxHeight: 100, objectFit: 'contain' }}
                />
              </div>
            )}
          </div>
        )}

        {/* Encrypted Local Storage Options */}
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              data-testid="checkbox-save-signature-locally"
              type="checkbox"
              checked={saveLocally}
              onChange={(e) => setSaveLocally(e.target.checked)}
            />
            <span>{t('editor.annotations.saveSignatureLocally', { defaultValue: 'Save signature for future use' })}</span>
          </label>

          {saveLocally && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowPassphraseInput((v) => !v)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  color: 'var(--bg-primary)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <Lock size={12} />
                <span>
                  {showPassphraseInput
                    ? t('editor.annotations.hidePassphrase', { defaultValue: 'Using custom passphrase' })
                    : t('editor.annotations.protectPassphrase', { defaultValue: 'Encrypt with optional passphrase (AES-GCM)' })}
                </span>
              </button>
              {showPassphraseInput && (
                <input
                  data-testid="input-sig-encryption-passphrase"
                  type="password"
                  placeholder={t('editor.annotations.passphrasePlaceholder', { defaultValue: 'Enter encryption passphrase...' })}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--bg-border)',
                    fontSize: 12
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Saved Signatures List */}
        {savedSignatures.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bg-muted)' }}>
              {t('editor.annotations.savedSignatures', { defaultValue: 'Saved Signatures' })}
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {savedSignatures.map((sig) => (
                <div
                  key={sig.id}
                  data-testid={`saved-sig-${sig.id}`}
                  onClick={() => handleApplySavedSignature(sig)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--bg-border)',
                    backgroundColor: 'var(--bg-card)',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  <span>{sig.label}</span>
                  <button
                    onClick={(e) => handleDeleteSavedSignature(sig.id, e)}
                    style={{ border: 'none', background: 'transparent', padding: 2, cursor: 'pointer', color: 'var(--bg-muted)' }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-secondary)',
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </button>
          <button
            data-testid="btn-insert-signature"
            onClick={handleInsert}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--bg-primary)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: 13
            }}
          >
            {t('common.insert', { defaultValue: 'Insert Signature' })}
          </button>
        </div>
      </div>
    </Dialog>
  );
};
