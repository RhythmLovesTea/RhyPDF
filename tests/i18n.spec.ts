import { test, expect } from '@playwright/test';

test.describe('Task 1.8: i18n scaffolding and RTL pseudo-locale rendering', () => {
  test('initializes in English LTR by default and switches to RTL pseudo-locale without layout breakage', async ({
    page
  }) => {
    // 1. Visit root home page
    await page.goto('/#/');

    // Verify initial HTML attributes
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await expect(html).toHaveAttribute('lang', 'en');

    // Verify English text
    const homeTitle = page.locator('[data-testid="page-home"] h1');
    await expect(homeTitle).toHaveText('RhyPDF Workspace');

    // 2. Navigate to Settings
    await page.locator('[data-testid="nav-settings"]').click();
    await expect(page.locator('[data-testid="page-settings"]')).toBeVisible();

    // 3. Switch Language to Pseudo-Locale (qps-ploc)
    const langSelect = page.locator('[data-testid="select-language"]');
    await langSelect.selectOption('qps-ploc');

    // 4. Verify HTML direction switches to RTL and lang is qps-ploc
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'qps-ploc');

    // 5. Verify UI text is pseudo-localized with brackets and elongation
    const settingsHeading = page.locator('[data-testid="page-settings"] h1');
    const settingsHeadingText = await settingsHeading.textContent();
    expect(settingsHeadingText).toContain('[!!!');
    expect(settingsHeadingText).toContain('!!!]');

    // 6. Verify navigation bar buttons have pseudo-localized strings
    const navHomeBtn = page.locator('[data-testid="nav-home"]');
    const navHomeText = await navHomeBtn.textContent();
    expect(navHomeText).toContain('[!!!');
    expect(navHomeText).toContain('!!!]');

    // 7. Test Home page in RTL pseudo-locale for layout elasticity
    await navHomeBtn.click();
    await expect(page.locator('[data-testid="page-home"]')).toBeVisible();

    // Check that there is no unwanted horizontal page overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // 8. Test Page Organizer in RTL pseudo-locale
    await page.locator('[data-testid="nav-pages"]').click();
    await expect(page.locator('[data-testid="page-organizer"]')).toBeVisible();

    const pageCard1 = page.locator('[data-testid="page-card-1"]');
    await expect(pageCard1).toBeVisible();

    // Verify buttons inside cards are clickable and properly styled
    const rotateBtn = pageCard1.locator('button').first();
    await expect(rotateBtn).toBeVisible();
    await rotateBtn.click();

    // 9. Switch to Arabic (ar) in Settings and verify genuine RTL Arabic script
    await page.locator('[data-testid="nav-settings"]').click();
    await page.locator('[data-testid="select-language"]').selectOption('ar');

    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'ar');

    const arSettingsHeading = page.locator('[data-testid="page-settings"] h1');
    await expect(arSettingsHeading).toHaveText('إعدادات التطبيق');

    // 10. Switch back to English (en) and verify restoration of LTR
    await page.locator('[data-testid="select-language"]').selectOption('en');
    await expect(html).toHaveAttribute('dir', 'ltr');
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(page.locator('[data-testid="page-settings"] h1')).toHaveText(
      'Application Settings'
    );
  });
});
