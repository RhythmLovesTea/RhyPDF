import React, { useState, useEffect, useCallback } from 'react';
import { Button, IconButton } from '@rhypdf/ui';
import { SAMPLE_FIXTURES } from '@rhypdf/test-fixtures';
import { useTranslation } from '@rhypdf/i18n';
import {
  UploadCloud,
  FileText,
  Plus,
  Trash2,
  Download,
  Edit2,
  XCircle,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  getRecentFiles,
  RecentFileItem,
  removeRecentFile,
  renameRecentFile,
  deleteRecentFile,
  downloadRecentFile,
  addRecentFile,
  verifyFileHandlePermission
} from '../../lib/recentFiles';
import { openPdfViaPicker, extractPdfFromDrop } from '../../lib/fileOpen';
import { saveWorkingCopy, loadWorkingCopy } from '../../lib/workingCopy';
import { CreateBlankPdfDialog } from '../../components/CreateBlankPdfDialog';
import { RecoveryPrompt } from '../../components/RecoveryPrompt';
import { RecoveryMetadata, clearRecoveryMetadata } from '../../lib/recovery';
import { useDocStore } from '../../stores/docStore';

interface HomePageProps {
  onNavigate: (route: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps): React.JSX.Element {
  const { t } = useTranslation();
  const { setDoc } = useDocStore();

  const [recents, setRecents] = useState<RecentFileItem[]>([]);
  const [loadingRecents, setLoadingRecents] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [blankDialogOpen, setBlankDialogOpen] = useState(false);

  // Load recent files
  const refreshRecents = useCallback(async () => {
    try {
      const files = await getRecentFiles();
      setRecents(files);
    } catch {
      setRecents([]);
    } finally {
      setLoadingRecents(false);
    }
  }, []);

  useEffect(() => {
    void refreshRecents();
  }, [refreshRecents]);

  // Open file handler (working-copy system)
  const handleOpenPdfFile = async (file: File, handle: FileSystemFileHandle | null = null) => {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bytes = await file.arrayBuffer();

    // 1. Copy bytes to OPFS working copy
    const { storageType } = await saveWorkingCopy(docId, bytes);

    // 2. Add to recent files in IndexedDB
    const recentItem: RecentFileItem = {
      id: docId,
      name: file.name,
      fileHandle: handle,
      lastOpened: Date.now(),
      pageCount: 1, // Will be updated on engine load
      size: bytes.byteLength
    };
    await addRecentFile(recentItem);

    // 3. Set docStore and navigate to editor
    setDoc(docId, file.name, 1, handle, storageType);
    onNavigate('/editor');
  };

  // Open via file picker
  const handlePickerOpen = async () => {
    const result = await openPdfViaPicker();
    if (result) {
      await handleOpenPdfFile(result.file, result.handle);
    }
  };

  // Drop zone drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = extractPdfFromDrop(e.nativeEvent);
    if (file) {
      await handleOpenPdfFile(file, null);
    }
  };

  // Create blank PDF handler (Task 4.5)
  const handleCreateBlankPdf = async (bytes: Uint8Array, filename: string, pageCount: number) => {
    const docId = `blank_${Date.now()}`;
    const { storageType } = await saveWorkingCopy(docId, bytes);

    await addRecentFile({
      id: docId,
      name: filename,
      fileHandle: null,
      lastOpened: Date.now(),
      pageCount,
      size: bytes.byteLength
    });

    setDoc(docId, filename, pageCount, null, storageType);
    onNavigate('/editor');
  };

  // Restore unsaved changes from crash (Task 4.8)
  const handleRestoreRecovery = async (meta: RecoveryMetadata) => {
    if (!meta.documentId) return;
    const bytes = await loadWorkingCopy(meta.documentId);
    if (bytes) {
      setDoc(meta.documentId, meta.filename || 'recovered.pdf', 1, null, 'opfs');
      clearRecoveryMetadata();
      onNavigate('/editor');
    }
  };

  // Open a recent file
  const handleOpenRecent = async (item: RecentFileItem) => {
    // If handle exists, check permission
    if (item.fileHandle) {
      const granted = await verifyFileHandlePermission(item.fileHandle);
      if (granted) {
        try {
          const file = await item.fileHandle.getFile();
          const bytes = await file.arrayBuffer();
          await saveWorkingCopy(item.id, bytes);
        } catch {
          // Fall back to working copy
        }
      }
    }

    setDoc(item.id, item.name, item.pageCount || 1, item.fileHandle || null, 'opfs');
    onNavigate('/editor');
  };

  // Recent file actions (Task 4.4)
  const handleRemoveRecent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await removeRecentFile(id);
    await refreshRecents();
  };

  const handleRenameRecent = async (e: React.MouseEvent, item: RecentFileItem) => {
    e.stopPropagation();
    const newName = window.prompt(t('home.renamePrompt'), item.name);
    if (newName && newName.trim() && newName.trim() !== item.name) {
      await renameRecentFile(item.id, newName.trim());
      await refreshRecents();
    }
  };

  const handleDeleteRecent = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t('common.confirm'))) {
      await deleteRecentFile(id);
      await refreshRecents();
    }
  };

  const handleDownloadRecent = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    await downloadRecentFile(id, name);
  };

  return (
    <div
      data-testid="page-home"
      style={{
        padding: '32px 24px',
        maxWidth: 960,
        marginInline: 'auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 32
      }}
    >
      {/* Crash / Tab Close Recovery Banner (Task 4.8) */}
      <RecoveryPrompt onRestore={handleRestoreRecovery} />

      {/* Hero Header */}
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            margin: 0,
            letterSpacing: -0.5,
            color: 'var(--bg-foreground)'
          }}
        >
          {t('home.title')}
        </h1>
        <p style={{ color: 'var(--bg-muted-foreground)', margin: 0, fontSize: 15 }}>
          {t('home.subtitle')}
        </p>
      </header>

      {/* Large Drop Zone (Task 4.1 & 4.2) */}
      <section
        data-testid="drop-zone-main"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handlePickerOpen}
        style={{
          border: isDragOver
            ? '2px dashed var(--bg-primary, #2563eb)'
            : '2px dashed var(--bg-border)',
          borderRadius: 'var(--radius-xl, 16px)',
          padding: '48px 32px',
          textAlign: 'center',
          backgroundColor: isDragOver ? 'var(--bg-secondary)' : 'var(--bg-card)',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--bg-primary)'
          }}
        >
          <UploadCloud size={32} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t('home.dropZoneTitle')}</h2>
          <p style={{ color: 'var(--bg-muted-foreground)', fontSize: 13, margin: 0 }}>
            {t('home.dropZoneHint')}
          </p>
        </div>

        <div
          style={{ display: 'flex', gap: 12, marginTop: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            data-testid="btn-open-picker"
            variant="primary"
            onClick={handlePickerOpen}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FileText size={16} />
            <span>{t('home.btnOpenPicker')}</span>
          </Button>

          <Button
            data-testid="btn-create-blank-pdf"
            variant="secondary"
            onClick={() => setBlankDialogOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={16} />
            <span>{t('home.btnCreateBlank')}</span>
          </Button>
        </div>
      </section>

      {/* Recent Files Grid (Task 4.1, 4.3, 4.4) */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color="var(--bg-muted-foreground)" />
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{t('home.recentsTitle')}</h3>
          </div>
          {recents.length > 0 && (
            <span style={{ fontSize: 13, color: 'var(--bg-muted-foreground)' }}>
              {recents.length} {recents.length === 1 ? 'file' : 'files'}
            </span>
          )}
        </div>

        {loadingRecents ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--bg-muted-foreground)' }}>
            {t('common.loading')}
          </div>
        ) : recents.length === 0 ? (
          /* Real empty state (Task 4.1 & UI quality bar) */
          <div
            data-testid="recents-empty-state"
            style={{
              padding: '36px 24px',
              textAlign: 'center',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--bg-border)',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--bg-muted-foreground)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8
            }}
          >
            <FileText size={32} opacity={0.5} />
            <span style={{ fontSize: 14 }}>{t('home.recentsEmpty')}</span>
          </div>
        ) : (
          /* Recents Grid */
          <div
            data-testid="recents-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 16
            }}
          >
            {recents.map((item) => (
              <div
                key={item.id}
                data-testid={`recent-item-${item.id}`}
                onClick={() => handleOpenRecent(item)}
                style={{
                  border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--bg-card)',
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 14,
                  cursor: 'pointer',
                  transition: 'all 120ms ease',
                  position: 'relative'
                }}
              >
                {/* Thumbnail / Header */}
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    data-testid="recent-thumbnail"
                    style={{
                      width: 48,
                      height: 56,
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--bg-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: 'var(--bg-primary)'
                    }}
                  >
                    <FileText size={24} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      data-testid="recent-filename"
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--bg-muted-foreground)',
                        marginTop: 4,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Layers size={12} />
                      <span>
                        {item.pageCount}{' '}
                        {item.pageCount === 1
                          ? t('home.recentsPages', { count: 1 })
                          : t('home.recentsPages_plural', { count: item.pageCount })}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--bg-muted-foreground)',
                        marginTop: 2
                      }}
                    >
                      {new Date(item.lastOpened).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Actions Bar (Task 4.4) */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 4,
                    borderTop: '1px solid var(--bg-border)',
                    paddingTop: 10
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconButton
                    data-testid={`btn-recent-rename-${item.id}`}
                    aria-label={t('home.recentsActionRename')}
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleRenameRecent(e, item)}
                    title={t('home.recentsActionRename')}
                  >
                    <Edit2 size={14} />
                  </IconButton>

                  <IconButton
                    data-testid={`btn-recent-download-${item.id}`}
                    aria-label={t('home.recentsActionDownload')}
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDownloadRecent(e, item.id, item.name)}
                    title={t('home.recentsActionDownload')}
                  >
                    <Download size={14} />
                  </IconButton>

                  <IconButton
                    data-testid={`btn-recent-remove-${item.id}`}
                    aria-label={t('home.recentsActionRemove')}
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleRemoveRecent(e, item.id)}
                    title={t('home.recentsActionRemove')}
                  >
                    <XCircle size={14} />
                  </IconButton>

                  <IconButton
                    data-testid={`btn-recent-delete-${item.id}`}
                    aria-label={t('home.recentsActionDelete')}
                    size="sm"
                    variant="ghost"
                    onClick={(e) => handleDeleteRecent(e, item.id)}
                    title={t('home.recentsActionDelete')}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Start Fixtures */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} color="var(--bg-muted-foreground)" />
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{t('home.quickStartTitle')}</h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12
          }}
        >
          {Object.entries(SAMPLE_FIXTURES)
            .slice(0, 4)
            .map(([key, info]) => (
              <div
                key={key}
                style={{
                  border: '1px solid var(--bg-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  backgroundColor: 'var(--bg-card)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{info.filename}</div>
                  <div style={{ fontSize: 12, color: 'var(--bg-muted-foreground)', marginTop: 4 }}>
                    {info.description}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  style={{ marginTop: 12 }}
                  onClick={() => onNavigate(`/editor?doc=${key}`)}
                >
                  {t('home.openSample')}
                </Button>
              </div>
            ))}
        </div>
      </section>

      {/* Create Blank PDF Dialog (Task 4.5) */}
      <CreateBlankPdfDialog
        open={blankDialogOpen}
        onClose={() => setBlankDialogOpen(false)}
        onCreate={handleCreateBlankPdf}
      />
    </div>
  );
}
