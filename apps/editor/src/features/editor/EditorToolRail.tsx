import React from 'react';
import { useTranslation } from '@rhypdf/i18n';
import {
  MousePointer,
  Type,
  Image as ImageIcon,
  PenTool,
  Layers,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { useDocStore, EditorMode } from '../../stores/docStore';

export interface EditorToolRailProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export const EditorToolRail: React.FC<EditorToolRailProps> = ({ sidebarOpen, onToggleSidebar }) => {
  const { t } = useTranslation();
  const { activeMode, setActiveMode } = useDocStore();

  const tools: { id: EditorMode; label: string; icon: React.ReactNode; testId: string }[] = [
    {
      id: 'view',
      label: t('editor.toolRail.select'),
      icon: <MousePointer size={20} />,
      testId: 'tool-rail-select'
    },
    {
      id: 'edit-text',
      label: t('editor.toolRail.text'),
      icon: <Type size={20} />,
      testId: 'tool-rail-text'
    },
    {
      id: 'edit-images',
      label: t('editor.toolRail.image'),
      icon: <ImageIcon size={20} />,
      testId: 'tool-rail-image'
    },
    {
      id: 'annotate',
      label: t('editor.toolRail.annotate'),
      icon: <PenTool size={20} />,
      testId: 'tool-rail-annotate'
    },
    {
      id: 'pages',
      label: t('editor.toolRail.pages'),
      icon: <Layers size={20} />,
      testId: 'tool-rail-pages'
    }
  ];

  return (
    <aside
      data-testid="editor-tool-rail"
      style={{
        width: 52,
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--bg-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 0',
        gap: 6,
        flexShrink: 0
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        {tools.map((tool) => {
          const isActive = activeMode === tool.id;
          return (
            <button
              key={tool.id}
              data-testid={tool.testId}
              onClick={() => setActiveMode(tool.id)}
              title={tool.label}
              aria-label={tool.label}
              style={{
                width: 44,
                height: 44,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isActive ? 'var(--bg-primary)' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--bg-foreground)',
                cursor: 'pointer',
                transition: 'all 120ms ease'
              }}
            >
              {tool.icon}
            </button>
          );
        })}
      </div>

      {/* Thumbnails toggle at bottom of rail */}
      <button
        data-testid="tool-rail-toggle-sidebar"
        onClick={onToggleSidebar}
        title={t('editor.toolRail.thumbnails')}
        aria-label={t('editor.toolRail.thumbnails')}
        style={{
          width: 44,
          height: 44,
          borderRadius: 'var(--radius-md)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: sidebarOpen ? 'var(--bg-secondary)' : 'transparent',
          color: 'var(--bg-foreground)',
          cursor: 'pointer',
          transition: 'all 120ms ease'
        }}
      >
        {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
      </button>
    </aside>
  );
};
