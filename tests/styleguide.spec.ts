import { test, expect } from '@playwright/test';

test('Style guide displays all 11 design-system components in light and dark mode', async ({
  page
}) => {
  await page.goto('/#styleguide');

  // Verify style guide root exists
  const root = page.locator('[data-testid="styleguide-root"]');
  await expect(root).toBeVisible();

  // Verify initial light theme
  await expect(root).toHaveAttribute('data-theme', 'light');

  // 1. Verify all sections are visible
  await expect(page.locator('[data-testid="section-buttons"]')).toBeVisible();
  await expect(page.locator('[data-testid="section-tooltip-popover"]')).toBeVisible();
  await expect(page.locator('[data-testid="section-dialog"]')).toBeVisible();
  await expect(page.locator('[data-testid="section-menu"]')).toBeVisible();
  await expect(page.locator('[data-testid="section-tabs"]')).toBeVisible();
  await expect(page.locator('[data-testid="section-controls"]')).toBeVisible();
  await expect(page.locator('[data-testid="section-toast"]')).toBeVisible();

  // 2. Test Dark Mode toggle
  const themeToggle = page.locator('[data-testid="theme-toggle-btn"]');
  await themeToggle.click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
  await expect(root).toHaveClass(/dark/);

  // Switch back to light
  await themeToggle.click();
  await expect(root).toHaveAttribute('data-theme', 'light');

  // 3. Test Dialog component
  const openDialogBtn = page.locator('[data-testid="open-dialog-btn"]');
  const dialogState = page.locator('[data-testid="dialog-state"]');
  await expect(dialogState).toHaveText('closed');
  await openDialogBtn.click();
  await expect(dialogState).toHaveText('open');
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
  await expect(page.locator('#dialog-title')).toHaveText('Sample Modal Dialog');
  // Close dialog
  await page.locator('button[aria-label="Close dialog"]').click();
  await expect(dialog).not.toBeVisible();

  // 4. Test Tabs component
  const securityTab = page.locator('button[role="tab"]:has-text("Security")');
  await securityTab.click();
  await expect(page.locator('[role="tabpanel"]')).toContainText('Security settings tab content.');

  // 5. Test Popover trigger
  const popoverBtn = page.locator('[data-testid="popover-trigger"]');
  await popoverBtn.click();
  await expect(page.locator('text=Popover content anchored to trigger')).toBeVisible();

  // 6. Test Select control
  const select = page.locator('[data-testid="sample-select"]');
  await select.selectOption('opt2');
  await expect(select).toHaveValue('opt2');

  // 7. Test Toast dismissal
  const toastClose = page.locator('button[aria-label="Dismiss toast"]');
  await toastClose.click();
  await expect(page.locator('text=File Saved Locally')).not.toBeVisible();
});
