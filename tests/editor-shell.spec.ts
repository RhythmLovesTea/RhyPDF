import { test, expect } from '@playwright/test';

test('Editor app shell initializes with code-split chunks and worker WASM plumbing', async ({
  page
}) => {
  await page.goto('/#/editor');

  // Verify page title
  await expect(page).toHaveTitle(/RhyPDF/);

  // Verify editor page is active
  await expect(page.locator('[data-testid="page-editor"]')).toBeVisible();

  // Verify code-split lazy loaded components appear
  await expect(page.locator('[data-testid="toolbar-skeleton"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="sidebar-skeleton"]')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="viewer-skeleton"]')).toBeVisible({ timeout: 10000 });

  // Verify worker status badge indicates connected
  const workerBadge = page.locator('[data-testid="worker-status-badge"]');
  await expect(workerBadge).toContainText('Worker: connected', { timeout: 10000 });

  // Verify worker successfully initialized PDFium WASM
  const pdfiumStatus = page.locator('[data-testid="pdfium-status"]');
  await expect(pdfiumStatus).toContainText('PDFium Engine: initialized', { timeout: 15000 });
});
