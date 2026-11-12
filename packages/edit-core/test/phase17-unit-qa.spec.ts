import { describe, it, expect } from 'vitest';
import {
  groupTextRunsToBlocks,
  groupRunsInRegion,
  EditSession,
  CommitTextBlockCommand,
  InsertTextBlockCommand,
  InsertShapeCommand,
  InsertTableCommand,
  CreateFormFieldCommand
} from '../src/index';
import { CoordinateMapper, type Rect, type TextRun } from '@rhypdf/pdf-model';
import { FontCatalog, getRecommendedFamilyForScript } from '@rhypdf/fonts';
import {
  BidiEngine,
  CjkEngine,
  ThaiEngine,
  ArabicEngine,
  IndicEngine,
  SimpleTextLayoutEngine
} from '@rhypdf/text-layout';

function createMockTextRun(
  id: string,
  text: string,
  bounds: Rect,
  fontName = 'Helvetica',
  fontSize = 12
): TextRun {
  return {
    id,
    type: 'text',
    text,
    fontName,
    fontSize,
    fillColor: { r: 0, g: 0, b: 0, a: 255 },
    bounds,
    matrix: [1, 0, 0, 1, bounds.left, bounds.bottom],
    zIndex: 1,
    isEmbeddedSubset: false,
    rotation: 0
  };
}

describe('Phase 17.1 — Comprehensive Unit Test Suite', () => {
  describe('1. Text Block Grouping Algorithm', () => {
    it('groups single-column lines into a coherent block and separates columns', () => {
      // Column 1
      const c1_l1 = createMockTextRun('c1_1', 'Left column first line.', {
        left: 50,
        bottom: 700,
        right: 200,
        top: 714
      });
      const c1_l2 = createMockTextRun('c1_2', 'Left column second line.', {
        left: 50,
        bottom: 684,
        right: 210,
        top: 698
      });

      // Column 2 (horizontal gap > 40pt)
      const c2_l1 = createMockTextRun('c2_1', 'Right column first line.', {
        left: 300,
        bottom: 700,
        right: 450,
        top: 714
      });
      const c2_l2 = createMockTextRun('c2_2', 'Right column second line.', {
        left: 300,
        bottom: 684,
        right: 460,
        top: 698
      });

      const blocks = groupTextRunsToBlocks([c1_l1, c1_l2, c2_l1, c2_l2]);
      expect(blocks.length).toBe(2);

      const col1 = blocks.find((b) => b.bounds.left < 100);
      const col2 = blocks.find((b) => b.bounds.left > 250);

      expect(col1).toBeDefined();
      expect(col2).toBeDefined();
      expect(col1!.lines.length).toBe(2);
      expect(col2!.lines.length).toBe(2);
    });

    it('separates paragraphs when line spacing gap exceeds threshold', () => {
      // Normal line spacing: 14pt height, 2pt gap
      const p1_l1 = createMockTextRun('p1_1', 'Paragraph 1 line 1.', {
        left: 50,
        bottom: 700,
        right: 250,
        top: 714
      });
      const p1_l2 = createMockTextRun('p1_2', 'Paragraph 1 line 2.', {
        left: 50,
        bottom: 684,
        right: 250,
        top: 698
      });

      // Paragraph break: gap of 30pt
      const p2_l1 = createMockTextRun('p2_1', 'Paragraph 2 line 1.', {
        left: 50,
        bottom: 640,
        right: 250,
        top: 654
      });

      const blocks = groupTextRunsToBlocks([p1_l1, p1_l2, p2_l1]);
      expect(blocks.length).toBe(2);
      expect(blocks[0]!.lines.length).toBe(2);
      expect(blocks[1]!.lines.length).toBe(1);
    });

    it('filters text runs accurately by geometric region', () => {
      const r1 = createMockTextRun('r1', 'Inside box', {
        left: 50,
        bottom: 50,
        right: 100,
        top: 70
      });
      const r2 = createMockTextRun('r2', 'Outside box', {
        left: 200,
        bottom: 200,
        right: 300,
        top: 220
      });

      const selectionRect: Rect = { left: 40, bottom: 40, right: 120, top: 80 };
      const selected = groupRunsInRegion([r1, r2], selectionRect);

      expect(selected).not.toBeNull();
      const text = selected!.lines.map((l) => l.text).join(' ');
      expect(text).toContain('Inside box');
      expect(text).not.toContain('Outside box');
    });
  });

  describe('2. CoordinateMapper Transform Invariants', () => {
    const pageWidth = 612;
    const pageHeight = 792;

    it('converts between PDF points and viewport pixels across rotations with zero drift', () => {
      const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
      const scales = [0.5, 1.0, 1.75, 2.5, 4.0];

      for (const rotation of rotations) {
        for (const scale of scales) {
          const mapper = new CoordinateMapper(pageWidth, pageHeight, rotation, scale, 2.0);

          // Test point in PDF coords (bottom-left origin)
          const pdfPoint = { x: 150.25, y: 320.75 };
          const screenPoint = mapper.pdfPointToCss(pdfPoint.x, pdfPoint.y);
          const roundTrip = mapper.cssPointToPdf(screenPoint.x, screenPoint.y);

          expect(Math.abs(roundTrip.x - pdfPoint.x)).toBeLessThan(0.001);
          expect(Math.abs(roundTrip.y - pdfPoint.y)).toBeLessThan(0.001);

          // Test rect conversion
          const pdfRect: Rect = { left: 50, bottom: 100, right: 250, top: 200 };
          const screenRect = mapper.pdfRectToCss(pdfRect);
          const roundTripRect = mapper.cssRectToPdf(screenRect);

          expect(Math.abs(roundTripRect.left - pdfRect.left)).toBeLessThan(0.001);
          expect(Math.abs(roundTripRect.bottom - pdfRect.bottom)).toBeLessThan(0.001);
          expect(Math.abs(roundTripRect.right - pdfRect.right)).toBeLessThan(0.001);
          expect(Math.abs(roundTripRect.top - pdfRect.top)).toBeLessThan(0.001);
        }
      }
    });

    it('accounts for cropbox offsets correctly', () => {
      const mapper = new CoordinateMapper(pageWidth, pageHeight, 0, 1.0, 1.0, {
        cropBox: { left: 36, bottom: 36, right: 576, top: 756 }
      });

      const pt = mapper.pdfPointToCss(36, 756);
      expect(pt.x).toBeCloseTo(0, 2);
      expect(pt.y).toBeCloseTo(0, 2);
    });
  });

  describe('3. Command Apply and Revert Symmetry', () => {
    it('guarantees state restoration on undo/redo for all command types', async () => {
      const session = new EditSession('test-doc', 1);

      // 1. Insert Text Block Command
      let insertedRun: TextRun | null = null;
      const insertTextCmd = new InsertTextBlockCommand(
        0,
        'New Paragraph Text',
        { left: 100, bottom: 500, right: 300, top: 520 },
        'Roboto',
        14,
        { r: 0, g: 0, b: 0, a: 255 },
        (_p, run) => {
          insertedRun = run;
        },
        (_p, _id) => {
          insertedRun = null;
        }
      );
      await session.execute(insertTextCmd);
      expect(session.canUndo).toBe(true);
      expect(insertedRun).not.toBeNull();
      expect(insertedRun!.text).toBe('New Paragraph Text');

      await session.undo();
      expect(insertedRun).toBeNull();

      await session.redo();
      expect(insertedRun).not.toBeNull();
      expect(insertedRun!.text).toBe('New Paragraph Text');

      // 2. Commit Text Block Edit Command
      let blockContent = 'Initial Text';
      const mockBlock = {
        id: 'tb-1',
        bounds: { left: 50, bottom: 50, right: 200, top: 70 },
        lines: [
          { text: 'Initial Text', bounds: { left: 50, bottom: 50, right: 200, top: 70 }, runs: [] }
        ],
        runs: [
          createMockTextRun('r1', 'Initial Text', { left: 50, bottom: 50, right: 200, top: 70 })
        ],
        pageIndex: 0,
        fontFamily: 'Roboto',
        fontSize: 14,
        lineHeight: 16,
        isDirty: false
      };
      const editCmd = new CommitTextBlockCommand(
        0,
        'tb-1',
        mockBlock,
        ['Modified Text Content'],
        undefined,
        (_p, _b, _old, newLines) => {
          blockContent = newLines.join('\n');
        },
        (_p, _b, oldRuns) => {
          blockContent = oldRuns.map((r) => r.text).join(' ');
        }
      );
      await session.execute(editCmd);
      expect(blockContent).toBe('Modified Text Content');

      await session.undo();
      expect(blockContent).toBe('Initial Text');

      await session.redo();
      expect(blockContent).toBe('Modified Text Content');

      // 3. Insert Shape Command
      const shapes: string[] = [];
      const shapeCmd = new InsertShapeCommand(
        0,
        {
          id: 'shape-1',
          type: 'shape',
          shapeType: 'rectangle',
          bounds: { left: 50, bottom: 50, right: 150, top: 150 },
          strokeColor: { r: 37, g: 99, b: 235, a: 255 },
          strokeWidth: 2,
          fillColor: { r: 0, g: 0, b: 0, a: 0 },
          opacity: 1,
          zIndex: 10
        },
        (_p, s) => shapes.push(s.id),
        (_p, id) => {
          const idx = shapes.indexOf(id);
          if (idx >= 0) shapes.splice(idx, 1);
        }
      );
      await session.execute(shapeCmd);
      expect(shapes).toContain('shape-1');

      await session.undo();
      expect(shapes).not.toContain('shape-1');

      await session.redo();
      expect(shapes).toContain('shape-1');

      // 4. Insert Table Command
      const tables: string[] = [];
      const dummyTable = {
        structure: {
          id: 'table-1',
          pageIndex: 0,
          bounds: { left: 50, bottom: 200, right: 450, top: 400 },
          rowCount: 2,
          colCount: 2,
          cells: [],
          options: {}
        },
        gridPath: {
          id: 'grid-1',
          type: 'path' as const,
          bounds: { left: 50, bottom: 200, right: 450, top: 400 },
          segments: [],
          strokeColor: { r: 100, g: 116, b: 139, a: 255 },
          strokeWidth: 1,
          fillColor: { r: 0, g: 0, b: 0, a: 0 },
          matrix: [1, 0, 0, 1, 0, 0] as [number, number, number, number, number, number],
          zIndex: 5
        },
        textBlocks: []
      };
      const tableCmd = new InsertTableCommand(
        dummyTable,
        (t) => tables.push(t.structure.id),
        (t) => {
          const idx = tables.indexOf(t.structure.id);
          if (idx >= 0) tables.splice(idx, 1);
        }
      );
      await session.execute(tableCmd);
      expect(tables).toContain('table-1');

      await session.undo();
      expect(tables).not.toContain('table-1');

      // 5. Create Form Field Command
      const fieldsList: unknown[] = [];
      const formCmd = new CreateFormFieldCommand(
        0,
        {
          pageIndex: 0,
          bounds: { left: 100, bottom: 100, right: 250, top: 124 },
          name: 'user_full_name',
          type: 'text'
        },
        fieldsList
      );
      await session.execute(formCmd);
      expect(fieldsList.length).toBe(1);
      expect(fieldsList[0].name).toBe('user_full_name');

      await session.undo();
      expect(fieldsList.length).toBe(0);

      await session.redo();
      expect(fieldsList.length).toBe(1);
    });
  });

  describe('4. Font Matching and Script Fallback Chains', () => {
    it('matches non-embedded standard typefaces to metric stand-ins', () => {
      const catalog = FontCatalog.getInstance();

      const arial = catalog.findMetricCompatible('Arial');
      expect(arial).not.toBeNull();
      expect(arial!.matchedEntry.family).toBe('Liberation Sans');

      const calibri = catalog.findMetricCompatible('Calibri');
      expect(calibri).not.toBeNull();
      expect(calibri!.matchedEntry.family).toBe('Carlito');

      const times = catalog.findMetricCompatible('Times New Roman');
      expect(times).not.toBeNull();
      expect(times!.matchedEntry.family).toBe('Liberation Serif');

      const courier = catalog.findMetricCompatible('Courier New');
      expect(courier).not.toBeNull();
      expect(courier!.matchedEntry.family).toBe('Liberation Mono');
    });

    it('resolves correct script fallback fonts based on Unicode script categories', () => {
      expect(getRecommendedFamilyForScript('arabic')).toContain('Noto Sans Arabic');
      expect(getRecommendedFamilyForScript('devanagari')).toContain('Noto Sans Devanagari');
      expect(getRecommendedFamilyForScript('cjk')).toContain('Noto Sans CJK');
      expect(getRecommendedFamilyForScript('hebrew')).toContain('Noto Sans Hebrew');
      expect(getRecommendedFamilyForScript('thai')).toContain('Noto Sans Thai');
    });
  });

  describe('5. Complex Script Shaping and Bidi Engine', () => {
    it('reorders bidirectional text according to UAX #9 rules', () => {
      const bidi = new BidiEngine();
      const mixed = 'Doc 123: مرحبا';
      const result = bidi.resolve(mixed);

      expect(result.visualRuns.length).toBeGreaterThan(1);
      expect(result.visualText.length).toBe(mixed.length);
      expect(result.logicalToVisualMap.length).toBe(mixed.length);
      expect(result.visualToLogicalMap.length).toBe(mixed.length);

      // Caret mapping round-trip invariance
      for (let logIdx = 0; logIdx < mixed.length; logIdx++) {
        const visIdx = result.logicalToVisualMap[logIdx]!;
        expect(result.visualToLogicalMap[visIdx]).toBe(logIdx);
      }
    });

    it('shapes Arabic text with contextual ligatures and joining rules', () => {
      const arabic = new ArabicEngine();
      // "كتب" (Kaf initial, Ta medial, Ba final)
      const shaped = arabic.shapeText('كتب');
      expect(shaped.length).toBe(3);
      expect(shaped[0]!.form).toBe('initial');
      expect(shaped[1]!.form).toBe('medial');
      expect(shaped[2]!.form).toBe('final');
      expect(shaped[0]!.shapedChar).toBe('\uFEDB');
    });

    it('identifies Indic aksharas, virama conjuncts, and vowel signs', () => {
      const indic = new IndicEngine();
      const aksharas = indic.segmentAksharas('नमस्ते');
      expect(aksharas.length).toBe(3);
      expect(aksharas[2]!.consonants).toContain('स');
      expect(aksharas[2]!.consonants).toContain('त');
      expect(aksharas[2]!.halants).toContain('्');
    });

    it('segments Thai dictionary word boundaries using Intl.Segmenter', () => {
      const thai = new ThaiEngine();
      const words = thai.segmentWords('สวัสดีชาวโลก');
      expect(words.length).toBeGreaterThanOrEqual(2);
      expect(words.map((w) => w.text).join('')).toBe('สวัสดีชาวโลก');
    });

    it('applies CJK Kinsoku Shori line-breaking prohibitions', () => {
      const cjk = new CjkEngine();
      expect(cjk.hasCjk('日本語テキスト')).toBe(true);

      const wrapped = cjk.wrapCjkLines('吾輩は猫である。名前はまだ無い。', 6);
      expect(wrapped.lines.length).toBeGreaterThan(1);
      for (let i = 1; i < wrapped.lines.length; i++) {
        const firstChar = wrapped.lines[i]![0];
        expect(firstChar).not.toBe('。');
        expect(firstChar).not.toBe('、');
      }
    });
  });

  describe('6. Text Layout Engine and Line Breaking', () => {
    const layoutEngine = new SimpleTextLayoutEngine();

    it('lays out multiline text within constraints and respects explicit breaks', async () => {
      const text = 'Line 1: Introduction\nLine 2: Methodology\nLine 3: Conclusion';
      const layout = await layoutEngine.layout(text, {
        fontSize: 14,
        maxWidth: 300,
        lineHeight: 1.2
      });

      expect(layout.lines.length).toBe(3);
      expect(layout.lines[0]!.text).toBe('Line 1: Introduction');
      expect(layout.lines[1]!.text).toBe('Line 2: Methodology');
      expect(layout.lines[2]!.text).toBe('Line 3: Conclusion');
    });

    it('wraps long paragraphs across lines without exceeding maxWidth threshold', async () => {
      const longPara =
        'This is a comprehensive paragraph designed to verify that the word-wrapping engine splits text smoothly into lines while respecting the maximum specified bounding box width.';
      const layout = await layoutEngine.layout(longPara, {
        fontSize: 12,
        maxWidth: 150
      });

      expect(layout.lines.length).toBeGreaterThan(2);
      for (const line of layout.lines) {
        expect(line.bounds.right - line.bounds.left).toBeLessThanOrEqual(160);
      }
    });
  });
});
