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
import { useTranslation } from '@rhypdf/i18n';

export function StyleGuide(): React.JSX.Element {
  const { t } = useTranslation();
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
            {t('styleGuide.title')}
          </h1>
          <p
            style={{
              margin: '4px 0 0',
              color: 'var(--bg-muted-foreground)',
              fontSize: 'var(--text-sm)'
            }}
          >
            {t('styleGuide.subtitle')}
          </p>
        </div>
        <Button data-testid="theme-toggle-btn" variant="secondary" onClick={toggleTheme}>
          {t('styleGuide.themeToggle', { theme })}
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
            {t('styleGuide.buttons')}
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <Button variant="primary">{t('styleGuide.btnPrimary')}</Button>
            <Button variant="secondary">{t('styleGuide.btnSecondary')}</Button>
            <Button variant="destructive">{t('styleGuide.btnDestructive')}</Button>
            <Button variant="ghost">{t('styleGuide.btnGhost')}</Button>
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
            {t('styleGuide.popoverTooltip')}
          </h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Tooltip content={t('styleGuide.tooltipContent')}>
              <Button variant="secondary" data-testid="tooltip-trigger">
                {t('styleGuide.tooltipTarget')}
              </Button>
            </Tooltip>
            <Popover
              trigger={
                <Button variant="secondary" data-testid="popover-trigger">
                  {t('styleGuide.openPopover')}
                </Button>
              }
            >
              <div>{t('styleGuide.popoverContent')}</div>
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
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>
            {t('styleGuide.dialogsToasts')}
          </h2>
          <span data-testid="dialog-state">{dialogOpen ? 'open' : 'closed'}</span>
          <Button data-testid="open-dialog-btn" onClick={() => setDialogOpen(true)}>
            {t('styleGuide.openDialog')}
          </Button>
          <Dialog
            open={dialogOpen}
            onClose={() => setDialogOpen(false)}
            title={t('styleGuide.sampleDialogTitle')}
            description={t('styleGuide.sampleDialogDesc')}
          >
            <div>{t('styleGuide.sampleDialogDesc')}</div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                marginTop: '16px'
              }}
            >
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                {t('common.confirm')}
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
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>
            {t('styleGuide.dropdownMenu')}
          </h2>
          <Menu
            trigger={
              <Button variant="secondary" data-testid="menu-trigger">
                {t('styleGuide.menuActions')}
              </Button>
            }
            items={[
              { id: '1', label: t('styleGuide.menuItemRotate'), onClick: () => {} },
              { id: '2', label: t('styleGuide.menuItemDuplicate'), onClick: () => {} },
              { id: '3', label: t('styleGuide.menuItemDelete'), disabled: true, onClick: () => {} }
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
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>
            {t('styleGuide.selectTabs')}
          </h2>
          <Tabs
            activeTab={activeTab}
            onChange={setActiveTab}
            tabs={[
              {
                id: 'tab1',
                label: t('styleGuide.tabGeneral'),
                content: <div>{t('styleGuide.tabGeneralContent')}</div>
              },
              {
                id: 'tab2',
                label: t('styleGuide.tabSecurity'),
                content: <div>{t('styleGuide.tabSecurityContent')}</div>
              }
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
            {t('styleGuide.slidersSwitches')}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Slider
              label={t('styleGuide.zoomScale')}
              min={25}
              max={400}
              value={sliderVal}
              onChange={setSliderVal}
            />
            <Switch label={t('styleGuide.enableOcr')} checked={switchVal} onChange={setSwitchVal} />
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
          <h2 style={{ fontSize: 'var(--text-base)', margin: '0 0 12px' }}>{t('common.info')}</h2>
          {toastVisible ? (
            <Toast
              variant="success"
              title={t('styleGuide.toastTitle')}
              message={t('styleGuide.toastMessage')}
              onClose={() => setToastVisible(false)}
            />
          ) : (
            <Button size="sm" onClick={() => setToastVisible(true)}>
              {t('styleGuide.showToast')}
            </Button>
          )}
        </section>
      </div>
    </div>
  );
}
