import { test, expect } from '@playwright/test';

test.describe('Projeto Titã — Public RC Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test('loads the current React application shell', async ({ page }) => {
    await expect(page).toHaveTitle(/Projeto Titã/i);
    await expect(page.locator('#main-content')).toBeVisible();
    await expect(page.getByTestId('start-workout-button')).toBeVisible({
      timeout: 10000,
    });
  });

  test('loads the primary product routes', async ({ page }) => {
    const views = [
      { path: '/app/routines', ready: '[data-testid="create-routine-btn"]' },
      { path: '/app/library', ready: '[data-testid="create-custom-exercise-btn"]' },
      { path: '/app/settings', ready: '[data-testid="toggle-advanced-tracking-master"]' },
    ];

    for (const view of views) {
      await page.goto(view.path);
      await expect(page.locator(view.ready)).toBeVisible({
        timeout: 10000,
      });
    }
  });

  test('restores an active workout after reload', async ({ page }) => {
    await page.getByTestId('start-workout-button').click();

    await expect(page.getByTestId('active-workout-session')).toBeVisible({
      timeout: 10000,
    });

    await page.reload();

    await expect(page.getByTestId('active-workout-session')).toBeVisible({
      timeout: 10000,
    });
  });
});
