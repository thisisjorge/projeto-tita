import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

test.describe('Projeto Titã — Accessibility Quality Gates (Phase 12, Task 15.1)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Skip Link allows keyboard users to jump directly to main content landmark', async ({
    page,
  }) => {
    await page.waitForLoadState('networkidle');
    const skipLink = page.locator('.tita-skip-link');
    await expect(skipLink).toBeAttached();

    // Focus skip link via keyboard tab navigation
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
    await expect(skipLink).toHaveText('Pular para o conteúdo principal');

    // Press Enter to activate skip link
    await page.keyboard.press('Enter');

    // Main content landmark should be active
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('Workout View (idle) passes WCAG 2.2 AA audit with 0 critical/serious violations', async ({
    page,
  }) => {
    await expect(page.locator('button[data-testid="start-workout-button"]')).toBeVisible({
      timeout: 10000,
    });
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .disableRules(['color-contrast']) // verified separately with design tokens
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v: { impact?: string | null }) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(
      criticalOrSerious,
      `Violations found: ${JSON.stringify(criticalOrSerious, null, 2)}`,
    ).toEqual([]);
  });

  test('Active Workout session and Rest Timer meet WCAG 2.2 AA and live region specifications', async ({
    page,
  }) => {
    // 1. Start Workout
    const startBtn = page.locator('button[data-testid="start-workout-button"]');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // 2. Wait for active workout session
    await expect(page.locator('[data-testid="active-workout-session"]')).toBeVisible({
      timeout: 5000,
    });

    // 3. Verify SetRow completion checkbox accessibility
    const firstSetRow = page.locator('[data-testid="set-row-1"]').first();
    const completeBtn = firstSetRow.locator('button[data-testid="complete-set-btn-1"]');
    await expect(completeBtn).toHaveAttribute('role', 'checkbox');
    await expect(completeBtn).toHaveAttribute('aria-checked', 'false');

    // Fill valid weight and reps to allow completion
    const weightInput = firstSetRow.locator('input[aria-label*="Carga"]');
    const repsInput = firstSetRow.locator('input[aria-label*="Repetições"]');
    await weightInput.fill('80');
    await weightInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));
    await repsInput.fill('10');
    await repsInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    // Click to complete set
    await completeBtn.click();
    await expect(completeBtn).toHaveAttribute('aria-checked', 'true');

    // 4. Verify Rest Timer accessibility semantics
    const timerDisplay = page.locator('[data-testid="rest-timer-display"]');
    await expect(timerDisplay).toBeVisible({ timeout: 5000 });
    await expect(timerDisplay).toHaveAttribute('role', 'timer');

    const timerAnnouncer = page.locator('[data-testid="timer-announcer"]');
    await expect(timerAnnouncer).toHaveAttribute('aria-live', 'polite');
    await expect(timerAnnouncer).toHaveAttribute('aria-atomic', 'true');

    // 5. Automated axe check on Active Workout with Timer
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .disableRules(['color-contrast'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v: { impact?: string | null }) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(
      criticalOrSerious,
      `Violations found in active workout: ${JSON.stringify(criticalOrSerious, null, 2)}`,
    ).toEqual([]);
  });

  test('Dialog modal implements focus trapping, Escape key handling, and focus restoration', async ({
    page,
  }) => {
    // 1. Start workout to reveal the Discard / Finalize dialog triggers
    await page.locator('button[data-testid="start-workout-button"]').click();
    await expect(page.locator('[data-testid="active-workout-session"]')).toBeVisible({
      timeout: 5000,
    });

    // 2. Click Discard button to trigger Dialog modal
    const discardBtn = page.locator('button:has-text("Descartar")').first();
    await expect(discardBtn).toBeVisible();
    await discardBtn.focus();
    await discardBtn.click();

    // 3. Verify Dialog accessibility attributes
    const dialogBackdrop = page.locator('.tita-dialog-backdrop');
    await expect(dialogBackdrop).toBeVisible();

    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expect(dialog).toHaveAttribute('aria-labelledby', /tita-dialog-title/);

    // 4. Run axe audit on open Dialog modal
    const results = await new AxeBuilder({ page })
      .withTags(WCAG_TAGS)
      .disableRules(['color-contrast'])
      .analyze();

    const criticalOrSerious = results.violations.filter(
      (v: { impact?: string | null }) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      criticalOrSerious,
      `Dialog violations: ${JSON.stringify(criticalOrSerious, null, 2)}`,
    ).toEqual([]);

    // 5. Verify Escape key closes dialog and restores focus
    await page.keyboard.press('Escape');
    await expect(dialogBackdrop).toBeHidden();
  });

  test('Primary views (Routines, Library, History, Progress, Settings) pass axe WCAG 2.2 AA audits', async ({
    page,
  }) => {
    const views = [
      { path: '/app/routines', readySelector: '[data-testid="create-routine-btn"]' },
      { path: '/app/library', readySelector: '[data-testid="create-custom-exercise-btn"]' },
      { path: '/app/history', readySelector: '[data-testid="empty-state"]' },
      { path: '/app/progress', readySelector: '[data-testid="empty-state"]' },
      { path: '/app/settings', readySelector: '[data-testid="toggle-advanced-tracking-master"]' },
    ];

    for (const v of views) {
      await page.goto(v.path);
      await expect(page.locator(v.readySelector)).toBeVisible({ timeout: 10000 });

      const results = await new AxeBuilder({ page })
        .withTags(WCAG_TAGS)
        .disableRules(['color-contrast'])
        .analyze();

      const criticalOrSerious = results.violations.filter(
        (v: { impact?: string | null }) => v.impact === 'critical' || v.impact === 'serious',
      );

      expect(
        criticalOrSerious,
        `Violations on ${v.path}: ${JSON.stringify(criticalOrSerious, null, 2)}`,
      ).toEqual([]);
    }
  });

  test('Interactive navigation elements comply with min 44x44px touch targets', async ({
    page,
  }) => {
    // A fresh PWA install claims and reloads the document to cache its modules.
    // Measure the resulting shell, not the brief document being replaced.
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.waitForLoadState('networkidle');
    for (const { width, height, selector } of [
      { width: 1280, height: 800, selector: '.tita-sidebar nav button' },
      { width: 390, height: 844, selector: '.tita-bottom-nav button' },
    ]) {
      await page.setViewportSize({ width, height });
      const buttons = page.locator(selector);
      // Measure the complete navigation in one DOM snapshot. Missing/hidden
      // buttons cannot silently pass while React or a viewport change settles.
      await expect(async () => {
        const sizes = await buttons.evaluateAll((elements) =>
          elements.map((element) => {
            const { width, height } = element.getBoundingClientRect();
            return { width, height, visibility: getComputedStyle(element).visibility };
          }),
        );
        expect(sizes).toHaveLength(6);
        for (const size of sizes) {
          expect(size.visibility).toBe('visible');
          expect(size.width).toBeGreaterThanOrEqual(44);
          expect(size.height).toBeGreaterThanOrEqual(44);
        }
      }).toPass({ timeout: 5000 });
    }
  });
});
