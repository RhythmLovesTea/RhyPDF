import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Tooltip,
  Dialog,
  Popover,
  Menu,
  Tabs,
  Slider,
  Switch,
  Select,
  Toast
} from '@rhypdf/ui';

export function StyleGuide(): React.JSX.Element {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tab1');
  const [sliderVal, setSliderVal] = useState(50);
  const [switchVal, setSwitchVal] = useState(true);
  const [selectVal, setSelectVal] = useState('opt1');
  const [toastVisible, setToastVisible] = useState(true);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <div
      data-testid="styleguide-root"
      data-theme={theme}
      className={theme === 'dark' ? 'dark' : ''}
      style={{
        padding: '24px',
        backgroundColor: 'var(--bg-background)',
        color: 'var(--bg-foreground)',
        minHeight: '100vh',
        boxSizing: 'border-box'
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--bg-border)',
          paddingBottom: '16px',
          marginBottom: '24px'
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
            Design System Style Guide
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              color: 'var(--bg-muted-foreground)',
              fontSize: 'var(--text-sm)'
            }}
          >
            Showcasing all 11 base components in light and dark mode
          </p>
        </div>
        <Button data-testid="theme-toggle-btn" variant="secondary" onClick={toggleTheme}>
          Toggle Theme (Current: {theme})
        </Button>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px'
        }}
      >
        {/* Buttons */}
        <section
          data-testid="section-buttons"
          style={{
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>
            1 &amp; 2. Buttons &amp; IconButtons
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="ghost">Ghost</Button>
            <IconButton aria-label="Settings" variant="secondary">
              &#9881;
            </IconButton>
            <IconButton aria-label="Favorite" variant="primary">
              &hearts;
            </IconButton>
          </div>
        </section>

        {/* Tooltip & Popover */}
        <section
          data-testid="section-tooltip-popover"
          style={{
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>
            3 &amp; 5. Tooltip &amp; Popover
          </h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Tooltip content="Helpful tooltip text">
              <Button variant="secondary" data-testid="tooltip-trigger">
                Hover for Tooltip
              </Button>
            </Tooltip>
            <Popover
              trigger={
                <Button variant="secondary" data-testid="popover-trigger">
                  Open Popover
                </Button>
              }
            >
              <div>Popover content anchored to trigger</div>
            </Popover>
          </div>
        </section>

        {/* Dialog */}
        <section
          data-testid="section-dialog"
          style={{
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>4. Modal Dialog</h2>
          <span data-testid="dialog-state">{dialogOpen ? 'open' : 'closed'}</span>
          <Button data-testid="open-dialog-btn" onClick={() => setDialogOpen(true)}>
            Open Dialog
          </Button>
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title="Sample Modal Dialog"
            description="Testing modal dialog open/close lifecycle."
          >
            <div>Dialog body with actions:</div>
            <div
              style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}
            >
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Confirm
              </Button>
            </div>
          </Dialog>
        </section>

        {/* Menu */}
        <section
          data-testid="section-menu"
          style={{
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>6. Dropdown Menu</h2>
          <Menu
            trigger={
              <Button variant="secondary" data-testid="menu-trigger">
                Options Menu &#9662;
              </Button>
            }
            items={[
              { id: '1', label: 'Edit Page', onClick: () => {} },
              { id: '2', label: 'Export PDF', onClick: () => {} },
              { id: '3', label: 'Delete Page', disabled: true, onClick: () => {} }
            ]}
          />
        </section>

        {/* Tabs */}
        <section
          data-testid="section-tabs"
          style={{
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>7. Tabs</h2>
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              { id: 'tab1', label: 'General', content: <div>General tab content panel.</div> },
              { id: 'tab2', label: 'Security', content: <div>Security settings tab content.</div> }
            ]}
          />
        </section>

        {/* Controls: Slider, Switch, Select */}
        <section
          data-testid="section-controls"
          style={{
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>
            8, 9 &amp; 10. Slider, Switch &amp; Select
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Slider
              label="Zoom Scale"
              min={25}
              max={400}
              value={sliderVal}
              onChange={setSliderVal}
            />
            <Switch label="Enable OCR auto-detect" checked={switchVal} onChange={setSwitchVal} />
            <Select
              data-testid="sample-select"
              value={selectVal}
              onChange={setSelectVal}
              options={[
                { value: 'opt1', label: 'Single Page Continuous' },
                { value: 'opt2', label: 'Two Page Spread' },
                { value: 'opt3', label: 'Thumbnail Grid' }
              ]}
            />
          </div>
        </section>

        {/* Toast */}
        <section
          data-testid="section-toast"
          style={{
            border: '1px solid var(--bg-border)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            backgroundColor: 'var(--bg-card)'
          }}
        >
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>
            11. Toast Notifications
          </h2>
          {toastVisible ? (
            <Toast
              variant="success"
              title="File Saved Locally"
              message="Your PDF has been saved directly to browser storage."
              onClose={() => setToastVisible(false)}
            />
          ) : (
            <Button size="sm" onClick={() => setToastVisible(true)}>
              Show Toast
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
