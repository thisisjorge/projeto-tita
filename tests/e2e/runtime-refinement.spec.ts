import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

for (const width of [320, 390, 834, 1440]) {
  test(`routine editor at ${width}px keeps populated fields reachable`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app/onboarding');
    await page.getByTestId('onboarding-load-sample-btn').click();
    await page.locator('[data-testid^="edit-routine-btn-"]').first().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('populated-editor.png') });
    const invalid = await dialog.evaluate((el) => {
      const boundary = el.querySelector('.tita-dialog')!.getBoundingClientRect();
      return [...el.querySelectorAll('button, input, select')]
        .filter((control) => {
          const r = control.getBoundingClientRect();
          return (
            r.width &&
            (r.left < boundary.left || r.right > boundary.right || r.height < 44 || r.width < 44)
          );
        })
        .map((control) => control.getAttribute('aria-label') || control.textContent?.trim());
    });
    expect(invalid).toEqual([]);
    const audit = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
  });
}

test('320px workout inputs and steppers remain usable and persist edits', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/app');
  await page.getByTestId('start-workout-button').click();
  const row = page.getByTestId('set-row-1').first();
  for (const control of await row.locator('.tita-set-row__controls button, input').all()) {
    const box = await control.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await row.getByRole('spinbutton', { name: 'Carga série 1', exact: true }).fill('60');
  await row.getByRole('spinbutton', { name: 'Repetições série 1', exact: true }).fill('8');
  await row.getByRole('button', { name: 'Aumentar repetições' }).click();
  await expect(
    row.getByRole('spinbutton', { name: 'Repetições série 1', exact: true }),
  ).toHaveValue('9');
  await row.getByRole('checkbox').click();
  await expect(row.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(row.getByRole('spinbutton', { name: 'Carga série 1', exact: true })).toHaveValue(
    '60',
  );
  await expect(
    row.getByRole('spinbutton', { name: 'Repetições série 1', exact: true }),
  ).toHaveValue('9');
});

test('tablet shell names icon-only navigation and legacy access reaches import', async ({
  page,
}) => {
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.goto('/app/legacy');
  await page.getByRole('button', { name: 'Abrir Configurações' }).click();
  await expect(page).toHaveURL(/\/app\/settings$/);
  await expect(page.getByTestId('import-file-input')).toBeAttached();
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
});

test('short mobile viewport can focus, edit and save the routine form', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 400 });
  await page.goto('/app/onboarding');
  await page.getByTestId('onboarding-load-sample-btn').click();
  await page.locator('[data-testid^="edit-routine-btn-"]').first().click();
  const dialog = page.getByRole('dialog');
  const input = dialog.getByRole('spinbutton').last();
  await input.click();
  await input.fill('12');
  await expect(input).toBeFocused();
  const bounds = await input.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(400);
  await page.getByTestId('save-routine-btn').click();
  await expect(dialog).toBeHidden();
});

test('nested exercise picker keeps focus and Escape closes only the top dialog', async ({
  page,
}) => {
  await page.goto('/app/routines');
  await page.getByTestId('create-routine-btn').click();
  await page.getByTestId('add-exercise-to-routine-btn').click();
  const picker = page.getByRole('dialog', { name: 'Selecionar Exercício', exact: true });
  await expect(picker).toBeVisible();
  const last = picker.getByRole('button', { name: 'Fechar', exact: true });
  await last.focus();
  await page.keyboard.press('Tab');
  await expect(picker.getByRole('button', { name: 'Fechar janela' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(picker).toBeHidden();
  await expect(page.getByTestId('save-routine-btn')).toBeVisible();
  await expect(page.getByTestId('add-exercise-to-routine-btn')).toBeFocused();
});

test('starting rest paints its remaining time before the first interval tick', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-20T12:00:00Z') });
  await page.goto('/app');
  await page.getByTestId('start-workout-button').click();
  await page.clock.pauseAt(new Date('2026-09-20T12:01:00Z'));
  try {
    await page.getByTestId('complete-set-btn-1').first().click();
    await expect(page.getByTestId('rest-timer-display')).toBeVisible();
    await expect(page.getByTestId('rest-timer-display')).not.toHaveAttribute('aria-label', /00:00/);
    await expect(page.getByTestId('timer-announcer')).toHaveText(/Descanso iniciado: (?!00:00)/);
  } finally {
    await page.clock.resume();
  }
});

test('set menu preserves keyboard focus, Escape and keyboard deletion', async ({ page }) => {
  await page.goto('/app');
  await page.getByTestId('start-workout-button').click();
  const row = page.getByTestId('set-row-1').first();
  const trigger = row.locator('summary');
  const remove = row.getByRole('button', { name: 'Remover série 1' });
  await trigger.focus();
  await trigger.press('Enter');
  await page.keyboard.press('Tab');
  await expect(remove).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(remove).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('.tita-set-row')).toHaveCount(5);
});

test.describe('touch set menu', () => {
  test.use({ hasTouch: true, viewport: { width: 360, height: 800 } });
  test('tap deletes only the selected series and survives reload', async ({ page }) => {
    await page.goto('/app');
    await page.getByTestId('start-workout-button').tap();
    const row = page.getByTestId('set-row-1').first();
    await row.locator('summary').tap();
    await row.getByRole('button', { name: 'Remover série 1' }).tap();
    await expect(page.locator('.tita-set-row')).toHaveCount(5);
    await page.reload();
    await expect(page.locator('.tita-set-row')).toHaveCount(5);
  });
});
