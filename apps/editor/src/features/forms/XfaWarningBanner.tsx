import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { XFA_UNSUPPORTED_MESSAGE } from '@rhypdf/edit-core';

export interface XfaWarningBannerProps {
  onDismiss: () => void;
}

export const XfaWarningBanner: React.FC<XfaWarningBannerProps> = ({ onDismiss }) => {
  const { t } = useTranslation();

  return (
    <div
      data-testid="xfa-warning-banner"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: '#fffbeb', // amber-50
        borderBottom: '1px solid #fde68a', // amber-200
        color: '#92400e', // amber-800
        fontSize: 13,
        zIndex: 50
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertTriangle size={18} color="#b45309" />
        <span style={{ fontWeight: 500 }}>
          {t('editor.forms.xfaUnsupported', { defaultValue: XFA_UNSUPPORTED_MESSAGE })}
        </span>
      </div>
      <button
        data-testid="btn-dismiss-xfa-warning"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          padding: 4,
          color: '#b45309'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
