import { describe, it, expect } from 'vitest';
import type { TextRun, Rect } from '@rhypdf/pdf-model';
import {
  groupTextRunsToBlocks,
  groupRunsInRegion,
  detectFontReusability,
  findInTextBlocks,
  checkReplacementOverflow,
  applyReplacementToBlock,
  CommitTextBlockCommand,
  InsertTextBlockCommand,
  DeleteTextBlockCommand,
  MoveTextBlockCommand,
  ResizeTextBlockWidthCommand,
  RotateTextBlockCommand,
  BatchReplaceTextCommand,
  SetFontFamilyCommand,
  SetFontSizeCommand,
  SetTextStyleCommand,
  SetTextColorCommand,
  SetTextHighlightColorCommand,
  SetTextAlignmentCommand,
  SetTextSpacingCommand,
  EditSession
} from '../src/index';

function createMockTextRun(
  id: string,
  text: string,
  bounds: Rect,
  fontName = 'Helvetica',
  fontSize = 12,
  options?: Partial<TextRun>
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
    rotation: 0,
    ...options
  };
}

describe('Phase 7: Text Grouping, Detection, and Operations', () => {
  describe('Task 7.2: Grouping runs into lines and blocks', () => {
    it('groups single-column lines into a coherent text block', () => {
      // 3 consecutive lines of paragraph text in single column
      const r1 = createMockTextRun('r1', 'First line of contract paragraph.', {
        left: 50,
        bottom: 700,
        right: 250,
        top: 714
      });
      const r2 = createMockTextRun('r2', 'Second line continuing the text.', {
        left: 50,
        bottom: 685,
        right: 245,
        top: 699
      });
      const r3 = createMockTextRun('r3', 'Third line wrapping up the point.', {
        left: 50,
        bottom: 670,
        right: 255,
        top: 684
      });

      const blocks = groupTextRunsToBlocks([r1, r2, r3], 0);
      expect(blocks.length).toBe(1);
      const b = blocks[0]!;
      expect(b.lines.length).toBe(3);
      expect(b.lines[0]!.text).toBe('First line of contract paragraph.');
      expect(b.bounds.left).toBe(50);
      expect(b.bounds.bottom).toBe(670);
      expect(b.bounds.top).toBe(714);
    });

    it('separates two-column article runs into independent left and right blocks', () => {
      // Left column lines (x around 50 to 200)
      const l1 = createMockTextRun('l1', 'Left column paragraph line 1', {
        left: 50,
        bottom: 700,
        right: 200,
        top: 712
      });
      const l2 = createMockTextRun('l2', 'Left column paragraph line 2', {
        left: 50,
        bottom: 685,
        right: 205,
        top: 697
      });

      // Right column lines (x around 300 to 450) at same or overlapping vertical heights
      const r1 = createMockTextRun('r1', 'Right column paragraph line 1', {
        left: 300,
        bottom: 700,
        right: 450,
        top: 712
      });
      const r2 = createMockTextRun('r2', 'Right column paragraph line 2', {
        left: 300,
        bottom: 685,
        right: 455,
        top: 697
      });

      const blocks = groupTextRunsToBlocks([l1, l2, r1, r2], 0);
      expect(blocks.length).toBe(2);

      const colLeft = blocks.find((b) => b.bounds.left < 100);
      const colRight = blocks.find((b) => b.bounds.left > 250);
      expect(colLeft).toBeDefined();
      expect(colRight).toBeDefined();
      expect(colLeft!.lines.length).toBe(2);
      expect(colRight!.lines.length).toBe(2);
    });

    it('identifies headers and footers based on vertical margin positions', () => {
      const header = createMockTextRun('hdr', 'Document Header Section', {
        left: 50,
        bottom: 780,
        right: 250,
        top: 800
      }, 'Helvetica-Bold', 18);

      const footer = createMockTextRun('ftr', 'Page 1 of 10 - Confidential', {
        left: 200,
        bottom: 30,
        right: 380,
        top: 40
      }, 'Helvetica', 9);

      const blocks = groupTextRunsToBlocks([header, footer], 0, { pageHeight: 842 });
      expect(blocks.length).toBe(2);

      const hdrBlock = blocks.find((b) => b.isHeader);
      const ftrBlock = blocks.find((b) => b.isFooter);
      expect(hdrBlock).toBeDefined();
      expect(ftrBlock).toBeDefined();
    });

    it('detects list items with bullet or numbering markers', () => {
      const item1 = createMockTextRun('li1', '• First item in bullet list', {
        left: 50,
        bottom: 600,
        right: 220,
        top: 612
      });
      const item2 = createMockTextRun('li2', '• Second item in bullet list', {
        left: 50,
        bottom: 575,
        right: 230,
        top: 587
      });

      const blocks = groupTextRunsToBlocks([item1, item2], 0);
      expect(blocks.length).toBe(2);
      expect(blocks[0]!.isListItem).toBe(true);
      expect(blocks[1]!.isListItem).toBe(true);
    });

    it('detects table structures with grid-aligned columns', () => {
      // Row 1
      const c1r1 = createMockTextRun('c1r1', 'Item A', { left: 50, bottom: 500, right: 120, top: 512 });
      const c2r1 = createMockTextRun('c2r1', '$100.00', { left: 200, bottom: 500, right: 260, top: 512 });
      // Row 2
      const c1r2 = createMockTextRun('c1r2', 'Item B', { left: 50, bottom: 480, right: 120, top: 492 });
      const c2r2 = createMockTextRun('c2r2', '$250.00', { left: 200, bottom: 480, right: 260, top: 492 });

      const blocks = groupTextRunsToBlocks([c1r1, c2r1, c1r2, c2r2], 0);
      expect(blocks.some((b) => b.isTableCell)).toBe(true);
    });
  });

  describe('Task 7.3: Rotated text, vertical CJK text, and character spacing', () => {
    it('handles 90-degree rotated text runs without crashing and groups them correctly', () => {
      const rot1 = createMockTextRun('rot1', 'Rotated vertical label line 1', {
        left: 50,
        bottom: 100,
        right: 64,
        top: 250
      }, 'Helvetica', 12, { rotation: 90 });

      const rot2 = createMockTextRun('rot2', 'Rotated vertical label line 2', {
        left: 70,
        bottom: 100,
        right: 84,
        top: 250
      }, 'Helvetica', 12, { rotation: 90 });

      const blocks = groupTextRunsToBlocks([rot1, rot2], 0);
      expect(blocks.length).toBe(1);
      expect(blocks[0]!.rotation).toBe(90);
    });

    it('identifies vertical CJK text writing mode', () => {
      const cjkRun = createMockTextRun('cjk1', '東京都千代田区', {
        left: 50,
        bottom: 100,
        right: 64,
        top: 260
      }, 'HeitiSC', 14);

      const blocks = groupTextRunsToBlocks([cjkRun], 0);
      expect(blocks.length).toBe(1);
      expect(blocks[0]!.writingMode).toBe('vertical-rl');
    });

    it('preserves horizontal scaling and character spacing attributes on runs', () => {
      const spacedRun = createMockTextRun('sp1', 'EXPANDED TEXT', {
        left: 50,
        bottom: 500,
        right: 250,
        top: 514
      }, 'Helvetica', 14, {
        charSpacing: 2.5,
        horizontalScale: 1.2
      });

      const blocks = groupTextRunsToBlocks([spacedRun], 0);
      expect(blocks[0]!.runs[0]!.charSpacing).toBe(2.5);
      expect(blocks[0]!.runs[0]!.horizontalScale).toBe(1.2);
    });
  });

  describe('Task 7.4: Font reusability and subset detection', () => {
    it('allows full reuse for standard 14 and full fonts', () => {
      const run = createMockTextRun('std1', 'Hello World', {
        left: 50,
        bottom: 500,
        right: 150,
        top: 512
      }, 'Helvetica', 12, {
        isEmbeddedSubset: false,
        fontInfo: { isEmbedded: false, isSubset: false }
      });

      const reusability = detectFontReusability([run], 'Any newly typed text 12345!');
      expect(reusability.canReuseFont).toBe(true);
      expect(reusability.isSubset).toBe(false);
      expect(reusability.missingGlyphs).toEqual([]);
    });

    it('detects subset font tag and flags missing glyphs when new letters are typed', () => {
      const subsetRun = createMockTextRun('sub1', 'ABC Only', {
        left: 50,
        bottom: 500,
        right: 150,
        top: 512
      }, 'XYZABC+CustomFont', 12, {
        isEmbeddedSubset: true,
        fontInfo: { isEmbedded: true, isSubset: true, subsetTag: 'XYZABC' }
      });

      // Contains letters 'A', 'B', 'C', 'O', 'n', 'l', 'y'
      const reusabilitySame = detectFontReusability([subsetRun], 'ABC');
      expect(reusabilitySame.canReuseFont).toBe(true);
      expect(reusabilitySame.missingGlyphs).toEqual([]);

      // Contains 'z' which is not in the original subset
      const reusabilityNew = detectFontReusability([subsetRun], 'ABC z');
      expect(reusabilityNew.canReuseFont).toBe(false);
      expect(reusabilityNew.isSubset).toBe(true);
      expect(reusabilityNew.missingGlyphs).toContain('z');
      expect(reusabilityNew.recommendedFallback).toBe('Roboto');
    });
  });

  describe('Task 7.6: Select text region tool (drag rectangle)', () => {
    it('groups runs strictly within selected region rectangle', () => {
      const r1 = createMockTextRun('r1', 'Inside box 1', { left: 50, bottom: 500, right: 120, top: 512 });
      const r2 = createMockTextRun('r2', 'Inside box 2', { left: 50, bottom: 480, right: 120, top: 492 });
      const rFar = createMockTextRun('rFar', 'Far away', { left: 50, bottom: 200, right: 120, top: 212 });

      const regionRect: Rect = { left: 40, bottom: 470, right: 130, top: 520 };
      const block = groupRunsInRegion([r1, r2, rFar], regionRect, 0);

      expect(block).not.toBeNull();
      expect(block!.lines.length).toBe(2);
      expect(block!.runs.some((r) => r.id === 'rFar')).toBe(false);
    });
  });

  describe('Task 7.18: Find & Replace across document', () => {
    it('finds case-insensitive and case-sensitive matches', () => {
      const r = createMockTextRun('r1', 'Contract Agreement terms for Contract review.', {
        left: 50,
        bottom: 500,
        right: 300,
        top: 512
      });
      const blocks = groupTextRunsToBlocks([r], 0);

      const matchesInsensitive = findInTextBlocks(blocks, 'contract', { caseSensitive: false });
      expect(matchesInsensitive.length).toBe(2);

      const matchesSensitive = findInTextBlocks(blocks, 'Contract', { caseSensitive: true });
      expect(matchesSensitive.length).toBe(2);

      const matchesLower = findInTextBlocks(blocks, 'contract', { caseSensitive: true });
      expect(matchesLower.length).toBe(0);
    });

    it('respects whole-word boundary searching', () => {
      const r = createMockTextRun('r1', 'cat concatenate catalog cat', {
        left: 50,
        bottom: 500,
        right: 250,
        top: 512
      });
      const blocks = groupTextRunsToBlocks([r], 0);

      const wholeMatches = findInTextBlocks(blocks, 'cat', { wholeWord: true });
      expect(wholeMatches.length).toBe(2);
    });

    it('warns when replacement causes text to overflow block bounds', () => {
      const r = createMockTextRun('r1', 'Short note', {
        left: 50,
        bottom: 500,
        right: 120,
        top: 512
      });
      const blocks = groupTextRunsToBlocks([r], 0);
      const match = findInTextBlocks(blocks, 'note')[0]!;

      // Huge replacement string that expands past bounds
      const longReplacement = 'very extremely immensely expanded paragraph that definitely exceeds the 70pt width';
      const isOverflow = checkReplacementOverflow(match, longReplacement, blocks[0]!);
      expect(isOverflow).toBe(true);

      const { updatedLines, isOverflow: flag } = applyReplacementToBlock(blocks[0]!, match, longReplacement);
      expect(flag).toBe(true);
      expect(updatedLines[0]).toContain('very extremely immensely expanded');
    });
  });

  describe('Task 7.11, 7.15, 7.16, 7.17, 7.19: Commands and EditSession integration', () => {
    it('coalesces rapid consecutive typing commits on the same block (Task 7.19)', () => {
      const r = createMockTextRun('r1', 'Initial text', { left: 50, bottom: 500, right: 150, top: 512 });
      const block = groupTextRunsToBlocks([r], 0)[0]!;

      const cmd1 = new CommitTextBlockCommand(0, block.id, block, ['Initial text a']);
      const cmd2 = new CommitTextBlockCommand(0, block.id, block, ['Initial text ab']);

      const merged = cmd1.mergeWith(cmd2);
      expect(merged).toBe(true);
      expect(cmd1.newLines).toEqual(['Initial text ab']);
    });

    it('executes and undoes InsertTextBlockCommand (Task 7.15)', async () => {
      const session = new EditSession('doc-text-test', 1);
      let insertedRun: TextRun | null = null;
      let deletedRunId: string | null = null;

      const bounds: Rect = { left: 100, bottom: 400, right: 250, top: 420 };
      const cmd = new InsertTextBlockCommand(
        0,
        'New text box note',
        bounds,
        'Roboto',
        14,
        { r: 255, g: 0, b: 0, a: 255 },
        (_page, run) => {
          insertedRun = run;
        },
        (_page, id) => {
          deletedRunId = id;
        }
      );

      await session.execute(cmd);
      expect(insertedRun).not.toBeNull();
      expect(insertedRun!.text).toBe('New text box note');
      expect(session.canUndo).toBe(true);

      await session.undo();
      expect(deletedRunId).toBe(insertedRun!.id);
      expect(session.canRedo).toBe(true);
    });

    it('executes and undoes DeleteTextBlockCommand (Task 7.16)', async () => {
      const session = new EditSession('doc-text-delete', 1);
      const r = createMockTextRun('del-run', 'To be deleted', { left: 50, bottom: 500, right: 150, top: 512 });
      const block = groupTextRunsToBlocks([r], 0)[0]!;

      let deletedIds: string[] = [];
      let restoredRuns: TextRun[] = [];

      const cmd = new DeleteTextBlockCommand(
        0,
        block.id,
        block,
        (_page, ids) => {
          deletedIds = ids;
        },
        (_page, runs) => {
          restoredRuns = runs;
        }
      );

      await session.execute(cmd);
      expect(deletedIds).toContain('del-run');

      await session.undo();
      expect(restoredRuns.length).toBe(1);
      expect(restoredRuns[0]!.id).toBe('del-run');
    });

    it('executes move, width resize, and rotation commands (Task 7.17)', async () => {
      let movedDx = 0;
      let movedDy = 0;
      let resizedWidth = 0;
      let rotatedAngle = 0;

      const moveCmd = new MoveTextBlockCommand(0, 'blk-1', 15, -20, (_p, _b, dx, dy) => {
        movedDx += dx;
        movedDy += dy;
      });
      await moveCmd.apply();
      expect(movedDx).toBe(15);
      expect(movedDy).toBe(-20);
      await moveCmd.revert();
      expect(movedDx).toBe(0);
      expect(movedDy).toBe(0);

      const resizeCmd = new ResizeTextBlockWidthCommand(0, 'blk-1', 100, 160, (_p, _b, w) => {
        resizedWidth = w;
      });
      await resizeCmd.apply();
      expect(resizedWidth).toBe(160);
      await resizeCmd.revert();
      expect(resizedWidth).toBe(100);

      const rotateCmd = new RotateTextBlockCommand(0, 'blk-1', 0, 90, (_p, _b, a) => {
        rotatedAngle = a;
      });
      await rotateCmd.apply();
      expect(rotatedAngle).toBe(90);
      await rotateCmd.revert();
      expect(rotatedAngle).toBe(0);
    });

    it('executes and reverts typography commands: font, size, style, color, alignment, spacing (Tasks 8.8-8.12)', async () => {
      let currentFont = 'Helvetica';
      let currentSize = 12;
      let currentStyle = { isBold: false, isItalic: false };
      let currentColor = { r: 0, g: 0, b: 0, a: 255 };
      let currentHighlight: ColorRGBA | null = null;
      let currentAlign: 'left' | 'center' | 'right' | 'justify' = 'left';
      let currentSpacing = { lineSpacing: 1.0, letterSpacing: 0 };

      // 1. Font Family
      const fontCmd = new SetFontFamilyCommand(0, 'blk-1', 'Helvetica', 'Roboto', 'Arial', (f) => {
        currentFont = f;
      });
      await fontCmd.apply();
      expect(currentFont).toBe('Roboto');
      await fontCmd.revert();
      expect(currentFont).toBe('Helvetica');

      // 2. Font Size
      const sizeCmd = new SetFontSizeCommand(0, 'blk-1', 12, 18, (s) => {
        currentSize = s;
      });
      await sizeCmd.apply();
      expect(currentSize).toBe(18);
      await sizeCmd.revert();
      expect(currentSize).toBe(12);

      // 3. Text Style
      const styleCmd = new SetTextStyleCommand(
        0,
        'blk-1',
        { isBold: false, isItalic: false },
        { isBold: true, isItalic: true },
        (st) => {
          currentStyle = { isBold: !!st.isBold, isItalic: !!st.isItalic };
        }
      );
      await styleCmd.apply();
      expect(currentStyle).toEqual({ isBold: true, isItalic: true });
      await styleCmd.revert();
      expect(currentStyle).toEqual({ isBold: false, isItalic: false });

      // 4. Text Color
      const colorCmd = new SetTextColorCommand(
        0,
        'blk-1',
        { r: 0, g: 0, b: 0, a: 255 },
        { r: 255, g: 0, b: 0, a: 255 },
        1.0,
        0.8,
        (col) => {
          currentColor = col;
        }
      );
      await colorCmd.apply();
      expect(currentColor.r).toBe(255);
      await colorCmd.revert();
      expect(currentColor.r).toBe(0);

      // 5. Highlight Color
      const highlightCmd = new SetTextHighlightColorCommand(
        0,
        'blk-1',
        null,
        { r: 254, g: 240, b: 138, a: 255 },
        (hl) => {
          currentHighlight = hl;
        }
      );
      await highlightCmd.apply();
      expect(currentHighlight).not.toBeNull();
      await highlightCmd.revert();
      expect(currentHighlight).toBeNull();

      // 6. Text Alignment
      const alignCmd = new SetTextAlignmentCommand(0, 'blk-1', 'left', 'center', (al) => {
        currentAlign = al;
      });
      await alignCmd.apply();
      expect(currentAlign).toBe('center');
      await alignCmd.revert();
      expect(currentAlign).toBe('left');

      // 7. Spacing
      const spacingCmd = new SetTextSpacingCommand(
        0,
        'blk-1',
        { lineSpacing: 1.0, letterSpacing: 0 },
        { lineSpacing: 1.5, letterSpacing: 2 },
        (sp) => {
          currentSpacing = { lineSpacing: sp.lineSpacing ?? 1.0, letterSpacing: sp.letterSpacing ?? 0 };
        }
      );
      await spacingCmd.apply();
      expect(currentSpacing.lineSpacing).toBe(1.5);
      expect(currentSpacing.letterSpacing).toBe(2);
      await spacingCmd.revert();
      expect(currentSpacing.lineSpacing).toBe(1.0);
      expect(currentSpacing.letterSpacing).toBe(0);
    });
  });
});
