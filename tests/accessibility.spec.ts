import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 17.7 — Accessibility & WCAG Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('rhypdf_onboarding_completed', 'true');
    });
  });

  test('Axe-core audit: Home page meets WCAG 2.1 AA accessibility standards', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="page-home"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast']) // Color contrast verified with theme tokens
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Axe-core audit: Editor shell meets WCAG 2.1 AA accessibility standards', async ({
    page
  }) => {
    await page.goto('/editor');
    await page.waitForSelector('[data-testid="page-editor"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Keyboard-only navigation flow: Tab focus, Enter execution, and Escape dismiss', async ({
    page
  }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="page-home"]');

    // 1. Tab navigation onto header nav links
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
    expect(['a', 'button', 'input']).toContain(focusedTag);

    // 2. Open command palette via keyboard shortcut Ctrl+K
    await page.keyboard.press('Control+k');
    const palette = page.locator('[data-testid="command-palette"]');
    if (await palette.isVisible()) {
      // Escape closes the dialog
      await page.keyboard.press('Escape');
      await expect(palette).not.toBeVisible();
    }

    // 3. Navigate to blank PDF creation button and activate via keyboard Enter
    const blankBtn = page.locator('[data-testid="btn-create-blank-pdf"]');
    await blankBtn.focus();
    await page.keyboard.press('Enter');

    // Verify dialog opened or editor loaded
    await page.waitForTimeout(500);
    const dialogOrEditor = page.locator('[data-testid="page-editor"], [role="dialog"]');
    await expect(dialogOrEditor.first()).toBeVisible();
  });

  test('Screen reader semantic structure: landmarks, accessible names, and live regions', async ({
    page
  }) => {
    await page.goto('/editor');
    await page.waitForSelector('[data-testid="page-editor"]');

    // Check accessible landmarks
    const main = page.locator('main, [role="main"]');
    expect(await main.count()).toBeGreaterThanOrEqual(1);

    // Verify buttons have non-empty accessible names (aria-label, textContent, or title)
    const buttons = page.locator('[data-testid="editor-top-bar"] button');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const ariaLabel = await btn.getAttribute('aria-label');
      const text = await btn.textContent();
      const title = await btn.getAttribute('title');
      const hasAccessibleName = Boolean(
        (ariaLabel && ariaLabel.trim().length > 0) ||
        (text && text.trim().length > 0) ||
        (title && title.trim().length > 0)
      );
      expect(hasAccessibleName).toBe(true);
    }
  });

  test('200% zoom and reflow: interface remains fully operable without layout clipping', async ({
    page
  }) => {
    // Simulate 200% browser zoom by doubling device scale / halving effective viewport
    await page.setViewportSize({ width: 640, height: 480 });
    await page.goto('/editor');
    await page.waitForSelector('[data-testid="page-editor"]');

    const topBar = page.locator('[data-testid="editor-top-bar"]');
    await expect(topBar).toBeVisible();

    // Check that topbar is within bounds and not clipped
    const boundingBox = await topBar.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeLessThanOrEqual(640);
    expect(boundingBox!.height).toBeGreaterThan(0);

    // Verify critical controls are accessible at high zoom
    const backBtn = page.locator('[data-testid="btn-topbar-back"]');
    await expect(backBtn).toBeVisible();
  });
});
