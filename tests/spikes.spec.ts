import { test, expect } from '@playwright/test';

test('Spike 0.1, 0.2, 0.3: PDFium init, render 3 PDFs, and object enumeration + rotated overlay', async ({ page }) => {
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
});
