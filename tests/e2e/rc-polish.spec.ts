import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test('RC: onboarding keeps its primary action comfortable and passes contrast checks', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/onboarding');
  const cta = page.getByTestId('onboarding-load-sample-btn');
  await expect(cta).toBeVisible();
  const box = await cta.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(52);
  expect(box!.width).toBeGreaterThan(280);
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await cta.click();
  await expect(page).toHaveURL(/routines/);
  await expect(page.locator('[data-testid^="start-routine-btn-"]').first()).toBeVisible();
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const button of await page.locator('.tita-routines-secondary button').all()) {
      const bounds = await button.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
    }
  }
});

for (const width of [360, 390, 430]) {
  test(`RC: ${width}px logging keeps completion direct and deletion secondary`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app');
    await page.getByTestId('start-workout-button').click();
    const row = page.getByTestId('set-row-1').first();
    const remove = page.getByRole('button', { name: 'Remover série 1', exact: true });
    await expect(remove).toBeHidden();
    const complete = row.getByRole('checkbox');
    await complete.click();
    await expect(complete).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByTestId('rest-timer-display')).toBeVisible();
    for (const target of [complete, row.locator('summary')]) {
      const box = await target.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    expect(overflow).toBe(false);
    await row.locator('summary').click();
    await expect(remove).toBeVisible();
    await remove.click();

    // The UI publishes the new set list after the IndexedDB write completes.
    await expect(page.locator('.tita-set-row')).toHaveCount(5);

    await page.reload();
    await expect(page.getByTestId('active-workout-session')).toBeVisible();
    await expect(page.locator('.tita-set-row')).toHaveCount(5);
  });
}

test('RC: empty history/progress offer a useful action without empty filters', async ({ page }) => {
  await page.goto('/app/history');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('search-history-input')).toHaveCount(0);
  await page.getByRole('button', { name: 'Escolher treino' }).click();
  await expect(page).toHaveURL(/routines/);
  await page.goto('/app/progress');
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await expect(page.getByTestId('time-range-ALL')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Escolher treino' })).toBeVisible();
});

test('RC: desktop has one visible local status and theme toggle', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Pronto para treinar?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alternar tema claro e escuro' })).toHaveCount(1);
  await expect(page.locator('[data-testid="connection-status"]:visible')).toHaveCount(1);
  await page.getByRole('button', { name: 'Alternar tema claro e escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('RC: reduced motion suppresses set feedback and stops automatic exercise playback', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/app');
  await page.getByTestId('start-workout-button').click();
  const complete = page.getByTestId('complete-set-btn-1').first();
  await complete.click();
  expect(await complete.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
  await page.goto('/app/library');
  await page.locator('[data-testid^="exercise-card-"]').first().click();
  await expect(page.getByRole('button', { name: 'Reproduzir animação' })).toBeVisible();
  const frame = page
    .getByTestId('exercise-media-thumbnail')
    .locator('.tita-exercise-illustration')
    .first();
  const source = await frame.getAttribute('src');
  await page.waitForTimeout(900);
  await expect(frame).toHaveAttribute('src', source!);
});

test('RC: custom exercise dialog keeps paired fields inside the mobile viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/app/library');
  await page.getByTestId('create-custom-exercise-btn').click();

  const dialog = page.locator('.tita-dialog');
  await expect(dialog).toBeVisible();

  const hasHorizontalOverflow = await dialog.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);

  const dialogBox = await dialog.boundingBox();
  const incrementBox = await page.getByLabel('Incremento Mínimo (kg)').boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(incrementBox).not.toBeNull();
  expect(incrementBox!.x).toBeGreaterThanOrEqual(dialogBox!.x);
  expect(incrementBox!.x + incrementBox!.width).toBeLessThanOrEqual(
    dialogBox!.x + dialogBox!.width,
  );
});

test('RC: exercise media advances normally and stays contrasted in light mode', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/library');
  await page.getByRole('button', { name: 'Alternar tema claro e escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  const preview = page
    .locator('[data-testid^="exercise-card-"] .tita-exercise-illustration')
    .first();
  await expect(preview).toBeVisible();
  expect(await preview.evaluate((el) => getComputedStyle(el).filter)).not.toBe('none');

  await page.locator('[data-testid^="exercise-card-"]').first().click();
  const frame = page
    .getByTestId('exercise-media-gif')
    .locator('.tita-exercise-illustration')
    .first();
  await expect(frame).toBeVisible();
  await expect(frame).toHaveAttribute('src', /animation\.gif$/);
  await expect(frame).toHaveJSProperty('naturalWidth', 256);
  const firstFrame = await frame.screenshot();
  await expect.poll(async () => (await frame.screenshot()).equals(firstFrame)).toBe(false);
});
