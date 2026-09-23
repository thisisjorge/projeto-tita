import { test as base, expect } from '@playwright/test';
import { createOfflineOrigin } from '../helpers/offline-origin.js';

const test = base.extend<{ offlineOrigin: Awaited<ReturnType<typeof createOfflineOrigin>> }>({
  offlineOrigin: async ({ baseURL }, use) => {
    const origin = await createOfflineOrigin(baseURL!);
    try {
      await use(origin);
    } finally {
      await origin.stop();
    }
  },
});

test('first PWA installation prepares the shell for offline reload', async ({
  page,
  context,
  browserName,
  offlineOrigin,
}) => {
  await page.goto(offlineOrigin.url + '/app');
  await page.getByTestId('start-workout-button').waitFor();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('start-workout-button')).toBeVisible();
  const scriptsCached = await page.evaluate(async () =>
    Promise.all(
      [...document.querySelectorAll<HTMLScriptElement>('script[src]')].map(async (script) =>
        Boolean(await caches.match(script.src)),
      ),
    ),
  );
  expect(scriptsCached.length).toBeGreaterThan(0);
  expect(scriptsCached.every(Boolean)).toBe(true);
  await offlineOrigin.stop();
  await expect(fetch(offlineOrigin.url + '/uncached-network-probe')).rejects.toThrow();
  if (browserName !== 'webkit') await context.setOffline(true);
  const reloaded = await page.reload();
  expect(reloaded?.fromServiceWorker()).toBe(true);
  await expect(page.getByTestId('start-workout-button')).toBeVisible();
  await expect(page.locator('.tita-sidebar nav button')).toHaveCount(6);
});

test.describe('Projeto Titã — PWA & Offline Support (REQ-8, Phase 9)', () => {
  test('completes entire Core Workout Flow offline after initial load (Task 10.3)', async ({
    page,
    context,
  }) => {
    // 1. Initial online load to initialize database and precache app shell
    await page.goto('/app');
    const startBtn = page.locator('button[data-testid="start-workout-button"]');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // 2. Emulate network disconnection (Offline Mode)
    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // 3. Verify visual offline indicator in AppShell
    const offlineIndicator = page.locator('[data-testid="connection-status"]:visible');
    await expect(offlineIndicator).toHaveText('Offline', { timeout: 5000 });

    // 4. Navigate across all primary sections while offline
    // Exercícios (Library)
    await page.click('button:has-text("Exercícios")');
    await expect(page.locator('text=Biblioteca de Exercícios')).toBeVisible();

    // Rotinas (Routines)
    await page.click('button:has-text("Rotinas")');
    await expect(page.locator('text=Minhas Rotinas')).toBeVisible();

    // Histórico (History)
    await page.click('button:has-text("Histórico")');
    await expect(page.locator('text=Histórico de Treinos')).toBeVisible();

    // Progresso (Progress)
    await page.click('button:has-text("Progresso")');
    await expect(page.locator('text=Progresso e Recordes Pessoais')).toBeVisible();

    // 5. Return to Treino and execute active workout lifecycle offline
    await page.click('button:has-text("Treino")');
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Active Workout session should start and render offline
    const activeSession = page.locator('[data-testid="active-workout-session"]');
    await expect(activeSession).toBeVisible({ timeout: 5000 });

    // Log first set: 95 kg × 8 reps
    const firstSetRow = page.locator('[data-testid="set-row-1"]').first();
    await expect(firstSetRow).toBeVisible();

    const weightInput = firstSetRow.locator('input[aria-label^="Carga"]');
    const repsInput = firstSetRow.locator('input[aria-label^="Repetições"]');
    const checkBtn = firstSetRow.getByRole('checkbox');

    await weightInput.fill('95');
    await weightInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    await repsInput.fill('8');
    await repsInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    await checkBtn.click();
    await expect(checkBtn).toHaveText('✓');

    // Finalize workout offline
    const finalizeBtn = page.locator('button[data-testid="finalize-workout-button"]');
    await expect(finalizeBtn).toBeVisible();
    await finalizeBtn.click();

    const confirmFinalizeBtn = page.locator('button[data-testid="confirm-finalize-button"]');
    await expect(confirmFinalizeBtn).toBeVisible();
    await confirmFinalizeBtn.click();

    // Summary celebration appears
    const summary = page.locator('[data-testid="workout-completion-summary"]');
    await expect(summary).toBeVisible({ timeout: 5000 });

    // 6. Verify history and progress persistence offline
    await page.locator('nav button:has-text("Histórico")').first().click();
    await expect(page.locator('text=Histórico de Treinos')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Treino Rápido').first()).toBeVisible();
    await expect(page.locator('text=760 kg').first()).toBeVisible();

    // Check session detail dialog offline
    await page.locator('button:has-text("Ver Detalhes →")').first().click();
    await expect(page.locator('div[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Supino Reto com Barra').first()).toBeVisible();
    await page.locator('button:has-text("Fechar")').first().click();

    // Check progress view offline
    await page.locator('nav button:has-text("Progresso")').first().click();
    await expect(page.locator('text=Progresso e Recordes Pessoais')).toBeVisible();
    await expect(page.locator('text=Treinos Realizados')).toBeVisible();
    await expect(page.locator('[data-testid="global-total-workouts"]')).toHaveText('1');
    await expect(page.locator('[data-testid="global-total-volume"]')).toContainText('760 kg');

    // 7. Restore online connectivity
    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await expect(offlineIndicator).toHaveText('Local', { timeout: 5000 });
  });

  test('defers service worker update during active workout and prompts to update after workout (Task 10.2)', async ({
    page,
  }) => {
    // 1. Initial load
    await page.goto('/app');
    const startBtn = page.locator('button[data-testid="start-workout-button"]');
    await expect(startBtn).toBeVisible({ timeout: 10000 });

    // 2. Start an active workout
    await startBtn.click();
    const activeSession = page.locator('[data-testid="active-workout-session"]');
    await expect(activeSession).toBeVisible({ timeout: 5000 });

    // 3. Dispatch an update-available event while active workout is running
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('tita:sw-update-available', {
          detail: { hasActiveWorkout: true },
        }),
      );
    });

    // 4. Verify the update banner appears with deferral message for active workout
    const updateBanner = page.locator('[data-testid="pwa-update-banner"]');
    await expect(updateBanner).toBeVisible({ timeout: 5000 });
    await expect(updateBanner).toContainText('Nova versão disponível — Atualizar após o treino.');

    // 5. Verify the active workout session is intact and not reloaded
    await expect(activeSession).toBeVisible();

    // 6. Discard or finish workout session
    const discardBtn = page.locator('button[data-testid="discard-workout-button"]');
    await discardBtn.click();

    const confirmDiscardBtn = page.locator('button[data-testid="confirm-discard-workout"]');
    await confirmDiscardBtn.click();

    // 7. Once workout has ended, banner transitions to ready-to-update state
    await expect(updateBanner).toBeVisible();
    await expect(updateBanner).toContainText(
      'Uma nova versão do Projeto Titã foi baixada e está pronta para uso.',
    );

    const updateNowBtn = page.locator('[data-testid="pwa-update-now-button"]');
    await expect(updateNowBtn).toBeVisible();
    await expect(updateNowBtn).toHaveText('Atualizar agora');
  });
});

test('exercise GIFs load progressively and stay available offline', async ({
  page,
  context,
  browserName,
  offlineOrigin,
}) => {
  await page.goto(offlineOrigin.url + '/app');
  await page.getByTestId('start-workout-button').waitFor();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const initial = await page.evaluate(async () => {
    const requests = (
      await Promise.all((await caches.keys()).map(async (key) => (await caches.open(key)).keys()))
    ).flat();
    return requests.filter((r) => new URL(r.url).pathname.startsWith('/media/exercises/')).length;
  });
  expect(initial).toBe(0);
  await page.goto(offlineOrigin.url + '/app/library');
  await page.locator('[data-testid^="exercise-card-"]').first().click();
  const img = page.getByTestId('exercise-media-gif').locator('img');
  await expect(img).toHaveJSProperty('naturalWidth', 256);
  const src = await img.getAttribute('src');
  await page.waitForFunction(
    async (url) => Boolean(await (await caches.open('tita-exercise-media-v1')).match(url!)),
    src,
  );
  await offlineOrigin.stop();
  await expect(fetch(offlineOrigin.url + '/uncached-network-probe')).rejects.toThrow();
  if (browserName !== 'webkit') await context.setOffline(true);
  const reloaded = await page.reload();
  expect(reloaded?.fromServiceWorker()).toBe(true);
  await page.locator('[data-testid^="exercise-card-"]').first().click();
  await expect(page.getByTestId('exercise-media-gif').locator('img')).toHaveJSProperty(
    'naturalWidth',
    256,
  );
});
