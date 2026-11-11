import React, { useState, useEffect, useCallback } from 'react';
import { Button, IconButton } from '@rhypdf/ui';
import { History, X, RotateCcw, Download, Trash2, Clock } from 'lucide-react';
import type { VersionRecord } from '@rhypdf/edit-core';
import {
  getDocumentVersions,
  restoreDocumentVersion,
  deleteDocumentVersion,
  clearDocumentVersions,
  isVersionHistoryEnabled,
  setVersionHistoryEnabled
} from '../../lib/versionHistory';

export interface VersionHistoryDialogProps {
  isOpen: boolean;
  docId: string | null;
  onClose: () => void;
  onRestore: (bytes: Uint8Array, version: VersionRecord) => void;
}

export const VersionHistoryDialog: React.FC<VersionHistoryDialogProps> = ({
  isOpen,
  docId,
  onClose,
  onRestore
}) => {
  const [versions, setVersions] = useState<VersionRecord[]>([]);
  const [isEnabled, setIsEnabled] = useState(isVersionHistoryEnabled());
  const [isLoading, setIsLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    if (!docId) return;
    setIsLoading(true);
    try {
      const records = await getDocumentVersions(docId);
      setVersions(records);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    if (isOpen && docId) {
      void loadVersions();
      setIsEnabled(isVersionHistoryEnabled());
    }
  }, [isOpen, docId, loadVersions]);

  const handleToggleEnabled = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsEnabled(checked);
    setVersionHistoryEnabled(checked);
  };

  const handleRestoreVersion = async (version: VersionRecord) => {
    if (!docId) return;
    const bytes = await restoreDocumentVersion(docId, version.id);
    if (bytes) {
      onRestore(bytes, version);
      onClose();
    }
  };

  const handleDownloadVersion = async (version: VersionRecord) => {
    if (!docId) return;
    const bytes = await restoreDocumentVersion(docId, version.id);
    if (!bytes) return;

    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${version.filename.replace(/\.pdf$/i, '')}_v${version.versionNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!docId) return;
    await deleteDocumentVersion(docId, versionId);
    setConfirmDeleteId(null);
    void loadVersions();
  };

  const handleClearAll = async () => {
    if (!docId) return;
    await clearDocumentVersions(docId);
    setVersions([]);
  };

  const formatSize = (bytes: number): string => {
    if (bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatTime = (ts: number): string => {
    return new Date(ts).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div
      data-testid="dialog-version-history"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--bg-foreground, #0f172a)',
          borderRadius: 12,
          padding: 24,
          width: '90%',
          maxWidth: 520,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={20} color="var(--bg-primary, #2563eb)" />
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Version History</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bg-muted-foreground, #64748b)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Settings Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            backgroundColor: 'var(--bg-secondary, #f1f5f9)',
            borderRadius: 8,
            marginBottom: 14
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
            <input
              data-testid="toggle-enable-version-history"
              type="checkbox"
              checked={isEnabled}
              onChange={handleToggleEnabled}
            />
            <span>Enable Local Version History (last 10 saves in OPFS)</span>
          </label>

          {versions.length > 0 && (
            <button
              onClick={handleClearAll}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 500
              }}
            >
              Clear All
            </button>
          )}
        </div>

        {/* Version List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 180 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'var(--bg-muted-foreground)' }}>
              Loading versions...
            </div>
          ) : versions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 36, color: 'var(--bg-muted-foreground)' }}>
              <Clock size={32} style={{ margin: '0 auto 8px auto', opacity: 0.5 }} />
              <div style={{ fontSize: 14, fontWeight: 500 }}>No saved versions yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Versions are automatically created every time you save or download.
              </div>
            </div>
          ) : (
            versions.map((v) => (
              <div
                key={v.id}
                data-testid={`version-item-${v.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--bg-border, #e2e8f0)',
                  backgroundColor: 'var(--bg-card, #ffffff)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Version {v.versionNumber}</span>
                    <span style={{ fontSize: 12, color: 'var(--bg-muted-foreground)' }}>
                      ({formatSize(v.sizeBytes)})
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', marginTop: 2 }}>
                    {formatTime(v.timestamp)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Button
                    data-testid={`btn-restore-version-${v.id}`}
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRestoreVersion(v)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <RotateCcw size={13} />
                    <span>Restore</span>
                  </Button>

                  <IconButton
                    data-testid={`btn-download-version-${v.id}`}
                    aria-label="Download version"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownloadVersion(v)}
                  >
                    <Download size={15} />
                  </IconButton>

                  {confirmDeleteId === v.id ? (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteVersion(v.id)}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <IconButton
                      aria-label="Delete version"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmDeleteId(v.id)}
                    >
                      <Trash2 size={15} color="#ef4444" />
                    </IconButton>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
