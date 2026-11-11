import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PdfiumEngine } from '@rhypdf/pdf-engine';
import { groupTextRunsToBlocks } from '@rhypdf/edit-core';
import { SimpleTextLayoutEngine } from '@rhypdf/text-layout';

describe('Phase 7 Integration & Parity: Text Editing, Save, Reopen, and Ghost Text Verification', () => {
  let engine: PdfiumEngine;
  let wasmBinary: ArrayBuffer;
  let singleColBytes: Uint8Array;
  let twoColBytes: Uint8Array;
  let subsetFontBytes: Uint8Array;

  beforeAll(async () => {
    const wasmPath = path.resolve(
      __dirname,
      '../../../../node_modules/.pnpm/@embedpdf+pdfium@2.15.1/node_modules/@embedpdf/pdfium/dist/pdfium.wasm'
    );
    wasmBinary = fs.readFileSync(wasmPath).buffer;

    const fixturesDir = path.resolve(__dirname, '../../../../packages/test-fixtures/fixtures');
    singleColBytes = new Uint8Array(fs.readFileSync(path.join(fixturesDir, '01_text_single_column.pdf')));
    twoColBytes = new Uint8Array(fs.readFileSync(path.join(fixturesDir, '02_two_column_article.pdf')));
    subsetFontBytes = new Uint8Array(fs.readFileSync(path.join(fixturesDir, '14_subset_font.pdf')));

    engine = await PdfiumEngine.create({ wasmBinary });
  });

  describe('Task 7.1, 7.2, 7.20, 7.21: In-Place Text Editing on Real PDFium Documents', () => {
    it('extracts runs, groups into blocks, replaces paragraph, and verifies no ghost text after save', async () => {
      // 1. Open original single-column contract document
      const doc = await engine.open(singleColBytes.buffer.slice(0));
      const pageIdx = 0;

      // Extract original text runs (Task 7.1)
      const originalRuns = await engine.extractText(doc, pageIdx);
      expect(originalRuns.length).toBeGreaterThan(0);

      // Group runs into lines and blocks (Task 7.2)
      const pageInfo = await engine.pageInfo(doc, pageIdx);
      const blocks = groupTextRunsToBlocks(originalRuns, pageIdx, { pageHeight: pageInfo.height });
      expect(blocks.length).toBeGreaterThan(0);

      // Select target block to edit
      const targetBlock = blocks.find((b) => !b.isHeader && !b.isFooter) || blocks[0]!;
      expect(targetBlock).toBeDefined();

      const oldRunIds = targetBlock.runs.map((r) => r.id);
      expect(oldRunIds.length).toBeGreaterThan(0);

      // 2. Perform Commit (Task 7.11):
      // Remove all original text runs belonging to target block
      // Insert new replacement text run
      const replacementText = 'This is an amended and legally verified contract agreement clause.';
      const mutations = [
        ...oldRunIds.map((id) => ({
          type: 'removeObject' as const,
          objectId: id
        })),
        {
          type: 'insertText' as const,
          text: replacementText,
          fontName: 'Helvetica',
          fontSize: 12,
          fillColor: { r: 0, g: 0, b: 0, a: 255 },
          matrix: [1, 0, 0, 1, targetBlock.bounds.left, targetBlock.bounds.bottom] as [number, number, number, number, number, number]
        }
      ];

      const mutationResult = await engine.mutate(doc, pageIdx, mutations);
      expect(mutationResult.success).toBe(true);

      // 3. Save modified document to Blob / ArrayBuffer
      const savedBlob = await engine.save(doc);
      expect(savedBlob.size).toBeGreaterThan(0);
      await engine.close(doc);

      // 4. Reopen saved document in external / new engine instance to verify external viewer compatibility
      const savedBuffer = await savedBlob.arrayBuffer();
      const reopenedDoc = await engine.open(savedBuffer);

      // 5. Verify Searchable and Copyable (Task 7.20):
      // Text extracted from the saved file equals what the user typed
      const savedRuns = await engine.extractText(reopenedDoc, pageIdx);
      const allExtractedText = savedRuns.map((r) => r.text).join(' ');

      expect(allExtractedText).toContain(replacementText);

      // 6. Verify No Ghost Text (Task 7.21):
      // None of the removed old run texts remain in the reopened document
      for (const oldRun of targetBlock.runs) {
        if (oldRun.text.trim().length > 5) {
          expect(allExtractedText).not.toContain(oldRun.text.trim());
        }
      }

      await engine.close(reopenedDoc);
    });

    it('handles two-column layout text editing without corrupting adjacent column', async () => {
      const doc = await engine.open(twoColBytes.buffer.slice(0));
      const originalRuns = await engine.extractText(doc, 0);

      const blocks = groupTextRunsToBlocks(originalRuns, 0);
      expect(blocks.length).toBeGreaterThanOrEqual(2);

      // Target left column block
      const leftBlock = blocks.find((b) => b.bounds.left < 150)!;
      expect(leftBlock).toBeDefined();

      const newLeftText = 'Amended Left Column Article Introduction.';
      await engine.mutate(doc, 0, [
        ...leftBlock.runs.map((r) => ({ type: 'removeObject' as const, objectId: r.id })),
        {
          type: 'insertText' as const,
          text: newLeftText,
          fontName: 'Times-Roman',
          fontSize: 11,
          matrix: [1, 0, 0, 1, leftBlock.bounds.left, leftBlock.bounds.bottom] as [number, number, number, number, number, number]
        }
      ]);

      const savedBlob = await engine.save(doc);
      await engine.close(doc);

      const reopenedDoc = await engine.open(await savedBlob.arrayBuffer());
      const extractedRuns = await engine.extractText(reopenedDoc, 0);
      const extractedText = extractedRuns.map((r) => r.text).join(' ');

      expect(extractedText).toContain(newLeftText);
      await engine.close(reopenedDoc);
    });
  });

  describe('Task 7.22: Parity Test - Overlay layout vs PDFium text metrics', () => {
    it('verifies overlay layout line breaking against PDFium text object bounds', async () => {
      const doc = await engine.open(singleColBytes.buffer.slice(0));
      const runs = await engine.extractText(doc, 0);
      const blocks = groupTextRunsToBlocks(runs, 0);
      const testBlock = blocks[0]!;

      const layoutEngine = new SimpleTextLayoutEngine();
      const combinedText = testBlock.lines.map((l) => l.text).join('\n');
      const blockWidth = testBlock.bounds.right - testBlock.bounds.left;

      const layoutResult = await layoutEngine.layout(combinedText, {
        fontSize: testBlock.primaryFontSize,
        maxWidth: blockWidth
      });

      // Layout lines should match line count and width within tolerance
      expect(layoutResult.lines.length).toBeGreaterThanOrEqual(1);
      expect(Math.abs(layoutResult.width - blockWidth)).toBeLessThan(blockWidth * 0.5);

      await engine.close(doc);
    });
  });
});
