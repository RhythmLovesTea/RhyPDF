import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@rhypdf/ui';
import { Sparkles, Save, Check } from 'lucide-react';
import type { AutofillProfile } from '@rhypdf/edit-core';
import {
  DEFAULT_AUTOFILL_PROFILE,
  loadAutofillProfile,
  saveAutofillProfile
} from '@rhypdf/edit-core';

export interface AutofillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyAutofill: (profile: AutofillProfile) => void;
}

export const AutofillDialog: React.FC<AutofillDialogProps> = ({
  isOpen,
  onClose,
  onApplyAutofill
}) => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<AutofillProfile>(DEFAULT_AUTOFILL_PROFILE);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAutofillProfile().then((loaded) => setProfile(loaded));
    }
  }, [isOpen]);

  const handleChange = (key: keyof AutofillProfile, val: string) => {
    setProfile((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveOnly = async () => {
    await saveAutofillProfile(profile);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveAndApply = async () => {
    await saveAutofillProfile(profile);
    onApplyAutofill(profile);
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={t('editor.forms.autofillTitle', { defaultValue: 'Form Autofill Profile' })}
    >
      <div data-testid="autofill-dialog" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--bg-muted)' }}>
          {t('editor.forms.autofillDesc', {
            defaultValue: 'Save your profile locally. One click automatically fills matching fields across the document.'
          })}
        </p>

        {/* Profile Inputs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            maxHeight: 320,
            overflowY: 'auto',
            paddingRight: 4
          }}
        >
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>Full Name</label>
            <input
              data-testid="input-autofill-fullname"
              type="text"
              value={profile.fullName}
              onChange={(e) => handleChange('fullName', e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>Email</label>
            <input
              data-testid="input-autofill-email"
              type="email"
              value={profile.email}
              onChange={(e) => handleChange('email', e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>Phone</label>
            <input
              data-testid="input-autofill-phone"
              type="tel"
              value={profile.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>Company</label>
            <input
              data-testid="input-autofill-company"
              type="text"
              value={profile.company}
              onChange={(e) => handleChange('company', e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>Street Address</label>
            <input
              data-testid="input-autofill-address"
              type="text"
              value={profile.streetAddress}
              onChange={(e) => handleChange('streetAddress', e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>City</label>
            <input
              data-testid="input-autofill-city"
              type="text"
              value={profile.city}
              onChange={(e) => handleChange('city', e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>State / Province</label>
            <input
              data-testid="input-autofill-state"
              type="text"
              value={profile.state}
              onChange={(e) => handleChange('state', e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>ZIP / Postal Code</label>
            <input
              data-testid="input-autofill-zip"
              type="text"
              value={profile.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 2 }}>Country</label>
            <input
              data-testid="input-autofill-country"
              type="text"
              value={profile.country}
              onChange={(e) => handleChange('country', e.target.value)}
              style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)', fontSize: 12, boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <button
            data-testid="btn-save-profile-only"
            onClick={handleSaveOnly}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'transparent',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {savedSuccess ? <Check size={14} color="#16a34a" /> : <Save size={14} />}
            <span>{savedSuccess ? 'Saved!' : 'Save Profile'}</span>
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--bg-border)',
                backgroundColor: 'var(--bg-secondary)',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              data-testid="btn-apply-autofill"
              onClick={handleSaveAndApply}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                backgroundColor: 'var(--bg-primary)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              <Sparkles size={14} />
              <span>{t('editor.forms.autofillAction', { defaultValue: 'Autofill Form' })}</span>
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
