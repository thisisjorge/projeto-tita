import { test, expect } from '@playwright/test';

test.describe('Projeto Titã — React Active Workout E2E (REQ-4, Phase 4)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to React application shell
    await page.goto('/app');
  });

  test('executes durable active workout lifecycle: start, log set, timer, reload recovery, finalize', async ({
    page,
  }) => {
    // 1. Initial State: Ready to train card should be visible
    const startBtn = page.locator('button[data-testid="start-workout-button"]');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await expect(startBtn).toHaveText('Iniciar Treino Rápido');

    // 2. Start workout
    await startBtn.click();

    // 3. Active Workout session view should load
    const activeSession = page.locator('[data-testid="active-workout-session"]');
    await expect(activeSession).toBeVisible({ timeout: 5000 });

    const saveIndicator = page.locator('[data-testid="save-status-indicator"]');
    await expect(saveIndicator).toBeVisible();

    // 4. Log first set of Supino Reto: load 90kg, reps 8
    const firstSetRow = page.locator('[data-testid="set-row-1"]').first();
    await expect(firstSetRow).toBeVisible();

    const weightInput = firstSetRow.locator('input[aria-label^="Carga"]');
    const repsInput = firstSetRow.locator('input[aria-label^="Repetições"]');
    const completeBtn = firstSetRow.getByRole('checkbox');

    await weightInput.fill('90');
    await weightInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    await repsInput.fill('8');
    await repsInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    // Complete the set
    await completeBtn.click();

    // Verify set is marked completed with checkmark
    await expect(completeBtn).toHaveText('✓');

    // Verify Rest Timer bar is displayed
    const timerDisplay = page.locator('[data-testid="rest-timer-display"]');
    await expect(timerDisplay).toBeVisible({ timeout: 5000 });

    // 5. Simulate page reload (survives reload / interruption)
    await page.reload();

    // 6. Verify active workout was restored from IndexedDB
    await expect(page.locator('[data-testid="active-workout-session"]')).toBeVisible({
      timeout: 10000,
    });

    const reloadedSetRow = page.locator('[data-testid="set-row-1"]').first();
    await expect(reloadedSetRow).toBeVisible();

    const reloadedWeight = reloadedSetRow.locator('input[aria-label^="Carga"]');
    const reloadedReps = reloadedSetRow.locator('input[aria-label^="Repetições"]');
    const reloadedCompleteBtn = reloadedSetRow.locator('button[aria-label^="Desmarcar série 1"]');

    await expect(reloadedWeight).toHaveValue('90');
    await expect(reloadedReps).toHaveValue('8');
    await expect(reloadedCompleteBtn).toHaveText('✓');

    // 7. Finalize workout
    const finalizeBtn = page.locator('button[data-testid="finalize-workout-button"]');
    await expect(finalizeBtn).toBeVisible();
    await finalizeBtn.click();

    // Confirm dialog
    const confirmFinalizeBtn = page.locator('button[data-testid="confirm-finalize-button"]');
    await expect(confirmFinalizeBtn).toBeVisible();
    await confirmFinalizeBtn.click();

    // 8. Verify celebration / summary card
    const summaryCard = page.locator('[data-testid="workout-completion-summary"]');
    await expect(summaryCard).toBeVisible({ timeout: 5000 });
    await expect(summaryCard).toContainText('Treino Concluído com Sucesso!');
    await expect(summaryCard).toContainText('720 kg'); // 90kg * 8 reps
  });
});
