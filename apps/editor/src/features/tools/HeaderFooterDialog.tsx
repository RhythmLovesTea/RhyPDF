import React, { useState } from 'react';
import { Dialog } from '@rhypdf/ui';
import type {
  HeaderFooterConfig,
  BatesNumberingConfig,
  BatesPosition,
  PageRangeMode,
  TextBlock
} from '@rhypdf/edit-core';
import {
  generateHeaderFooterBlocks,
  generateBatesBlock,
  resolvePageIndices
} from '@rhypdf/edit-core';

export interface HeaderFooterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyBlocks: (blocks: TextBlock[]) => void;
  totalPages: number;
  pageWidthPt?: number;
  pageHeightPt?: number;
}

export const HeaderFooterDialog: React.FC<HeaderFooterDialogProps> = ({
  isOpen,
  onClose,
  onApplyBlocks,
  totalPages,
  pageWidthPt = 612,
  pageHeightPt = 792
}) => {
  const [activeTab, setActiveTab] = useState<'hf' | 'bates'>('hf');

  // Header & Footer state
  const [headerLeft, setHeaderLeft] = useState('');
  const [headerCenter, setHeaderCenter] = useState('');
  const [headerRight, setHeaderRight] = useState('');
  const [footerLeft, setFooterLeft] = useState('');
  const [footerCenter, setFooterCenter] = useState('Page {page} of {pages}');
  const [footerRight, setFooterRight] = useState('{date}');
  const [firstPageDiff, setFirstPageDiff] = useState(false);
  const [hfRangeMode, setHfRangeMode] = useState<PageRangeMode>('all');
  const [hfCustomRange, setHfCustomRange] = useState('');

  // Bates state
  const [batesPrefix, setBatesPrefix] = useState('CONF-');
  const [batesSuffix, setBatesSuffix] = useState('');
  const [batesStartNum, setBatesStartNum] = useState(1);
  const [batesNumDigits, setBatesNumDigits] = useState(6);
  const [batesPosition, setBatesPosition] = useState<BatesPosition>('bottomRight');
  const [batesRangeMode] = useState<PageRangeMode>('all');
  const [batesCustomRange] = useState('');

  const handleApplyHf = () => {
    const config: HeaderFooterConfig = {
      header: {
        leftText: headerLeft,
        centerText: headerCenter,
        rightText: headerRight
      },
      footer: {
        leftText: footerLeft,
        centerText: footerCenter,
        rightText: footerRight
      },
      firstPageDifferent: firstPageDiff,
      firstPageHeader: firstPageDiff ? { leftText: '', centerText: '', rightText: '' } : undefined,
      firstPageFooter: firstPageDiff ? { leftText: '', centerText: '', rightText: '' } : undefined,
      pageRangeMode: hfRangeMode,
      customPageRange: hfCustomRange
    };

    const targetIndices = resolvePageIndices(
      hfRangeMode,
      totalPages,
      hfCustomRange,
      firstPageDiff && hfRangeMode === 'excludeFirstPage'
    );

    const allBlocks: TextBlock[] = [];
    for (const pIdx of targetIndices) {
      const blocks = generateHeaderFooterBlocks(config, pIdx, totalPages, pageWidthPt, pageHeightPt);
      allBlocks.push(...blocks);
    }

    onApplyBlocks(allBlocks);
    onClose();
  };

  const handleApplyBates = () => {
    const config: BatesNumberingConfig = {
      prefix: batesPrefix,
      suffix: batesSuffix,
      startNumber: batesStartNum,
      numDigits: batesNumDigits,
      position: batesPosition,
      pageRangeMode: batesRangeMode,
      customPageRange: batesCustomRange
    };

    const targetIndices = resolvePageIndices(batesRangeMode, totalPages, batesCustomRange);
    const allBlocks: TextBlock[] = [];

    targetIndices.forEach((pIdx, seq) => {
      const block = generateBatesBlock(config, pIdx, seq, pageWidthPt, pageHeightPt);
      allBlocks.push(block);
    });

    onApplyBlocks(allBlocks);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={onClose} title="Header, Footer & Bates Numbering">
      <div
        data-testid="dialog-header-footer"
        style={{
          padding: 24,
          minWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        {/* Tab Headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-border)', gap: 16 }}>
          <button
            data-testid="tab-hf"
            onClick={() => setActiveTab('hf')}
            style={{
              padding: '8px 4px',
              border: 'none',
              borderBottom: activeTab === 'hf' ? '2px solid var(--bg-primary)' : 'none',
              background: 'transparent',
              color: activeTab === 'hf' ? 'var(--bg-primary)' : 'inherit',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Header & Footer
          </button>
          <button
            data-testid="tab-bates"
            onClick={() => setActiveTab('bates')}
            style={{
              padding: '8px 4px',
              border: 'none',
              borderBottom: activeTab === 'bates' ? '2px solid var(--bg-primary)' : 'none',
              background: 'transparent',
              color: activeTab === 'bates' ? 'var(--bg-primary)' : 'inherit',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Bates & Page Numbers
          </button>
        </div>

        {activeTab === 'hf' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header section */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Header</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <input
                  data-testid="input-hf-header-left"
                  placeholder="Left header"
                  value={headerLeft}
                  onChange={(e) => setHeaderLeft(e.target.value)}
                  style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
                <input
                  data-testid="input-hf-header-center"
                  placeholder="Center header"
                  value={headerCenter}
                  onChange={(e) => setHeaderCenter(e.target.value)}
                  style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
                <input
                  data-testid="input-hf-header-right"
                  placeholder="Right header"
                  value={headerRight}
                  onChange={(e) => setHeaderRight(e.target.value)}
                  style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
              </div>
            </div>

            {/* Footer section */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Footer</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <input
                  data-testid="input-hf-footer-left"
                  placeholder="Left footer"
                  value={footerLeft}
                  onChange={(e) => setFooterLeft(e.target.value)}
                  style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
                <input
                  data-testid="input-hf-footer-center"
                  placeholder="Center footer"
                  value={footerCenter}
                  onChange={(e) => setFooterCenter(e.target.value)}
                  style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
                <input
                  data-testid="input-hf-footer-right"
                  placeholder="Right footer"
                  value={footerRight}
                  onChange={(e) => setFooterRight(e.target.value)}
                  style={{ padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
              </div>
            </div>

            {/* Quick tokens info */}
            <div style={{ fontSize: 11, color: 'var(--bg-muted-foreground)' }}>
              Variables: {'{page}'} = Current Page, {'{pages}'} = Total Pages, {'{date}'} = Today's Date
            </div>

            {/* Options */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                data-testid="checkbox-first-page-diff"
                checked={firstPageDiff}
                onChange={(e) => setFirstPageDiff(e.target.checked)}
              />
              Different first page (suppress on title page)
            </label>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span>Page Range:</span>
              <select
                data-testid="select-hf-range"
                value={hfRangeMode}
                onChange={(e) => setHfRangeMode(e.target.value as PageRangeMode)}
                style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--bg-border)' }}
              >
                <option value="all">All Pages</option>
                <option value="excludeFirstPage">Exclude First Page</option>
                <option value="firstPageOnly">First Page Only</option>
                <option value="range">Custom Range</option>
              </select>
              {hfRangeMode === 'range' && (
                <input
                  data-testid="input-hf-custom-range"
                  placeholder="e.g. 1-5, 8"
                  value={hfCustomRange}
                  onChange={(e) => setHfCustomRange(e.target.value)}
                  style={{ width: 100, padding: '4px 6px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                data-testid="btn-hf-cancel"
                onClick={onClose}
                style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid var(--bg-border)', background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                data-testid="btn-hf-apply"
                onClick={handleApplyHf}
                style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: 'var(--bg-primary)', color: '#ffffff', cursor: 'pointer', fontWeight: 500 }}
              >
                Apply Header & Footer
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Bates Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>Prefix:</label>
                <input
                  data-testid="input-bates-prefix"
                  value={batesPrefix}
                  onChange={(e) => setBatesPrefix(e.target.value)}
                  placeholder="e.g. CONF-"
                  style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>Suffix:</label>
                <input
                  data-testid="input-bates-suffix"
                  value={batesSuffix}
                  onChange={(e) => setBatesSuffix(e.target.value)}
                  placeholder="e.g. -PROD"
                  style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>Start Number:</label>
                <input
                  data-testid="input-bates-start"
                  type="number"
                  min="1"
                  value={batesStartNum}
                  onChange={(e) => setBatesStartNum(parseInt(e.target.value) || 1)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: 4 }}>Number of Digits:</label>
                <input
                  data-testid="input-bates-digits"
                  type="number"
                  min="1"
                  max="12"
                  value={batesNumDigits}
                  onChange={(e) => setBatesNumDigits(parseInt(e.target.value) || 6)}
                  style={{ width: '100%', padding: '6px 8px', fontSize: 12, border: '1px solid var(--bg-border)', borderRadius: 4 }}
                />
              </div>
            </div>

            <div style={{ fontSize: 13 }}>
              <label style={{ display: 'block', marginBottom: 4 }}>Position:</label>
              <select
                data-testid="select-bates-position"
                value={batesPosition}
                onChange={(e) => setBatesPosition(e.target.value as BatesPosition)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: 4, border: '1px solid var(--bg-border)' }}
              >
                <option value="bottomRight">Bottom Right</option>
                <option value="bottomCenter">Bottom Center</option>
                <option value="bottomLeft">Bottom Left</option>
                <option value="topRight">Top Right</option>
                <option value="topCenter">Top Center</option>
                <option value="topLeft">Top Left</option>
              </select>
            </div>

            <div style={{ fontSize: 12, backgroundColor: 'var(--bg-secondary)', padding: 8, borderRadius: 4 }}>
              Preview: <strong>{batesPrefix}{String(batesStartNum).padStart(batesNumDigits, '0')}{batesSuffix}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button
                data-testid="btn-bates-cancel"
                onClick={onClose}
                style={{ padding: '6px 14px', borderRadius: 4, border: '1px solid var(--bg-border)', background: 'transparent', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                data-testid="btn-bates-apply"
                onClick={handleApplyBates}
                style={{ padding: '6px 16px', borderRadius: 4, border: 'none', background: 'var(--bg-primary)', color: '#ffffff', cursor: 'pointer', fontWeight: 500 }}
              >
                Apply Bates Numbering
              </button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
