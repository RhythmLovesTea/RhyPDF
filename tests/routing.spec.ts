import { test, expect } from '@playwright/test';

test.describe('Routing skeleton', () => {
  test('navigates through Home -> Editor -> Page Organizer -> Settings', async ({ page }) => {
    // 1. Visit root
    await page.goto('/');
    await expect(page.locator('[data-testid="page-home"]')).toBeVisible();

    // 2. Navigate to Editor
    await page.locator('[data-testid="btn-open-editor"]').click();
    await expect(page.locator('[data-testid="page-editor"]')).toBeVisible();
    expect(page.url()).toContain('#/editor');

    // 3. Navigate to Page Organizer via header nav
    await page.locator('[data-testid="nav-pages"]').click();
    await expect(page.locator('[data-testid="page-organizer"]')).toBeVisible();
    expect(page.url()).toContain('#/pages');

    // 4. Navigate to Settings via header nav
    await page.locator('[data-testid="nav-settings"]').click();
    await expect(page.locator('[data-testid="page-settings"]')).toBeVisible();
    expect(page.url()).toContain('#/settings');

    // 5. Navigate back to Home
    await page.locator('[data-testid="nav-home"]').click();
    await expect(page.locator('[data-testid="page-home"]')).toBeVisible();
  });

  test('deep linking and page refresh works for /pages and /settings', async ({ page }) => {
    // Test deep link to Settings
    await page.goto('/#/settings');
    await expect(page.locator('[data-testid="page-settings"]')).toBeVisible();

    // Test reload preserves route
    await page.reload();
    await expect(page.locator('[data-testid="page-settings"]')).toBeVisible();

    // Test deep link to Page Organizer
    await page.goto('/#/pages');
    await expect(page.locator('[data-testid="page-organizer"]')).toBeVisible();

    // Test reload preserves route
    await page.reload();
    await expect(page.locator('[data-testid="page-organizer"]')).toBeVisible();
    await expect(page.locator('[data-testid="page-card-1"]')).toBeVisible();
  });
});
