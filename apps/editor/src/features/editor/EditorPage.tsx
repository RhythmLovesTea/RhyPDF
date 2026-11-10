import React, { lazy, Suspense } from 'react';
import { useTranslation } from '@rhypdf/i18n';
import { useDocStore } from '../../stores/docStore';
import { useUIStore } from '../../stores/uiStore';
import { PdfViewer } from '../viewer/PdfViewer';

const ToolbarSkeleton = lazy(() => import('../../components/ToolbarSkeleton'));
const SidebarSkeleton = lazy(() => import('../../components/SidebarSkeleton'));
const ViewerSkeleton = lazy(() => import('../../components/ViewerSkeleton'));

interface EditorPageProps {
  wasmStatus: string;
  wasmProgress?: number;
  wasmPhase?: string;
}

export default function EditorPage({
  wasmStatus,
  wasmProgress = 100,
  wasmPhase = 'ready'
}: EditorPageProps): React.JSX.Element {
  const { t } = useTranslation();
  const { currentDocId, pageCount, closeDoc } = useDocStore();
  const theme = useUIStore((s) => (s.theme === 'dark' ? 'dark' : 'light'));

  if (currentDocId) {
    return (
      <div
        data-testid="page-editor"
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
      >
        <PdfViewer
          docId={currentDocId}
          pageCount={pageCount || 1}
          theme={theme}
          onBackToHome={() => closeDoc()}
        />
      </div>
    );
  }

  return (
    <div
      data-testid="page-editor"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
    >
      <Suspense
        fallback={<div style={{ padding: 8, fontSize: 12 }}>{t('editor.loadingToolbar')}</div>}
      >
        <ToolbarSkeleton />
      </Suspense>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Suspense
          fallback={
            <div style={{ width: 240, padding: 8, fontSize: 12 }}>{t('editor.loadingSidebar')}</div>
          }
        >
          <SidebarSkeleton />
        </Suspense>

        <Suspense
          fallback={<div style={{ flex: 1, padding: 16 }}>{t('editor.loadingViewport')}</div>}
        >
          <ViewerSkeleton
            wasmStatus={wasmStatus}
            wasmProgress={wasmProgress}
            wasmPhase={wasmPhase}
          />
        </Suspense>
      </div>
    </div>
  );
}
