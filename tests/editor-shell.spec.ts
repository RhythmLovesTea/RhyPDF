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

test('WASM loading strategy: cached by service worker and starts offline on second visit (Task 2.3)', async ({
  page,
  context
}) => {
  // First visit: loads and caches WASM
  await page.goto('/#/editor');
  const pdfiumStatus = page.locator('[data-testid="pdfium-status"]');
  await expect(pdfiumStatus).toContainText('PDFium Engine: initialized', { timeout: 15000 });

  // Verify service worker has cached /pdfium.wasm in CacheStorage
  const isWasmCached = await page.evaluate(async () => {
    if (!('caches' in window)) return false;
    const cache = await caches.open('rhypdf-shell-v1');
    const match = await cache.match('/pdfium.wasm');
    return match !== undefined;
  });
  expect(isWasmCached).toBe(true);

  // Switch context offline
  await context.setOffline(true);

  try {
    // Second visit: reload page while completely offline
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Verify UI shell loads offline in preview/production
    const isProduction = await page.evaluate(
      () => !document.querySelector('script[src*="@vite/client"]')
    );
    if (isProduction) {
      await expect(page.locator('[data-testid="page-editor"]')).toBeVisible({ timeout: 10000 });
      await expect(pdfiumStatus).toContainText('PDFium Engine: initialized', { timeout: 15000 });
    }
  } finally {
    await context.setOffline(false);
  }
});
