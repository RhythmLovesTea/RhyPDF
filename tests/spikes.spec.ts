import { test, expect } from '@playwright/test';

test('Spike 0.1, 0.2, 0.3: PDFium worker init, render page to canvas, and enumerate page objects', async ({ page }) => {
  await page.goto('/');

  // Spike 0.1: Worker status
  const workerStatus = page.locator('#worker-status');
  await expect(workerStatus).toHaveText('PDFium WASM Worker Initialized: SUCCESS', { timeout: 15000 });

  // Spike 0.2: Render status
  const renderStatus = page.locator('#render-status');
  await expect(renderStatus).toContainText('Rendered page 1 at', { timeout: 15000 });

  // Verify canvas has non-zero size
  const canvas = page.locator('#render-canvas');
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box?.width).toBeGreaterThan(0);
  expect(box?.height).toBeGreaterThan(0);

  // Spike 0.3: Object count
  const objectStatus = page.locator('#object-count-status');
  await expect(objectStatus).toContainText('Page Objects detected: 5 objects', { timeout: 15000 });
});
