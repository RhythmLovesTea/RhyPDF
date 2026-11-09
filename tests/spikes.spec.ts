import { test, expect } from '@playwright/test';

test('Spike 0.1 & 0.2: PDFium worker init and render 3 sample PDFs to canvas at 2x scale + DPR', async ({ page }) => {
  await page.goto('/');

  // Spike 0.1: Worker status
  const workerStatus = page.locator('#worker-status');
  await expect(workerStatus).toHaveText('PDFium WASM Worker Initialized: SUCCESS', { timeout: 15000 });

  // Spike 0.2: Render status indicates 3/3 sample PDFs rendered
  const renderStatus = page.locator('#render-status');
  await expect(renderStatus).toContainText('3/3 sample PDFs rendered successfully', { timeout: 15000 });

  // Verify all 3 canvases are visible and sized correctly
  for (const id of ['#render-canvas-1', '#render-canvas-2', '#render-canvas-3']) {
    const canvas = page.locator(id);
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box?.width).toBeGreaterThan(50);
    expect(box?.height).toBeGreaterThan(50);
  }

  // Spike 0.3: Object count
  const objectStatus = page.locator('#object-count-status');
  await expect(objectStatus).toContainText('Page Objects detected: 5 objects', { timeout: 15000 });
});
