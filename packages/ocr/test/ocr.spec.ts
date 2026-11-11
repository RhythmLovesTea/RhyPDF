/**
 * @rhypdf/ocr
 * Comprehensive tests for Phase 10 OCR subsystem.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { PageObject, TextRun, ImageObject } from '@rhypdf/pdf-model';
import {
  detectScannedPage,
  calculateDpiScale,
  createImageData,
  computeOtsuThreshold,
  estimateSkewAngle,
  rotateGrayscale,
  preprocessImage,
  TesseractOcrEngine,
  PaddleOcrEngine,
  normalizeOcrBoundingBox,
  OcrCache,
  convertOcrToTextBlocks,
  convertOcrToTextRuns,
  createSearchableInvisibleLayer,
  analyzeLocalBackground,
  generateErasurePatch,
  createInpaintPatch,
  getSupportedOcrLanguages,
  detectLanguageFromText,
  performRegionOcr,
  BatchOcrProcessor,
  checkIsHandwriting,
  computeLevenshteinDistance,
  evaluateOcrAccuracy
} from '../src/index';

describe('Phase 10: OCR Subsystem', () => {
  beforeEach(() => {
    OcrCache.getInstance().clear();
  });

  // Task 10.1: Scanned page detector
  describe('Task 10.1: Scanned page detector', () => {
    it('detects a page with a full-page image and zero text as scanned', () => {
      const pageWidth = 612;
      const pageHeight = 792;
      const fullPageImage: ImageObject = {
        id: 'img-scan-0',
        type: 'image',
        pixelWidth: 2400,
        pixelHeight: 3200,
        bounds: { left: 0, bottom: 0, right: 612, top: 792 },
        matrix: [612, 0, 0, 792, 0, 0],
        zIndex: 1
      };

      const result = detectScannedPage([fullPageImage], pageWidth, pageHeight);

      expect(result.isScanned).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.imageAreaRatio).toBeCloseTo(1.0, 1);
      expect(result.textRunCount).toBe(0);
      expect(result.primaryImageId).toBe('img-scan-0');
    });

    it('rejects digital vector PDF with abundant text runs as not scanned', () => {
      const pageWidth = 612;
      const pageHeight = 792;
      const textObjects: PageObject[] = [
        {
          id: 'text-1',
          type: 'text',
          bounds: { left: 50, bottom: 700, right: 300, top: 720 },
          matrix: [1, 0, 0, 1, 50, 705],
          zIndex: 1,
          text: 'This is a digital document created in word processor with many paragraphs of real selectable text.',
          fontName: 'Helvetica',
          fontSize: 12,
          fillColor: { r: 0, g: 0, b: 0, a: 1 },
          isEmbeddedSubset: false
        } as TextRun,
        {
          id: 'text-2',
          type: 'text',
          bounds: { left: 50, bottom: 650, right: 300, top: 670 },
          matrix: [1, 0, 0, 1, 50, 655],
          zIndex: 2,
          text: 'Second paragraph with more digital content to confirm detector distinguishes native vector PDFs.',
          fontName: 'Helvetica',
          fontSize: 12,
          fillColor: { r: 0, g: 0, b: 0, a: 1 },
          isEmbeddedSubset: false
        } as TextRun
      ];

      const result = detectScannedPage(textObjects, pageWidth, pageHeight);

      expect(result.isScanned).toBe(false);
      expect(result.confidence).toBeLessThan(0.3);
      expect(result.textRunCount).toBe(2);
      expect(result.totalTextChars).toBeGreaterThan(100);
    });
  });

  // Task 10.4: Preprocessing (Deskew, Denoise, Otsu Binarize)
  describe('Task 10.4: Preprocessing pipeline', () => {
    it('calculates optimal DPI scale capped for memory protection', () => {
      const scaleStandard = calculateDpiScale(612, 792, 300);
      expect(scaleStandard).toBeCloseTo(300 / 72, 1);

      // Huge 5000pt page should be capped
      const scaleHuge = calculateDpiScale(5000, 5000, 300, 16_000_000);
      expect(scaleHuge * 5000 * scaleHuge * 5000).toBeLessThanOrEqual(16_000_001);
    });

    it('computes Otsu threshold for bimodal image distribution', () => {
      const gray = new Uint8ClampedArray(100);
      // Dark foreground (intensity 30)
      for (let i = 0; i < 50; i++) gray[i] = 30;
      // Light background (intensity 220)
      for (let i = 50; i < 100; i++) gray[i] = 220;

      const threshold = computeOtsuThreshold(gray);
      expect(threshold).toBeGreaterThanOrEqual(30);
      expect(threshold).toBeLessThan(220);
    });

    it('estimates horizontal skew angle and rotates image', () => {
      const width = 100;
      const height = 100;
      const gray = new Uint8ClampedArray(width * height).fill(255);

      // Draw horizontal text line at row 50
      for (let x = 10; x < 90; x++) {
        gray[50 * width + x] = 0;
      }

      const angle = estimateSkewAngle(gray, width, height, 128);
      expect(Math.abs(angle)).toBeLessThanOrEqual(1.0);

      const rotated = rotateGrayscale(gray, width, height, 0);
      expect(rotated.length).toBe(gray.length);
    });

    it('runs end-to-end preprocessing pipeline on synthetic image', () => {
      const img = createImageData(50, 50);
      // Fill with checkerboard pattern
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = 200;
        img.data[i + 1] = 200;
        img.data[i + 2] = 200;
        img.data[i + 3] = 255;
      }

      const res = preprocessImage(img, { deskew: false, denoise: true, binarize: true });
      expect(res.processedData.width).toBe(50);
      expect(res.processedData.height).toBe(50);
      expect(res.processedData.data.length).toBe(img.data.length);
    });
  });

  // Task 10.2: Tesseract Adapter & Normalization
  describe('Task 10.2: Tesseract OCR Engine & Coordinate Normalization', () => {
    const engine = new TesseractOcrEngine();

    it('initializes engine and recognizes text structure', async () => {
      const mockCanvas = { width: 400, height: 300 } as unknown as HTMLCanvasElement;
      const result = await engine.recognize(mockCanvas, { language: 'eng' });

      expect(result.language).toBe('eng');
      expect(result.fullText.length).toBeGreaterThan(0);
      expect(result.meanConfidence).toBeGreaterThan(80);
      expect(result.blocks.length).toBeGreaterThan(0);
      expect(result.blocks[0]!.lines.length).toBeGreaterThan(0);
      expect(result.blocks[0]!.lines[0]!.words.length).toBeGreaterThan(0);
    });

    it('normalizes raster pixel bounding boxes into PDF coordinate space', () => {
      // 800x1000 pixel image mapped to standard 612x792 pt page
      const pixelBox = { left: 100, top: 100, right: 300, bottom: 200 };
      const norm = normalizeOcrBoundingBox(pixelBox, 800, 1000, 612, 792);

      // In PDF, Y origin is bottom-left
      expect(norm.left).toBeCloseTo((100 / 800) * 612, 1);
      expect(norm.right).toBeCloseTo((300 / 800) * 612, 1);
      expect(norm.top).toBeCloseTo(792 - (100 / 1000) * 792, 1);
      expect(norm.bottom).toBeCloseTo(792 - (200 / 1000) * 792, 1);
      expect(norm.top).toBeGreaterThan(norm.bottom);
    });
  });

  // Task 10.3: PaddleOCR Adapter
  describe('Task 10.3: PaddleOCR Engine Adapter', () => {
    it('initializes and reports WebGPU status', async () => {
      const paddle = new PaddleOcrEngine();
      await paddle.init();
      expect(paddle.isReady()).toBe(true);

      const res = await paddle.recognize({ width: 200, height: 100 } as ImageData);
      expect(res.fullText).toBeTruthy();
    });
  });

  // Task 10.5: Cache & Worker State
  describe('Task 10.5: OCR Result Caching & Storage', () => {
    const cache = OcrCache.getInstance();

    it('stores and retrieves cached OCR page results', async () => {
      const key = cache.generateKey('page_1_hash', 'eng', 'editable');
      const fakeResult = {
        pageIndex: 1,
        fullText: 'Cached Invoice #999',
        meanConfidence: 96.0,
        blocks: [],
        durationMs: 120,
        language: 'eng',
        imageWidth: 600,
        imageHeight: 800
      };

      await cache.set(key, fakeResult);
      const retrieved = await cache.get(key);

      expect(retrieved).toBeDefined();
      expect(retrieved?.fullText).toBe('Cached Invoice #999');
      expect(retrieved?.meanConfidence).toBe(96.0);
    });
  });

  // Task 10.6: Block Conversion & Typography Estimation
  describe('Task 10.6: OCR Block Conversion & Typography Estimation', () => {
    it('converts OCR output into structured TextBlocks with font size and baseline', () => {
      const ocrResult = {
        pageIndex: 0,
        fullText: 'Invoice Total: $450.00',
        meanConfidence: 95.0,
        blocks: [
          {
            id: 'b-0',
            text: 'Invoice Total: $450.00',
            confidence: 95.0,
            bbox: { left: 50, top: 50, right: 250, bottom: 75 },
            lines: [
              {
                text: 'Invoice Total: $450.00',
                confidence: 95.0,
                bbox: { left: 50, top: 50, right: 250, bottom: 75 },
                words: [
                  {
                    text: 'Invoice',
                    confidence: 95,
                    bbox: { left: 50, top: 50, right: 120, bottom: 75 },
                    isBold: true
                  },
                  {
                    text: 'Total:',
                    confidence: 95,
                    bbox: { left: 125, top: 50, right: 180, bottom: 75 },
                    isBold: true
                  },
                  {
                    text: '$450.00',
                    confidence: 95,
                    bbox: { left: 185, top: 50, right: 250, bottom: 75 },
                    isBold: true
                  }
                ]
              }
            ]
          }
        ],
        durationMs: 50,
        language: 'eng',
        imageWidth: 500,
        imageHeight: 500
      };

      const textBlocks = convertOcrToTextBlocks(ocrResult, 500, 500);

      expect(textBlocks.length).toBe(1);
      expect(textBlocks[0]!.text).toBe('Invoice Total: $450.00');
      expect(textBlocks[0]!.bold).toBe(true);
      expect(textBlocks[0]!.fontSize).toBeGreaterThanOrEqual(10);
      expect(textBlocks[0]!.lines.length).toBe(1);
      expect(textBlocks[0]!.lines[0]!.baselineY).toBeGreaterThan(0);
    });

    it('converts OCR blocks to valid PDF TextRun PageObjects', () => {
      const ocrResult = {
        pageIndex: 0,
        fullText: 'Hello World',
        meanConfidence: 98,
        blocks: [
          {
            id: 'b-1',
            text: 'Hello World',
            confidence: 98,
            bbox: { left: 20, top: 20, right: 120, bottom: 40 },
            lines: [
              {
                text: 'Hello World',
                confidence: 98,
                bbox: { left: 20, top: 20, right: 120, bottom: 40 },
                words: [
                  {
                    text: 'Hello',
                    confidence: 98,
                    bbox: { left: 20, top: 20, right: 70, bottom: 40 }
                  }
                ]
              }
            ]
          }
        ],
        durationMs: 10,
        language: 'eng',
        imageWidth: 200,
        imageHeight: 200
      };

      const runs = convertOcrToTextRuns(ocrResult, 200, 200, 'fill');
      expect(runs.length).toBe(1);
      expect(runs[0]!.type).toBe('text');
      expect(runs[0]!.renderMode).toBe('fill');
      expect(runs[0]!.fillColor.a).toBe(1);
      expect(runs[0]!.zIndex).toBeGreaterThanOrEqual(10);
    });
  });

  // Task 10.7 & 10.8: Output Modes & Erasure
  describe('Task 10.7 & 10.8: Output Modes and Erasure Strategy', () => {
    it('creates invisible text layer for Mode A (searchable layer under scan)', () => {
      const ocrResult = {
        pageIndex: 0,
        fullText: 'Searchable invisible text',
        meanConfidence: 92,
        blocks: [
          {
            id: 'b-inv',
            text: 'Searchable invisible text',
            confidence: 92,
            bbox: { left: 10, top: 10, right: 200, bottom: 30 },
            lines: [
              {
                text: 'Searchable invisible text',
                confidence: 92,
                bbox: { left: 10, top: 10, right: 200, bottom: 30 },
                words: []
              }
            ]
          }
        ],
        durationMs: 20,
        language: 'eng',
        imageWidth: 300,
        imageHeight: 300
      };

      const invisibleRuns = createSearchableInvisibleLayer(ocrResult, 300, 300);
      expect(invisibleRuns.length).toBe(1);
      expect(invisibleRuns[0]!.renderMode).toBe('invisible');
    });

    it('analyzes background and generates erasure patch for Mode B (fully editable)', () => {
      const img = createImageData(100, 100);
      // White background with dark text area
      for (let i = 0; i < img.data.length; i += 4) {
        img.data[i] = 250;
        img.data[i + 1] = 250;
        img.data[i + 2] = 250;
        img.data[i + 3] = 255;
      }

      const bbox = { left: 20, top: 20, right: 60, bottom: 40 };
      const bgAnalysis = analyzeLocalBackground(bbox, img);

      expect(bgAnalysis.averageR).toBeGreaterThan(240);
      expect(bgAnalysis.isTextured).toBe(false);

      const patch = generateErasurePatch(bbox, img);
      expect(patch.backgroundColor).toBeTruthy();

      const inpaint = createInpaintPatch(bbox, img);
      expect(inpaint.width).toBe(41);
      expect(inpaint.height).toBe(21);
    });
  });

  // Task 10.10: Language Detection
  describe('Task 10.10: Language selector and script auto-detection', () => {
    it('provides catalog of supported OCR languages with size estimates', () => {
      const langs = getSupportedOcrLanguages();
      expect(langs.length).toBeGreaterThanOrEqual(10);
      expect(langs.some((l) => l.code === 'eng')).toBe(true);
      expect(langs.some((l) => l.code === 'hin')).toBe(true);
      expect(langs.some((l) => l.code === 'ara')).toBe(true);
      expect(langs.some((l) => l.code === 'chi_sim')).toBe(true);
    });

    it('auto-detects language from sample script Unicode codepoints', () => {
      expect(detectLanguageFromText('Hello World')).toBe('eng');
      expect(detectLanguageFromText('مرحبا بالعالم')).toBe('ara');
      expect(detectLanguageFromText('שלום עולם')).toBe('heb');
      expect(detectLanguageFromText('नमस्ते भारत')).toBe('hin');
      expect(detectLanguageFromText('简体中文测试')).toBe('chi_sim');
      expect(detectLanguageFromText('Привет мир')).toBe('rus');
    });
  });

  // Task 10.11: Region OCR
  describe('Task 10.11: Region OCR', () => {
    it('crops image data and performs localized OCR on selected box', async () => {
      const engine = new TesseractOcrEngine();
      const pageImage = createImageData(400, 400);

      const selectedRegionPt = { left: 50, bottom: 200, right: 250, top: 350 };
      const regionResult = await performRegionOcr(engine, pageImage, selectedRegionPt, 400, 400, {
        language: 'eng'
      });

      expect(regionResult.blocks.length).toBeGreaterThan(0);
      // Result coordinates should be offset back to page coordinates
      expect(regionResult.blocks[0]!.bbox.left).toBeGreaterThanOrEqual(50);
    });
  });

  // Task 10.12: Batch OCR
  describe('Task 10.12: Batch OCR processing', () => {
    it('processes multiple pages in batch with progress updates', async () => {
      const engine = new TesseractOcrEngine();
      const processor = new BatchOcrProcessor(engine);

      const progressLogs: number[] = [];
      const mockRender = async (_pageIdx: number) => createImageData(100, 100);

      const batchResult = await processor.processBatch(mockRender, 3, {
        language: 'eng',
        outputMode: 'searchable',
        onProgress: (p) => {
          progressLogs.push(p.overallPercent);
        }
      });

      expect(batchResult.totalPagesProcessed).toBe(3);
      expect(batchResult.results.size).toBe(3);
      expect(progressLogs.length).toBeGreaterThan(0);
      expect(progressLogs[progressLogs.length - 1]).toBe(100);
    });
  });

  // Task 10.14: Handwriting Detection
  describe('Task 10.14: Handwriting detection heuristic', () => {
    it('detects low-confidence and erratic height variance as suspected handwriting', () => {
      const handwrittenResult = {
        pageIndex: 0,
        fullText: 'messy doctor signature and note',
        meanConfidence: 32.0,
        blocks: [
          {
            id: 'b-hw',
            text: 'messy cursive note',
            confidence: 32.0,
            bbox: { left: 10, top: 10, right: 100, bottom: 80 },
            lines: [
              {
                text: 'messy cursive note',
                confidence: 32.0,
                bbox: { left: 10, top: 10, right: 100, bottom: 80 },
                words: [
                  {
                    text: 'messy',
                    confidence: 30,
                    bbox: { left: 10, top: 10, right: 40, bottom: 60 }
                  },
                  {
                    text: 'cursive',
                    confidence: 35,
                    bbox: { left: 45, top: 15, right: 80, bottom: 90 }
                  },
                  {
                    text: 'note',
                    confidence: 31,
                    bbox: { left: 85, top: 5, right: 100, bottom: 70 }
                  }
                ]
              }
            ]
          }
        ],
        durationMs: 40,
        language: 'eng',
        imageWidth: 200,
        imageHeight: 200
      };

      const check = checkIsHandwriting(handwrittenResult);
      expect(check.isLikelyHandwritten).toBe(true);
      expect(check.confidenceScore).toBeGreaterThan(0.5);
    });
  });

  // Task 10.15: Accuracy Evaluation
  describe('Task 10.15: Accuracy evaluation and >=90% quality gate', () => {
    it('computes Levenshtein edit distance accurately', () => {
      expect(computeLevenshteinDistance('kitten', 'sitting')).toBe(3);
      expect(computeLevenshteinDistance('PDF', 'PDF')).toBe(0);
    });

    it('evaluates CER, WER, and verifies >=90% accuracy on clean sample', () => {
      const groundTruth = 'The quick brown fox jumps over the lazy dog. Invoice No. 1024.';
      // Simulated 96% accurate OCR with two minor typos ('bxown', 'juinps')
      const ocrOutput = 'The quick bxown fox juinps over the lazy dog. Invoice No. 1024.';

      const report = evaluateOcrAccuracy(ocrOutput, groundTruth);

      expect(report.characterErrors).toBe(3);
      expect(report.characterErrorRate).toBeLessThan(0.05);
      expect(report.accuracyPercent).toBeGreaterThanOrEqual(95.0);
    });
  });
});
