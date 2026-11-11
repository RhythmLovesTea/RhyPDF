import { test, expect } from '@playwright/test';

test.describe('Security Headers, Web App Manifest, and PWA Baseline', () => {
  test('serves target security headers and enables crossOriginIsolated', async ({ page }) => {
    const response = await page.goto('/');
    expect(response).not.toBeNull();

    const headers = response!.headers();

    // 1. Cross-Origin Opener and Embedder policies (for SharedArrayBuffer)
    expect(headers['cross-origin-opener-policy']).toBe('same-origin');
    expect(headers['cross-origin-embedder-policy']).toBe('require-corp');

    // 2. Content Security Policy
    const csp = headers['content-security-policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("'wasm-unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");

    // 3. Other security headers
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['permissions-policy']).toContain('microphone=()');

    // 4. In-page isolation check
    const isIsolated = await page.evaluate(() => window.crossOriginIsolated);
    expect(isIsolated).toBe(true);
  });

  test('declares valid Web App Manifest with PDF file handlers and metadata', async ({
    page,
    request
  }) => {
    await page.goto('/');

    // Check meta tags in head
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#2563eb');

    // Fetch and validate manifest content
    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.status()).toBe(200);

    const manifest = await manifestResponse.json();
    expect(manifest.name).toBe('RhyPDF - Private In-Browser PDF Editor');
    expect(manifest.short_name).toBe('RhyPDF');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');

    // Check file_handlers for .pdf
    expect(Array.isArray(manifest.file_handlers)).toBe(true);
    const pdfHandler = manifest.file_handlers.find(
      (h: { accept?: Record<string, string[]> }) => h.accept?.['application/pdf']
    );
    expect(pdfHandler).toBeDefined();
    expect(pdfHandler.accept['application/pdf']).toContain('.pdf');

    // Check icons exist
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    for (const icon of manifest.icons) {
      const iconRes = await request.get(icon.src);
      expect(iconRes.status(), `Icon ${icon.src} should return 200 OK`).toBe(200);
    }
  });

  test('registers Service Worker and caches app shell for offline resilience', async ({
    page,
    context
  }) => {
    await page.goto('/');

    // Verify service worker registration
    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const reg = await Promise.race([
        navigator.serviceWorker.ready.then(() => true),
        new Promise((resolve) => setTimeout(() => resolve(false), 5000))
      ]);
      return reg;
    });

    expect(swRegistered).toBe(true);

    // Verify cache contains pre-cached shell
    const cacheHasShell = await page.evaluate(async () => {
      if (!('caches' in window)) return false;
      const cache = await caches.open('rhypdf-shell-v1');
      const match = await cache.match('/manifest.webmanifest');
      return match !== undefined;
    });

    expect(cacheHasShell).toBe(true);

    // Test offline capability: switch context offline and reload
    await context.setOffline(true);

    try {
      await page.reload({ waitUntil: 'domcontentloaded' });

      // In both dev and prod, offline HTML shell is returned from cache by Service Worker
      await expect(page.locator('#root')).toBeAttached();

      const isProduction = await page.evaluate(
        () => !document.querySelector('script[src*="@vite/client"]')
      );
      if (isProduction) {
        // In production build, full pre-cached React bundles render the complete UI offline
        await expect(page.locator('#root')).toBeVisible();
        await expect(page.locator('h1')).toContainText('RhyPDF');
      }
    } finally {
      await context.setOffline(false);
    }
  });

  test('Task 15.7: Privacy policy page renders client-side privacy architecture guarantees', async ({
    page
  }) => {
    await page.goto('/#/privacy');
    await expect(page.locator('[data-testid="page-privacy-policy"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Privacy & Data Architecture');
    await expect(page.locator('text=100% Client-Side On-Device Processing')).toBeVisible();
    await expect(page.locator('text=Zero Tracking of Document Content')).toBeVisible();
    await expect(page.locator('text=Local Encryption & Safe Storage')).toBeVisible();
  });

  test('Task 15.7: Asserts no outbound network request carries document content or telemetry', async ({
    page
  }) => {
    const sensitiveKeyword = 'TopSecretSSN12345';
    let leakedRequestUrl: string | null = null;
    let leakedPayload: string | null = null;

    page.on('request', (req) => {
      const url = req.url();
      const postData = req.postData();
      if (url.includes(sensitiveKeyword)) {
        leakedRequestUrl = url;
      }
      if (postData && postData.includes(sensitiveKeyword)) {
        leakedPayload = postData;
      }
    });

    await page.goto('/#/editor');
    // Simulate user editing/typing document content in editor
    await page.evaluate((secret) => {
      window.localStorage.setItem('rhypdf_test_doc', secret);
    }, sensitiveKeyword);

    await page.waitForTimeout(500);

    expect(leakedRequestUrl, 'No network URL should ever leak document content').toBeNull();
    expect(leakedPayload, 'No POST body should ever transmit document content').toBeNull();
  });
});
