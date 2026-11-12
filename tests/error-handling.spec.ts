import { test, expect } from '@playwright/test';

test.describe('Error Boundary and Crash Recovery', () => {
  test('displays friendly screen and preserves recovery metadata when an error is thrown', async ({
    page
  }) => {
    // Dismiss onboarding
    await page.addInitScript(() => {
      localStorage.setItem('rhypdf_onboarding_completed', 'true');
    });

    // Navigate to settings
    await page.goto('/#/settings');
    await expect(page.locator('[data-testid="page-settings"]')).toBeVisible();

    // Trigger deliberate crash
    const crashBtn = page.locator('[data-testid="btn-crash-trigger"]');
    await crashBtn.click();

    // Verify Error Boundary renders friendly fallback screen
    const errorFallback = page.locator('[data-testid="error-boundary-fallback"]');
    await expect(errorFallback).toBeVisible();

    // Verify error message text
    const errorMsg = page.locator('[data-testid="error-message-text"]');
    await expect(errorMsg).toContainText(
      'Intentional crash test triggered for ErrorBoundary verification'
    );

    // Verify localStorage has saved recovery metadata
    const recoveryMeta = await page.evaluate(() => {
      const raw = localStorage.getItem('rhypdf_recovery_metadata');
      return raw ? JSON.parse(raw) : null;
    });

    expect(recoveryMeta).not.toBeNull();
    expect(recoveryMeta.errorReason).toContain('Intentional crash test triggered');

    // Click "Recover Session"
    await page.locator('[data-testid="btn-recover-session"]').click({ force: true });

    // Verify app recovers gracefully to Home view
    await expect(page.locator('[data-testid="page-home"]')).toBeVisible();
  });
});
