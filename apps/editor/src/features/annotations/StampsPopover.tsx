import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X, ShieldAlert, FileText, Ban, Lock, Award, Clock } from 'lucide-react';
import type { StampPresetType } from '@rhypdf/edit-core';
import { STAMP_PRESETS } from '@rhypdf/edit-core';
import type { ColorRGBA, Rect } from '@rhypdf/pdf-model';

export interface StampsPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStamp: (options: {
    stampType: StampPresetType;
    customText?: string;
    customColor?: ColorRGBA;
    imageUri?: string;
    bounds: Rect;
  }) => void;
  defaultPosition?: { x: number; y: number };
}

export const StampsPopover: React.FC<StampsPopoverProps> = ({
  isOpen,
  onClose,
  onSelectStamp,
  defaultPosition = { x: 150, y: 550 }
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'image'>('presets');
  const [customText, setCustomText] = useState('APPROVED');
  const [customColorHex, setCustomColorHex] = useState('#16a34a');
  const [includeDate, setIncludeDate] = useState(true);
  const [imagePreviewUri, setImagePreviewUri] = useState<string | null>(null);

  if (!isOpen) return null;

  const hexToRgba = (hex: string): ColorRGBA => {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    return { r, g, b, a: 255 };
  };

  const handleApplyPreset = (type: StampPresetType) => {
    const preset = STAMP_PRESETS[type];
    onSelectStamp({
      stampType: type,
      customText: preset.label,
      customColor: preset.textColor,
      bounds: {
        left: defaultPosition.x,
        bottom: defaultPosition.y - 50,
        right: defaultPosition.x + 180,
        top: defaultPosition.y
      }
    });
    onClose();
  };

  const handleApplyCustomText = () => {
    const text = includeDate
      ? `${customText.trim().toUpperCase()} • ${new Date().toISOString().split('T')[0]}`
      : customText.trim().toUpperCase();

    onSelectStamp({
      stampType: 'CustomText',
      customText: text,
      customColor: hexToRgba(customColorHex),
      bounds: {
        left: defaultPosition.x,
        bottom: defaultPosition.y - 50,
        right: defaultPosition.x + Math.max(text.length * 11, 160),
        top: defaultPosition.y
      }
    });
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const uri = ev.target?.result as string;
        setImagePreviewUri(uri);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCustomImage = () => {
    if (!imagePreviewUri) return;
    onSelectStamp({
      stampType: 'CustomImage',
      imageUri: imagePreviewUri,
      bounds: {
        left: defaultPosition.x,
        bottom: defaultPosition.y - 80,
        right: defaultPosition.x + 160,
        top: defaultPosition.y
      }
    });
    onClose();
  };

  const presetsList: Array<{ type: StampPresetType; icon: React.ReactNode }> = [
    { type: 'Approved', icon: <Check size={16} /> },
    { type: 'Draft', icon: <FileText size={16} /> },
    { type: 'Confidential', icon: <Lock size={16} /> },
    { type: 'Rejected', icon: <X size={16} /> },
    { type: 'Final', icon: <Award size={16} /> },
    { type: 'Expired', icon: <Clock size={16} /> },
    { type: 'NotApproved', icon: <Ban size={16} /> },
    { type: 'TopSecret', icon: <ShieldAlert size={16} /> }
  ];

  return (
    <div
      data-testid="stamps-popover"
      style={{
        position: 'fixed',
        top: '60px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 360,
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
        border: '1px solid var(--bg-border)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid var(--bg-border)'
        }}
      >
        <span style={{ fontWeight: 600, fontSize: 14 }}>
          {t('editor.annotations.stamps', { defaultValue: 'Rubber Stamps' })}
        </span>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 'var(--radius-sm)'
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--bg-border)',
          backgroundColor: 'var(--bg-secondary)',
          padding: 4,
          gap: 4
        }}
      >
        <button
          data-testid="tab-stamp-presets"
          onClick={() => setActiveTab('presets')}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            fontWeight: activeTab === 'presets' ? 600 : 400,
            backgroundColor: activeTab === 'presets' ? 'var(--bg-card)' : 'transparent',
            cursor: 'pointer'
          }}
        >
          {t('editor.annotations.stampPresets', { defaultValue: 'Standard' })}
        </button>
        <button
          data-testid="tab-stamp-custom"
          onClick={() => setActiveTab('custom')}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            fontWeight: activeTab === 'custom' ? 600 : 400,
            backgroundColor: activeTab === 'custom' ? 'var(--bg-card)' : 'transparent',
            cursor: 'pointer'
          }}
        >
          {t('editor.annotations.stampCustom', { defaultValue: 'Custom Text' })}
        </button>
        <button
          data-testid="tab-stamp-image"
          onClick={() => setActiveTab('image')}
          style={{
            flex: 1,
            padding: '6px 8px',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            fontWeight: activeTab === 'image' ? 600 : 400,
            backgroundColor: activeTab === 'image' ? 'var(--bg-card)' : 'transparent',
            cursor: 'pointer'
          }}
        >
          {t('editor.annotations.stampImage', { defaultValue: 'Image Stamp' })}
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: 16 }}>
        {activeTab === 'presets' && (
          <div
            data-testid="stamps-preset-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8
            }}
          >
            {presetsList.map(({ type, icon }) => {
              const p = STAMP_PRESETS[type];
              const colorStr = `rgb(${p.textColor.r}, ${p.textColor.g}, ${p.textColor.b})`;
              const bgStr = `rgba(${p.backgroundColor.r}, ${p.backgroundColor.g}, ${p.backgroundColor.b}, 0.5)`;
              return (
                <button
                  key={type}
                  data-testid={`btn-stamp-${type.toLowerCase()}`}
                  onClick={() => handleApplyPreset(type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1.5px solid ${colorStr}`,
                    backgroundColor: bgStr,
                    color: colorStr,
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                    transition: 'transform 80ms ease'
                  }}
                >
                  {icon}
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'custom' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                {t('editor.annotations.stampText', { defaultValue: 'Stamp Text' })}
              </label>
              <input
                data-testid="input-custom-stamp-text"
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--bg-border)',
                  fontSize: 13,
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 500 }}>
                {t('editor.annotations.stampColor', { defaultValue: 'Color' })}
              </label>
              <input
                data-testid="input-custom-stamp-color"
                type="color"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                style={{ width: 36, height: 28, padding: 0, border: 'none', cursor: 'pointer' }}
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              <input
                data-testid="checkbox-custom-stamp-date"
                type="checkbox"
                checked={includeDate}
                onChange={(e) => setIncludeDate(e.target.checked)}
              />
              <span>
                {t('editor.annotations.includeDate', { defaultValue: 'Append Current Date' })}
              </span>
            </label>

            <button
              data-testid="btn-apply-custom-stamp"
              onClick={handleApplyCustomText}
              disabled={!customText.trim()}
              style={{
                marginTop: 6,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'var(--bg-primary)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              {t('common.insert', { defaultValue: 'Insert Stamp' })}
            </button>
          </div>
        )}

        {activeTab === 'image' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block' }}>
              {t('editor.annotations.chooseImage', { defaultValue: 'Choose PNG / JPEG Stamp' })}
            </label>
            <input
              data-testid="input-stamp-image-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageUpload}
              style={{ fontSize: 12 }}
            />

            {imagePreviewUri && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  padding: 8,
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <img
                  src={imagePreviewUri}
                  alt="Stamp Preview"
                  style={{ maxHeight: 80, objectFit: 'contain' }}
                />
              </div>
            )}

            <button
              data-testid="btn-apply-image-stamp"
              onClick={handleApplyCustomImage}
              disabled={!imagePreviewUri}
              style={{
                marginTop: 6,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'var(--bg-primary)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 13,
                cursor: imagePreviewUri ? 'pointer' : 'not-allowed',
                opacity: imagePreviewUri ? 1 : 0.5
              }}
            >
              {t('common.insert', { defaultValue: 'Insert Image Stamp' })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
