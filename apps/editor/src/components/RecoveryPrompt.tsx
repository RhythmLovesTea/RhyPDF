import React, { useEffect, useState } from 'react';
import { Button } from '@rhypdf/ui';
import { useTranslation } from '@rhypdf/i18n';
import { getRecoveryMetadata, clearRecoveryMetadata, RecoveryMetadata } from '../lib/recovery';
import { hasWorkingCopy } from '../lib/workingCopy';

export interface RecoveryPromptProps {
  onRestore: (metadata: RecoveryMetadata) => void;
  onDiscard?: () => void;
}

export const RecoveryPrompt: React.FC<RecoveryPromptProps> = ({ onRestore, onDiscard }) => {
  const { t } = useTranslation();
  const [metadata, setMetadata] = useState<RecoveryMetadata | null>(null);

  useEffect(() => {
    async function checkRecovery() {
      const meta = getRecoveryMetadata();
      if (meta && meta.isDirty && meta.documentId) {
        const exists = await hasWorkingCopy(meta.documentId);
        if (exists) {
          setMetadata(meta);
        }
      }
    }
    void checkRecovery();
  }, []);

  if (!metadata) return null;

  const formattedTime = new Date(metadata.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  const handleRestore = () => {
    onRestore(metadata);
    setMetadata(null);
  };

  const handleDiscard = () => {
    clearRecoveryMetadata();
    setMetadata(null);
    onDiscard?.();
  };

  return (
    <div
      data-testid="recovery-prompt"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--bg-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 20,
        gap: 16
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{t('recovery.title')}</span>
        <span style={{ fontSize: 13, color: 'var(--bg-muted-foreground)' }}>
          {t('recovery.prompt', {
            filename: metadata.filename || 'document.pdf',
            time: formattedTime
          })}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <Button
          data-testid="btn-recovery-discard"
          variant="ghost"
          size="sm"
          onClick={handleDiscard}
        >
          {t('recovery.btnDiscard')}
        </Button>
        <Button
          data-testid="btn-recovery-restore"
          variant="primary"
          size="sm"
          onClick={handleRestore}
        >
          {t('recovery.btnRestore')}
        </Button>
      </div>
    </div>
  );
};
