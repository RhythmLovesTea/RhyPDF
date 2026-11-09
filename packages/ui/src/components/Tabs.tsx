import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div>
      <div
        role="tablist"
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--bg-border)',
          gap: '8px'
        }}
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                borderBottom: isActive ? '2px solid var(--bg-primary)' : '2px solid transparent',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--bg-primary)' : 'var(--bg-muted-foreground)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)'
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" style={{ padding: 'var(--space-2) 0' }}>
        {currentTab?.content}
      </div>
    </div>
  );
};
