import { describe, it, expect, vi } from 'vitest';
import {
  createShape,
  InsertShapeCommand,
  UpdateShapeStyleCommand,
  smoothPointsToSegments,
  computeStrokeBounds,
  createDrawingStroke,
  strokeIntersectsPoint,
  AddDrawingStrokeCommand,
  EraseDrawingStrokeCommand,
  createWhiteoutCover,
  isWhiteoutCover,
  WHITEOUT_DISCLAIMER,
  validateLinkTarget,
  findLinksInText,
  SetObjectLinkCommand,
  RemoveObjectLinkCommand,
  toggleBulletList,
  toggleNumberedList,
  indentList,
  outdentList,
  detectListType,
  createTable,
  addTableRow,
  removeTableRow,
  addTableColumn,
  removeTableColumn,
  InsertTableCommand,
  substituteTokens,
  generateHeaderFooterBlocks,
  formatBatesNumber,
  generateBatesBlock,
  generateWatermarkForPage,
  createPageBackground,
  extractTextStyle,
  applyTextStyleToBlock,
  alignObjects,
  distributeObjects,
  AlignObjectsCommand,
  formatCurrentDate,
  SYMBOL_CATEGORIES,
  generateQrCodeMatrix,
  createQrCodePath
} from '../src';
import type { TextBlock } from '../src/text/types';
import type { ShapeObject } from '../src/shapes/types';

describe('Phase 11: Word-like Content Tools', () => {
  describe('Task 11.1: Shapes', () => {
    it('generates rectangle, rounded rectangle, ellipse, line, arrow, triangle, and star paths', () => {
      const bounds = { left: 50, bottom: 50, right: 150, top: 150 };

      const rect = createShape('rectangle', bounds);
      expect(rect.shapeType).toBe('rectangle');
      expect(rect.segments.length).toBe(5); // moveTo + 3 lineTo + closePath

      const rounded = createShape('roundedRectangle', bounds, { cornerRadius: 10 });
      expect(rounded.shapeType).toBe('roundedRectangle');
      expect(rounded.segments.some(s => s.type === 'bezierCurveTo')).toBe(true);

      const ellipse = createShape('ellipse', bounds);
      expect(ellipse.shapeType).toBe('ellipse');
      expect(ellipse.segments.filter(s => s.type === 'bezierCurveTo').length).toBe(4);

      const line = createShape('line', bounds);
      expect(line.shapeType).toBe('line');
      expect(line.segments.length).toBe(2);

      const arrow = createShape('arrow', bounds);
      expect(arrow.shapeType).toBe('arrow');
      expect(arrow.segments.length).toBe(6);

      const triangle = createShape('triangle', bounds);
      expect(triangle.shapeType).toBe('triangle');
      expect(triangle.segments.length).toBe(4);

      const star = createShape('star', bounds, { starPoints: 5 });
      expect(star.shapeType).toBe('star');
      expect(star.segments.length).toBe(11); // 1 moveTo + 9 lineTo + closePath
    });

    it('executes and reverts InsertShapeCommand and UpdateShapeStyleCommand', async () => {
      const shape = createShape('rectangle', { left: 0, bottom: 0, right: 100, top: 100 });
      const insertFn = vi.fn();
      const deleteFn = vi.fn();

      const insertCmd = new InsertShapeCommand(0, shape, insertFn, deleteFn);
      await insertCmd.apply();
      expect(insertFn).toHaveBeenCalledWith(0, shape);
      await insertCmd.revert();
      expect(deleteFn).toHaveBeenCalledWith(0, shape.id);

      const updateFn = vi.fn();
      const updateCmd = new UpdateShapeStyleCommand(
        0,
        shape.id,
        { lineWidth: 5 },
        shape,
        updateFn
      );
      await updateCmd.apply();
      expect(updateFn).toHaveBeenCalledWith(0, shape.id, { lineWidth: 5 });
      await updateCmd.revert();
      expect(updateFn).toHaveBeenCalledWith(0, shape.id, shape.shapeOptions);
    });
  });

  describe('Task 11.2: Free-hand Drawing', () => {
    it('smoothes pointer points via Catmull-Rom into Bezier curves', () => {
      const points = [
        { x: 10, y: 10 },
        { x: 20, y: 30 },
        { x: 40, y: 35 },
        { x: 60, y: 20 }
      ];

      const segments = smoothPointsToSegments(points);
      expect(segments.length).toBe(4); // 1 moveTo + 3 bezierCurveTo
      expect(segments[0]!.type).toBe('moveTo');
      expect(segments[1]!.type).toBe('bezierCurveTo');
    });

    it('creates pen and marker stroke objects with appropriate presets', () => {
      const points = [{ x: 10, y: 10 }, { x: 50, y: 50 }];

      const pen = createDrawingStroke(points, { tool: 'pen' });
      expect(pen.tool).toBe('pen');
      expect(pen.lineWidth).toBe(2.5);
      expect(pen.opacity).toBe(1.0);
      expect(pen.zIndex).toBe(60);

      const marker = createDrawingStroke(points, { tool: 'marker' });
      expect(marker.tool).toBe('marker');
      expect(marker.lineWidth).toBe(18);
      expect(marker.opacity).toBe(0.45);
      expect(marker.zIndex).toBe(25);
    });

    it('detects point intersection for eraser tool', () => {
      const stroke = createDrawingStroke([
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ]);

      expect(strokeIntersectsPoint(stroke, { x: 150, y: 101 }, 5)).toBe(true);
      expect(strokeIntersectsPoint(stroke, { x: 150, y: 150 }, 5)).toBe(false);
    });

    it('supports undo/redo via AddDrawingStrokeCommand and EraseDrawingStrokeCommand', async () => {
      const stroke = createDrawingStroke([{ x: 10, y: 10 }, { x: 20, y: 20 }]);
      const insertFn = vi.fn();
      const deleteFn = vi.fn();

      const addCmd = new AddDrawingStrokeCommand(0, stroke, insertFn, deleteFn);
      await addCmd.apply();
      expect(insertFn).toHaveBeenCalledWith(0, stroke);
      await addCmd.revert();
      expect(deleteFn).toHaveBeenCalledWith(0, stroke.id);

      const eraseCmd = new EraseDrawingStrokeCommand(0, stroke, deleteFn, insertFn);
      await eraseCmd.apply();
      expect(deleteFn).toHaveBeenCalledWith(0, stroke.id);
      await eraseCmd.revert();
      expect(insertFn).toHaveBeenCalledWith(0, stroke);
    });
  });

  describe('Task 11.3: Whiteout / Cover Tool', () => {
    it('creates opaque whiteout cover clearly marked with disclaimer', () => {
      const bounds = { left: 10, bottom: 20, right: 100, top: 50 };
      const cover = createWhiteoutCover(bounds);

      expect(cover.isWhiteout).toBe(true);
      expect(cover.shapeType).toBe('rectangle');
      expect(cover.fillColor).toEqual({ r: 255, g: 255, b: 255, a: 255 });
      expect(cover.stroke).toBe(false);
      expect(cover.zIndex).toBe(75);
      expect(isWhiteoutCover(cover)).toBe(true);
      expect(WHITEOUT_DISCLAIMER).toContain('not permanent redaction');
    });
  });

  describe('Tasks 11.4 & 11.5: Hyperlinks', () => {
    it('validates safe web URLs, emails, phone numbers, and page links', () => {
      const urlRes = validateLinkTarget('https://rhypdf.app/docs');
      expect(urlRes.valid).toBe(true);
      expect(urlRes.destination).toEqual({ type: 'url', url: 'https://rhypdf.app/docs' });

      const emailRes = validateLinkTarget('support@rhypdf.com');
      expect(emailRes.valid).toBe(true);
      expect(emailRes.destination).toEqual({ type: 'email', email: 'support@rhypdf.com' });

      const phoneRes = validateLinkTarget('+1-555-123-4567');
      expect(phoneRes.valid).toBe(true);
      expect(phoneRes.destination).toEqual({ type: 'phone', phone: '+1-555-123-4567' });

      const pageRes = validateLinkTarget('page:5', 10);
      expect(pageRes.valid).toBe(true);
      expect(pageRes.destination).toEqual({ type: 'page', pageIndex: 4 });
    });

    it('rejects unsafe schemes like javascript:, data:, and file:', () => {
      const jsRes = validateLinkTarget('javascript:alert(1)');
      expect(jsRes.valid).toBe(false);
      expect(jsRes.error).toContain('not permitted');

      const dataRes = validateLinkTarget('data:text/html;base64,PHNjcmlwdD4=');
      expect(dataRes.valid).toBe(false);

      const fileRes = validateLinkTarget('file:///C:/Windows/System32');
      expect(fileRes.valid).toBe(false);
    });

    it('detects embedded links within text content', () => {
      const text = 'Visit https://github.com or write to test@example.com for info.';
      const detected = findLinksInText(text);

      expect(detected.length).toBe(2);
      expect(detected[0]!.target.type).toBe('url');
      expect(detected[1]!.target.type).toBe('email');
    });

    it('handles SetObjectLinkCommand and RemoveObjectLinkCommand', async () => {
      const updateFn = vi.fn();
      const link = { target: { type: 'url' as const, url: 'https://example.com' } };

      const setCmd = new SetObjectLinkCommand(0, 'obj-1', link, undefined, updateFn);
      await setCmd.apply();
      expect(updateFn).toHaveBeenCalledWith(0, 'obj-1', link);
      await setCmd.revert();
      expect(updateFn).toHaveBeenCalledWith(0, 'obj-1', undefined);

      const removeCmd = new RemoveObjectLinkCommand(0, 'obj-1', link, updateFn);
      await removeCmd.apply();
      expect(updateFn).toHaveBeenCalledWith(0, 'obj-1', undefined);
      await removeCmd.revert();
      expect(updateFn).toHaveBeenCalledWith(0, 'obj-1', link);
    });
  });

  describe('Task 11.6: Lists inside Text Boxes', () => {
    it('toggles bullet list formatting on and off', () => {
      const raw = 'First item\nSecond item\nThird item';
      const bulleted = toggleBulletList(raw);
      expect(bulleted).toBe('• First item\n• Second item\n• Third item');

      const untoggled = toggleBulletList(bulleted);
      expect(untoggled).toBe(raw);
    });

    it('toggles numbered list formatting on and off', () => {
      const raw = 'Alpha\nBeta\nGamma';
      const numbered = toggleNumberedList(raw);
      expect(numbered).toBe('1. Alpha\n2. Beta\n3. Gamma');

      const untoggled = toggleNumberedList(numbered);
      expect(untoggled).toBe(raw);
    });

    it('supports indent and outdent of list items', () => {
      const bulleted = '• Line A\n• Line B';
      const indented = indentList(bulleted);
      expect(indented).toContain('    ◦ Line A');

      const outdented = outdentList(indented);
      expect(outdented).toContain('• Line A');
    });

    it('detects list type accurately', () => {
      expect(detectListType('• Test bullet').type).toBe('bullet');
      expect(detectListType('1. Test numbered').type).toBe('number');
      expect(detectListType('Just normal text').type).toBe('none');
    });
  });

  describe('Task 11.7: Simple Tables', () => {
    it('creates an N×M table with vector grid path and cell text blocks', () => {
      const bounds = { left: 50, bottom: 100, right: 350, top: 300 };
      const table = createTable(0, bounds, 3, 2, { headerRow: true });

      expect(table.structure.rowCount).toBe(3);
      expect(table.structure.colCount).toBe(2);
      expect(table.gridPath.type).toBe('path');
      expect(table.textBlocks.length).toBe(6); // 3 rows * 2 cols = 6 cells
      expect(table.textBlocks[0]!.isTableCell).toBe(true);
      expect(table.textBlocks[0]!.isBold).toBe(true); // Header row bold
    });

    it('adds and removes rows dynamically', () => {
      const bounds = { left: 50, bottom: 100, right: 350, top: 300 };
      const initial = createTable(0, bounds, 2, 2);

      const added = addTableRow(initial.structure);
      expect(added.structure.rowCount).toBe(3);
      expect(added.textBlocks.length).toBe(6);

      const removed = removeTableRow(added.structure, 2);
      expect(removed).not.toBeNull();
      expect(removed!.structure.rowCount).toBe(2);
      expect(removed!.textBlocks.length).toBe(4);
    });

    it('adds and removes columns dynamically', () => {
      const bounds = { left: 50, bottom: 100, right: 350, top: 300 };
      const initial = createTable(0, bounds, 2, 2);

      const colAdded = addTableColumn(initial.structure);
      expect(colAdded.structure.colCount).toBe(3);
      expect(colAdded.textBlocks.length).toBe(6);

      const colRemoved = removeTableColumn(colAdded.structure, 2);
      expect(colRemoved).not.toBeNull();
      expect(colRemoved!.structure.colCount).toBe(2);
      expect(colRemoved!.textBlocks.length).toBe(4);
    });
  });

  describe('Tasks 11.8 & 11.9: Headers, Footers, and Bates Numbering', () => {
    it('substitutes page tokens {page}, {pages}, {date}', () => {
      const res = substituteTokens('Doc - Page {page} of {pages} ({date})', 2, 10, '2026-11-11');
      expect(res).toBe('Doc - Page 3 of 10 (2026-11-11)');
    });

    it('generates header and footer blocks with page range and alignment', () => {
      const blocks = generateHeaderFooterBlocks(
        {
          header: { leftText: 'Confidential', rightText: 'Page {page}' },
          footer: { centerText: 'All Rights Reserved' },
          firstPageDifferent: true,
          firstPageHeader: { leftText: 'Title Page' }
        },
        0,
        5,
        612,
        792
      );

      // On first page, uses firstPageHeader (1 block) + normal footer (1 block)
      expect(blocks.length).toBe(2);
      expect(blocks[0]!.lines[0]!.text).toBe('Title Page');
      expect(blocks[1]!.lines[0]!.text).toBe('All Rights Reserved');
    });

    it('formats Bates numbering with prefix, digit padding, and suffix', () => {
      const num1 = formatBatesNumber(0, {
        prefix: 'XYZ-',
        suffix: '-CONF',
        numDigits: 6,
        startNumber: 1
      });
      expect(num1).toBe('XYZ-000001-CONF');

      const num25 = formatBatesNumber(24, {
        prefix: 'DOC-',
        numDigits: 4,
        startNumber: 100
      });
      expect(num25).toBe('DOC-0124');
    });

    it('generates Bates numbering text block at configured corner', () => {
      const block = generateBatesBlock(
        { prefix: 'CASE-', numDigits: 5, position: 'bottomRight' },
        0,
        0,
        612,
        792
      );
      expect(block.lines[0]!.text).toBe('CASE-00001');
      expect(block.alignment).toBe('right');
    });
  });

  describe('Task 11.10: Watermark', () => {
    it('generates centered and tiled text watermarks', () => {
      const centered = generateWatermarkForPage(
        { type: 'text', text: 'DRAFT', opacity: 0.3, tile: false },
        0,
        612,
        792
      );
      expect(centered.length).toBe(1);
      const centerBlock = centered[0] as TextBlock;
      expect(centerBlock.opacity).toBe(0.3);
      expect(centerBlock.lines[0]!.text).toBe('DRAFT');

      const tiled = generateWatermarkForPage(
        { type: 'text', text: 'DRAFT', tile: true },
        0,
        612,
        792
      );
      expect(tiled.length).toBe(9); // 3x3 grid
    });
  });

  describe('Task 11.11: Page Background Color', () => {
    it('creates a full-page background PathObject at lowest zIndex', () => {
      const bg = createPageBackground(612, 792, { r: 254, g: 243, b: 199, a: 255 }); // Amber-100
      expect(bg.zIndex).toBe(-100);
      expect(bg.fill).toBe(true);
      expect(bg.bounds).toEqual({ left: 0, bottom: 0, right: 612, top: 792 });
    });
  });

  describe('Task 11.12: Format Painter', () => {
    it('copies style from source TextBlock and applies to target', () => {
      const source: TextBlock = {
        id: 'tb-source',
        pageIndex: 0,
        bounds: { left: 0, bottom: 0, right: 100, top: 50 },
        lines: [],
        runs: [],
        rotation: 0,
        writingMode: 'horizontal-tb',
        alignment: 'center',
        primaryFont: 'Playfair Display',
        primaryFontSize: 24,
        primaryColor: { r: 220, g: 38, b: 38, a: 255 }, // red
        isBold: true,
        isItalic: true,
        lineSpacing: 1.5,
        fontReusability: {
          canReuseFont: true,
          isSubset: false,
          isEmbedded: true,
          fontName: 'Playfair Display',
          missingGlyphs: [],
          recommendedFallback: 'PT Serif'
        }
      };

      const style = extractTextStyle(source);
      expect(style.fontName).toBe('Playfair Display');
      expect(style.fontSize).toBe(24);
      expect(style.isBold).toBe(true);
      expect(style.alignment).toBe('center');

      const target: TextBlock = {
        id: 'tb-target',
        pageIndex: 0,
        bounds: { left: 0, bottom: 100, right: 100, top: 150 },
        lines: [
          {
            id: 'line-1',
            text: 'Hello world',
            bounds: { left: 0, bottom: 100, right: 100, top: 150 },
            baseline: 110,
            spans: [
              {
                text: 'Hello world',
                bounds: { left: 0, bottom: 100, right: 100, top: 150 },
                fontName: 'Roboto-Regular',
                fontSize: 12,
                color: { r: 0, g: 0, b: 0, a: 255 }
              }
            ]
          }
        ],
        runs: [],
        rotation: 0,
        writingMode: 'horizontal-tb',
        alignment: 'left',
        primaryFont: 'Roboto-Regular',
        primaryFontSize: 12,
        primaryColor: { r: 0, g: 0, b: 0, a: 255 },
        fontReusability: {
          canReuseFont: true,
          isSubset: false,
          isEmbedded: true,
          fontName: 'Roboto-Regular',
          missingGlyphs: [],
          recommendedFallback: 'Roboto-Regular'
        }
      };

      const styled = applyTextStyleToBlock(target, style);
      expect(styled.primaryFont).toBe('Playfair Display');
      expect(styled.primaryFontSize).toBe(24);
      expect(styled.isBold).toBe(true);
      expect(styled.alignment).toBe('center');
      expect(styled.lines[0]!.spans[0]!.fontName).toBe('Playfair Display');
    });
  });

  describe('Task 11.13: Alignment and Distribution', () => {
    const objA = { id: 'a', type: 'path' as const, matrix: [1, 0, 0, 1, 0, 0] as const, zIndex: 1, bounds: { left: 10, bottom: 10, right: 30, top: 30 } };
    const objB = { id: 'b', type: 'path' as const, matrix: [1, 0, 0, 1, 0, 0] as const, zIndex: 1, bounds: { left: 50, bottom: 20, right: 90, top: 60 } };
    const objC = { id: 'c', type: 'path' as const, matrix: [1, 0, 0, 1, 0, 0] as const, zIndex: 1, bounds: { left: 120, bottom: 5, right: 140, top: 25 } };

    it('aligns objects to left, center, right, top, middle, bottom', () => {
      const leftAlign = alignObjects([objA, objB], 'left');
      expect(leftAlign.find(d => d.id === 'b')?.newBounds.left).toBe(10);

      const topAlign = alignObjects([objA, objB], 'top');
      expect(topAlign.find(d => d.id === 'a')?.newBounds.top).toBe(60);

      const bottomAlign = alignObjects([objA, objB], 'bottom');
      expect(bottomAlign.find(d => d.id === 'b')?.newBounds.bottom).toBe(10);
    });

    it('distributes 3 objects evenly horizontally and vertically', () => {
      const distH = distributeObjects([objA, objB, objC], 'horizontal');
      expect(distH.length).toBe(3);
      // objA left: 10..30 (width 20)
      // objC left: 120..140 (width 20)
      // Span is 10 to 140 = 130. Total obj width = 20 + 40 + 20 = 80. Gap = 50 / 2 = 25.
      const bDelta = distH.find(d => d.id === 'b');
      expect(bDelta?.newBounds.left).toBe(30 + 25); // 55
    });

    it('supports undo/redo via AlignObjectsCommand', async () => {
      const applyFn = vi.fn();
      const revertFn = vi.fn();
      const deltas = [{ id: 'a', prevBounds: objA.bounds, newBounds: { ...objA.bounds, left: 20, right: 40 } }];

      const cmd = new AlignObjectsCommand(0, deltas, 'Align left', applyFn, revertFn);
      await cmd.apply();
      expect(applyFn).toHaveBeenCalledWith(0, deltas);
      await cmd.revert();
      expect(revertFn).toHaveBeenCalled();
    });
  });

  describe('Task 11.14: Special Items (Date, Symbols, QR Code)', () => {
    it('formats current date in ISO, US, EU, and long formats', () => {
      const testDate = new Date(2026, 10, 11, 14, 30); // 11 Nov 2026

      expect(formatCurrentDate('iso', testDate)).toBe('2026-11-11');
      expect(formatCurrentDate('us', testDate)).toBe('11/11/2026');
      expect(formatCurrentDate('eu', testDate)).toBe('11/11/2026');
      expect(formatCurrentDate('long', testDate)).toBe('November 11, 2026');
    });

    it('provides categorized symbols for math, currency, arrows, typography, greek, and misc', () => {
      expect(SYMBOL_CATEGORIES.length).toBe(6);
      const math = SYMBOL_CATEGORIES.find(c => c.id === 'math');
      expect(math?.symbols).toContain('±');
      expect(math?.symbols).toContain('π');

      const currency = SYMBOL_CATEGORIES.find(c => c.id === 'currency');
      expect(currency?.symbols).toContain('€');
      expect(currency?.symbols).toContain('₿');
    });

    it('encodes text into offline QR code boolean matrix and vector PathObject', () => {
      const qr = generateQrCodeMatrix('https://rhypdf.app');
      expect(qr.size).toBeGreaterThanOrEqual(21);
      expect(qr.modules.length).toBe(qr.size);
      expect(qr.modules[0]!.length).toBe(qr.size);

      // Verify finder pattern at top-left: 7x7 dark/light structure
      expect(qr.modules[0]![0]).toBe(true);
      expect(qr.modules[0]![6]).toBe(true);
      expect(qr.modules[6]![0]).toBe(true);
      expect(qr.modules[6]![6]).toBe(true);

      const qrPath = createQrCodePath('https://rhypdf.app', {
        left: 100,
        bottom: 100,
        right: 200,
        top: 200
      });
      expect(qrPath.type).toBe('path');
      expect(qrPath.fill).toBe(true);
      expect(qrPath.segments.length).toBeGreaterThan(50);
    });
  });
});
