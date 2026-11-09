import { test, expect } from '@playwright/test';

test('Editor app shell initializes and worker communicates', async ({ page }) => {
  await page.goto('/');

  // Verify page title
  await expect(page).toHaveTitle(/RhyPDF/);

  // Verify app header
  const header = page.locator('h1');
  await expect(header).toHaveText('RhyPDF Editor Shell');

  // Verify worker status becomes connected
  const workerStatus = page.locator('[data-testid="worker-status"]');
  await expect(workerStatus).toHaveText('Worker status: connected', { timeout: 10000 });

  // Verify coordinate mapper calculation is rendered
  const coordMapper = page.locator('[data-testid="coord-mapper-test"]');
  await expect(coordMapper).toContainText('A4 1.5x CSS Size: 893px × 1263px');

  // Verify fixtures count is rendered
  const fixturesCount = page.locator('[data-testid="fixtures-count"]');
  await expect(fixturesCount).toHaveText('Sample fixtures registered: 14');
});
