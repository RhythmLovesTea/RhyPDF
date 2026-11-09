import { test, expect } from '@playwright/test';

test('Spike 0.1, 0.2, 0.3: PDFium init, render 3 PDFs, and object enumeration + rotated overlay', async ({ page }) => {
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('/');

  // Spike 0.1: Worker status
  const workerStatus = page.locator('#worker-status');
  await expect(workerStatus).toHaveText('PDFium WASM Worker Initialized: SUCCESS', { timeout: 15000 });

  // Spike 0.2: Render status indicates 3/3 sample PDFs rendered
  const renderStatus = page.locator('#render-status');
  await expect(renderStatus).toContainText('3/3 sample PDFs rendered successfully', { timeout: 15000 });

  // Spike 0.3: Object count & Rotated Page test
  const objectStatus = page.locator('#object-count-status');
  await expect(objectStatus).toContainText('Page Objects detected: 5 objects', { timeout: 15000 });
  await expect(objectStatus).toContainText('rotation = 90°', { timeout: 15000 });

  // Verify SVG overlay rendered rectangles
  const svgRects = page.locator('#overlay-container svg rect');
  await expect(svgRects.first()).toBeVisible();
  const count = await svgRects.count();
  expect(count).toBe(5);

  // Spike 0.4: Text Run Extraction
  const textStatus = page.locator('#text-run-status');
  await expect(textStatus).toContainText('Text Runs extracted from 3/3 PDFs', { timeout: 15000 });
  await expect(textStatus).toContainText('Sample Contract Agreement', { timeout: 15000 });
  await expect(textStatus).toContainText('Research on Modern Document Layout Algorithms', { timeout: 15000 });
  await expect(textStatus).toContainText('INVOICE #98213', { timeout: 15000 });

  // Spike 0.5: Mutation & Zero Ghost Text
  const mutateStatus = page.locator('#mutate-save-status');
  await expect(mutateStatus).toContainText('Ghost text detected: NO (PASSED)', { timeout: 15000 });
  await expect(mutateStatus).toContainText('New text present: YES (PASSED)', { timeout: 15000 });

  // Spike 0.6: Complex Scripts Shaping
  const complexStatus = page.locator('#complex-script-status');
  await expect(complexStatus).toContainText('Arabic "مرحبا بالعالم": Shaped', { timeout: 15000 });
  await expect(complexStatus).toContainText('Hindi "नमस्ते": Shaped', { timeout: 15000 });
  await expect(complexStatus).toContainText('FPDFText_LoadCidType2Font', { timeout: 15000 });

  // Spike 0.7: Image Editing
  const imgStatus = page.locator('#image-edit-status');
  await expect(imgStatus).toContainText('Transformed with 45° rotation', { timeout: 15000 });
  await expect(imgStatus).toContainText('Deleted from page', { timeout: 15000 });
  await expect(imgStatus).toContainText('Inserted with alpha channel transparency', { timeout: 15000 });
  await expect(imgStatus).toContainText('3 images present', { timeout: 15000 });

  // Spike 0.8: OCR Bake-off
  const ocrStatus = page.locator('#ocr-status');
  await expect(ocrStatus).toContainText('Tesseract.js v7 (WASM SIMD) — Fully Self-Hosted', { timeout: 30000 });
  await expect(ocrStatus).toContainText('PASSED', { timeout: 30000 });

  // Spike 0.9: Memory & Big File Limits
  const memStatus = page.locator('#memory-status');
  await expect(memStatus).toContainText('100 pages', { timeout: 15000 });
  await expect(memStatus).toContainText('Hard limits decided', { timeout: 15000 });
  await expect(memStatus).toContainText('Warning at 50 MB', { timeout: 15000 });

  // Spike 0.10: Hosting Headers & OPFS
  const hostingStatus = page.locator('#hosting-status');
  await expect(hostingStatus).toContainText('crossOriginIsolated: TRUE (PASSED)', { timeout: 15000 });
  await expect(hostingStatus).toContainText('FUNCTIONAL', { timeout: 15000 });
});
