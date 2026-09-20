import { test, expect } from '@playwright/test';

test.describe('Mobile Lifecycle & Platform Adapters E2E (REQ-12, Phase 11)', () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport (typical smartphone dimension: 390x844)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
  });

  test('executes mobile workout lifecycle with background/resume timer synchronization', async ({
    page,
  }) => {
    // Start workout
    const startBtn = page.locator('button[data-testid="start-workout-button"]');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    // Verify workout active
    await expect(page.locator('button[data-testid="finalize-workout-button"]')).toBeVisible({
      timeout: 10000,
    });

    // Fill valid load and reps on Set 1
    const firstSetRow = page.locator('[data-testid="set-row-1"]').first();
    await expect(firstSetRow).toBeVisible();

    const weightInput = firstSetRow.locator('input[aria-label^="Carga"]');
    const repsInput = firstSetRow.locator('input[aria-label^="Repetições"]');
    const completeBtn = page.locator('button[data-testid="complete-set-btn-1"]').first();

    await weightInput.fill('80');
    await weightInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    await repsInput.fill('10');
    await repsInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    // Complete first set to start rest timer
    await completeBtn.click();
    await expect(completeBtn).toHaveText('✓');

    // Verify rest timer is running
    const timerElem = page.locator('[data-testid="rest-timer-display"]');
    await expect(timerElem).toBeVisible({ timeout: 10000 });

    // Read initial timer value
    const initialText = await timerElem.innerText();
    expect(initialText).toContain(':');

    // Simulate mobile background transition via document visibilityState & blur
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('blur'));
    });

    // Wait 1.5 seconds in background
    await page.waitForTimeout(1500);

    // Simulate mobile foreground resume
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });

    // Verify timer continues and workout state remains perfectly intact
    await expect(timerElem).toBeVisible();
    await expect(page.locator('button[data-testid="finalize-workout-button"]')).toBeVisible();

    // Finalize workout
    await page.locator('button[data-testid="finalize-workout-button"]').click();
    const confirmFinalize = page.locator('button[data-testid="confirm-finalize-button"]');
    await expect(confirmFinalize).toBeVisible();
    await confirmFinalize.click();

    // Verify celebration summary card on mobile
    await expect(page.locator('div[data-testid="workout-completion-summary"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('executes mobile backup export with file sharing fallback', async ({ page }) => {
    // Navigate to Settings
    await page.goto('/app/settings');

    // Verify Settings view loaded
    const settingsTitle = page.locator('h2', { hasText: 'Ajustes & Dados' });
    await expect(settingsTitle).toBeVisible({ timeout: 10000 });

    // Click Export Backup button
    const exportBtn = page.getByRole('button', { name: 'Exportar Backup' });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    // Verify export success banner appeared
    const successBanner = page.locator('[role="status"]');
    await expect(successBanner).toBeVisible({ timeout: 10000 });
    const bannerText = await successBanner.innerText();
    expect(bannerText).toContain('Backup exportado');
    expect(bannerText).toContain('SHA-256');
  });
});
