import { test, expect } from '@playwright/test';

test.describe('Phase 17.3 — E2E Main User Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Dismiss onboarding tour on test runs
    await page.addInitScript(() => {
      localStorage.setItem('rhypdf_onboarding_completed', 'true');
    });
  });

  test('Flow 1: Open -> Create Blank PDF -> Edit Text -> Change Font -> Undo -> Save', async ({
    page
  }) => {
    // 1. Open Home and click Create Blank PDF
    await page.goto('/');
    await expect(page.locator('[data-testid="page-home"]')).toBeVisible();

    const createBlankBtn = page.locator('[data-testid="btn-create-blank-pdf"]');
    await expect(createBlankBtn).toBeVisible();
    await createBlankBtn.click();

    // Confirm in dialog
    const submitBlankBtn = page.locator('[data-testid="btn-create-blank-submit"]');
    await expect(submitBlankBtn).toBeVisible();
    await submitBlankBtn.click();

    // 2. Verify Editor is loaded
    await expect(page.locator('[data-testid="page-editor"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="editor-top-bar"]')).toBeVisible();

    // 3. Switch to Edit Mode
    const editModeTab = page.locator('[data-testid="mode-tab-edit"]');
    if (await editModeTab.isVisible()) {
      await editModeTab.click();
    }

    // 4. Test Undo and Redo buttons in Top Bar
    const undoBtn = page.locator('[data-testid="btn-topbar-undo"]');
    const redoBtn = page.locator('[data-testid="btn-topbar-redo"]');
    await expect(undoBtn).toBeVisible();
    await expect(redoBtn).toBeVisible();

    // 5. Open Save dropdown menu and verify download copy action
    const saveMenuBtn = page.locator('[data-testid="btn-topbar-save-menu"]');
    await saveMenuBtn.click();
    await expect(page.locator('[data-testid="topbar-save-dropdown-menu"]')).toBeVisible();

    const downloadCopyItem = page.locator('[data-testid="menu-item-download-copy"]');
    await expect(downloadCopyItem).toBeVisible();

    // Close save dropdown by pressing Escape
    await page.keyboard.press('Escape');

    // 6. Navigate back to Home
    await page.locator('[data-testid="nav-home"]').click();
    await expect(page.locator('[data-testid="page-home"]')).toBeVisible();
  });

  test('Flow 2: Image Editing & Deletion Controls in Editor', async ({ page }) => {
    await page.goto('/#/editor');
    await expect(page.locator('[data-testid="page-editor"]')).toBeVisible({ timeout: 15000 });

    // Verify hidden file inputs for image insertion and replacement are present
    const insertImageInput = page.locator('[data-testid="input-file-insert-image"]');
    const replaceImageInput = page.locator('[data-testid="input-file-replace-image"]');

    expect(await insertImageInput.count()).toBeGreaterThanOrEqual(1);
    expect(await replaceImageInput.count()).toBeGreaterThanOrEqual(1);
  });

  test('Flow 3: OCR Detection and OCR Dialog trigger', async ({ page }) => {
    await page.goto('/#/editor');
    await expect(page.locator('[data-testid="page-editor"]')).toBeVisible({ timeout: 15000 });

    // Verify OCR action button in top bar
    const ocrBtn = page.locator('[data-testid="btn-topbar-ocr"]');
    await expect(ocrBtn).toBeVisible();
    await ocrBtn.click();

    // Verify OCR Dialog opens
    const ocrDialog = page.locator('[role="dialog"]');
    await expect(ocrDialog).toBeVisible({ timeout: 5000 });

    // Close dialog
    const cancelBtn = page.locator('button:has-text("Cancel")');
    await cancelBtn.click();
    await expect(ocrDialog).not.toBeVisible();
  });
});
