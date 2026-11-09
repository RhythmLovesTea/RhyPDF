import React, { lazy, Suspense } from 'react';

const ToolbarSkeleton = lazy(() => import('../../components/ToolbarSkeleton'));
const SidebarSkeleton = lazy(() => import('../../components/SidebarSkeleton'));
const ViewerSkeleton = lazy(() => import('../../components/ViewerSkeleton'));

interface EditorPageProps {
  wasmStatus: string;
}

export default function EditorPage({ wasmStatus }: EditorPageProps): React.JSX.Element {
  return (
    <div
      data-testid="page-editor"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
    >
      <Suspense fallback={<div style={{ padding: 8, fontSize: 12 }}>Loading toolbar...</div>}>
        <ToolbarSkeleton />
      </Suspense>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Suspense
          fallback={<div style={{ width: 240, padding: 8, fontSize: 12 }}>Loading sidebar...</div>}
        >
          <SidebarSkeleton />
        </Suspense>

        <Suspense fallback={<div style={{ flex: 1, padding: 16 }}>Loading viewport...</div>}>
          <ViewerSkeleton wasmStatus={wasmStatus} />
        </Suspense>
      </div>
    </div>
  );
}
