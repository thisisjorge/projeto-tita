import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

test('quick start waits for IndexedDB readiness instead of losing an early click', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const open = IDBFactory.prototype.open;
    const ready = new Promise<void>((resolve) =>
      window.addEventListener('qa:release-database', () => resolve(), { once: true }),
    );
    IDBFactory.prototype.open = function (...args) {
      const request = open.apply(this, args);
      Object.defineProperty(request, 'onsuccess', {
        set(handler: IDBOpenDBRequest['onsuccess']) {
          request.addEventListener('success', (event) => {
            void ready.then(() => handler?.call(request, event));
          });
        },
      });
      return request;
    };
  });
  await page.goto('/app');
  const start = page.getByTestId('start-workout-button');
  await expect(start).toBeVisible();
  await expect(start).toBeDisabled();
  await page.evaluate(() => window.dispatchEvent(new Event('qa:release-database')));
  await expect(start).toBeEnabled();
  await start.click();
  await expect(page.getByTestId('active-workout-session')).toBeVisible();
});

test('completed reps allow blank draft, replacement, reload and finalization', async ({ page }) => {
  await page.goto('/app');
  await page.getByTestId('start-workout-button').click();
  const row = page.getByTestId('set-row-1').first();
  const weight = row.getByLabel('Carga série 1', { exact: true });
  const reps = row.getByLabel('Repetições série 1', { exact: true });
  await weight.fill('55');
  await reps.fill('20');
  await reps.press('ControlOrMeta+A');
  await reps.pressSequentially('15');
  await expect(reps).toHaveValue('15');
  await reps.fill('20');
  await row.getByRole('checkbox').click();
  await expect(row.getByRole('checkbox')).toBeChecked();
  await reps.fill('');
  await expect(reps).toHaveValue('');
  await expect(page.getByText(/Invalid exercise set/)).toHaveCount(0);
  await reps.fill('15');
  await reps.press('Tab');
  await expect(page.getByTestId('save-status-indicator')).toContainText('Salvo');
  await page.reload();
  await expect(reps).toHaveValue('15');
  await expect(weight).toHaveValue('55');
  await page.getByTestId('finalize-workout-button').click();
  await page.getByTestId('confirm-finalize-button').click();
  await expect(page.getByTestId('workout-completion-summary')).toContainText('825 kg');
  await page.getByRole('button', { name: 'Concluir e Voltar' }).click();
  await expect(page.getByText(/Invalid exercise set/)).toHaveCount(0);
});

for (const width of [320, 360, 390, 412, 430, 768, 834, 1024, 1280, 1440]) {
  test(`context menus remain inside viewport at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app');
    await page.getByTestId('start-workout-button').click();
    await page.getByLabel('Opções da série 1', { exact: true }).first().click();
    const action = page.getByRole('button', { name: 'Remover série 1', exact: true }).first();
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(8);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width - 8);
    await page.keyboard.press('Escape');
    await expect(action).toBeHidden();
    await page.locator('.tita-exercise-options summary').first().click();
    const help = page.getByRole('button', { name: '? Ajude-me', exact: true });
    await expect(help).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(help).toBeHidden();
  });
}

test('drafts support replacement and incomplete edits without losing saved values', async ({
  page,
}) => {
  await page.goto('/app');
  await page.getByTestId('start-workout-button').click();
  const row = page.getByTestId('set-row-1').first();
  const weight = row.getByLabel('Carga série 1', { exact: true });
  const reps = row.getByLabel('Repetições série 1', { exact: true });
  await reps.fill('8');
  await reps.fill('');
  await expect(reps).toHaveValue('');
  await reps.fill('12');
  await weight.fill('20');
  await weight.fill('');
  await expect(weight).toHaveValue('');
  await weight.fill('22.5');
  await row.getByRole('checkbox').click();
  await expect(row.getByRole('checkbox')).toBeChecked();
  await reps.fill('');
  await reps.press('Tab');
  await expect(row.getByRole('checkbox')).not.toBeChecked();
  await expect(row.getByText(/Série pendente/)).toBeVisible();
  await expect(reps).toHaveValue('12');
  await row.getByLabel('Aumentar repetições', { exact: true }).click();
  await expect(reps).toHaveValue('13');
  await expect(reps).not.toHaveAttribute('aria-invalid', 'true');
  await reps.fill('15');
  await reps.press('Enter');
  await row.getByRole('checkbox').click();
  await expect(page.getByTestId('save-status-indicator')).toContainText('Salvo');
  await page.reload();
  await expect(reps).toHaveValue('15');
  await expect(weight).toHaveValue('22.5');
  await expect(row.getByRole('checkbox')).toBeChecked();
});

test('Titã set picker supports keyboard selection, Escape and reload', async ({ page }) => {
  await page.goto('/app/settings');
  await page.getByTestId('preset-recommended-btn').click();
  await expect(page.getByText('Predefinição aplicada e salva localmente.')).toBeVisible();
  await page.goto('/app');
  await page.getByTestId('start-workout-button').click();
  const picker = page.getByLabel('Tipo da série 1', { exact: true }).first();
  await picker.focus();
  await picker.press('ArrowDown');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(picker).toContainText('Aquecimento');
  await expect(picker).toBeFocused();
  await picker.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(picker).toBeFocused();
  await expect(page.getByTestId('save-status-indicator')).toContainText('Salvo');
  await page.reload();
  await expect(picker).toContainText('Aquecimento');
});
