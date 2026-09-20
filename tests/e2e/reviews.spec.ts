import { test, expect } from '@playwright/test';

test.describe('Projeto Titã — Weekly & Monthly Reviews E2E (Phase 8, REQ-6, REQ-8)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app');
  });

  test('completes workout, views weekly review with muscle distribution, and views monthly review with plateau section', async ({
    page,
  }) => {
    // 1. Skip onboarding if present
    const skipBtn = page.locator('button:has-text("Pular por enquanto")');
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }

    // 2. Start a workout session
    const startBtn = page.locator('button[data-testid="start-workout-button"]');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    // 3. Log set: 100kg x 6 reps
    const firstSetRow = page.locator('[data-testid="set-row-1"]').first();
    await expect(firstSetRow).toBeVisible({ timeout: 5000 });

    const weightInput = firstSetRow.locator('input[aria-label^="Carga"]');
    const repsInput = firstSetRow.locator('input[aria-label^="Repetições"]');
    const completeBtn = firstSetRow.getByRole('checkbox');

    await weightInput.fill('100');
    await weightInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    await repsInput.fill('6');
    await repsInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    await completeBtn.click();
    await expect(completeBtn).toHaveText('✓');

    // 4. Finalize workout
    const finalizeBtn = page.locator('button[data-testid="finalize-workout-button"]');
    await expect(finalizeBtn).toBeVisible();
    await finalizeBtn.click();

    const confirmFinalizeBtn = page.locator('button[data-testid="confirm-finalize-button"]');
    await expect(confirmFinalizeBtn).toBeVisible();
    await confirmFinalizeBtn.click();

    // 5. Navigate to Progresso view
    await page.locator('nav button:has-text("Progresso")').first().click();
    await expect(page.locator('text=Progresso e Recordes Pessoais')).toBeVisible();

    // 6. Test Weekly Review Tab
    const weeklyTabBtn = page.locator('[data-testid="tab-progress-weekly"]');
    await expect(weeklyTabBtn).toBeVisible();
    await weeklyTabBtn.click();

    // Verify Weekly Review content
    await expect(page.locator('[data-testid="weekly-review-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="weekly-total-workouts"]')).toHaveText('1');
    await expect(page.locator('[data-testid="weekly-total-volume"]')).toHaveText('600 kg');
    await expect(page.locator('text=Distribuição Muscular na Semana')).toBeVisible();
    await expect(page.locator('text=Peito')).toBeVisible();

    // 7. Test Monthly Review Tab
    const monthlyTabBtn = page.locator('[data-testid="tab-progress-monthly"]');
    await expect(monthlyTabBtn).toBeVisible();
    await monthlyTabBtn.click();

    // Verify Monthly Review content
    await expect(page.locator('[data-testid="monthly-review-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-total-sessions"]')).toHaveText('1');
    await expect(page.locator('[data-testid="monthly-total-volume"]')).toHaveText('600 kg');
    await expect(page.locator('text=Índice de Consistência Mensal')).toBeVisible();
    await expect(page.locator('[data-testid="monthly-consistency-score"]')).toBeVisible();

    // Verify Plateau & Anomaly section with disclaimer
    await expect(page.locator('text=Possíveis Platôs & Alertas de Treino')).toBeVisible();
    await expect(page.locator('text=Progressão Saudável')).toBeVisible();
    await expect(page.locator('text=sem finalidade médica ou diagnóstica')).toBeVisible();

    // 8. Return to Evolution Tab and ensure clean state
    const evolutionTabBtn = page.locator('[data-testid="tab-progress-evolution"]');
    await evolutionTabBtn.click();
    await expect(page.locator('[data-testid="global-total-workouts"]')).toHaveText('1');
  });
});
