import { test, expect } from '@playwright/test';

test.describe('Projeto Titã — React History & Progress E2E (REQ-6, REQ-8, Phase 7)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to React application shell
    await page.goto('/app');
  });

  test('executes complete workflow: finalize workout, inspect history, view session details, and analyze progress', async ({
    page,
  }) => {
    // 1. Skip onboarding if present
    const skipBtn = page.locator('button:has-text("Pular por enquanto")');
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipBtn.click();
    }

    // 2. Start a workout session from WorkoutView
    const startBtn = page.locator('button[data-testid="start-workout-button"]');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    // Active session loads
    const activeSession = page.locator('[data-testid="active-workout-session"]');
    await expect(activeSession).toBeVisible({ timeout: 5000 });

    // 3. Log first set: load 90kg, reps 8
    const firstSetRow = page.locator('[data-testid="set-row-1"]').first();
    await expect(firstSetRow).toBeVisible();

    const weightInput = firstSetRow.locator('input[aria-label^="Carga"]');
    const repsInput = firstSetRow.locator('input[aria-label^="Repetições"]');
    const completeBtn = firstSetRow.getByRole('checkbox');

    await weightInput.fill('90');
    await weightInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    await repsInput.fill('8');
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

    // Verify completion summary
    const summaryCard = page.locator('[data-testid="workout-completion-summary"]');
    await expect(summaryCard).toBeVisible({ timeout: 5000 });
    await expect(summaryCard).toContainText('Treino Concluído com Sucesso!');

    // 5. Navigate to Histórico view
    await page.locator('nav button:has-text("Histórico")').first().click();

    // Verify monthly header and session card
    await expect(page.locator('text=Histórico de Treinos')).toBeVisible();
    await expect(page.locator('text=720 kg').first()).toBeVisible(); // 90kg * 8 reps

    // 6. Test Search filter in History
    const searchInput = page.locator('[data-testid="search-history-input"]');
    await searchInput.fill('Supino');
    await expect(page.locator('text=720 kg').first()).toBeVisible();

    await searchInput.fill('Inexistente12345');
    await expect(page.locator('text=Nenhum treino no histórico')).toBeVisible();
    await page.locator('button:has-text("Limpar Filtros")').click();
    await expect(page.locator('text=720 kg').first()).toBeVisible();

    // 7. Open Session Detail Dialog
    const sessionCard = page.locator('button:has-text("Ver Detalhes →")').first();
    await sessionCard.click();
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('text=Duração Ativa')).toBeVisible();
    await expect(dialog.locator('text=720 kg').first()).toBeVisible();
    await expect(dialog.locator('text=Supino Reto com Barra').first()).toBeVisible();

    // Close detail dialog
    await dialog.locator('button:has-text("Fechar")').first().click();
    await expect(dialog).not.toBeVisible();

    // 8. Navigate to Progresso view
    await page.locator('nav button:has-text("Progresso")').first().click();
    await expect(page.locator('text=Progresso e Recordes Pessoais')).toBeVisible();

    // Verify Global KPI cards
    await expect(page.locator('[data-testid="global-total-workouts"]')).toHaveText('1');
    await expect(page.locator('[data-testid="global-total-volume"]')).toHaveText('720 kg');
    await expect(page.locator('[data-testid="global-total-prs"]')).toBeVisible();

    // Verify Exercise Progression section
    const exerciseSelect = page.locator('[data-testid="exercise-progress-select"]');
    await expect(exerciseSelect).toBeVisible();
    await exerciseSelect.selectOption({ label: 'Supino Reto com Barra' });
    await expect(
      page.getByRole('img', { name: 'Gráfico de evolução de Supino Reto com Barra' }),
    ).toBeVisible();

    // Verify SVG chart is rendered
    const chartSvg = page.locator('svg[role="img"]');
    await expect(chartSvg).toBeVisible();

    // Toggle Metric Tabs
    await page.locator('[data-testid="metric-tab-e1rm"]').click();
    await expect(page.locator('text=estimado via Epley')).toBeVisible();

    await page.locator('[data-testid="metric-tab-volume"]').click();
    await expect(page.locator('text=(8 reps máx)')).toBeVisible();

    await page.locator('[data-testid="metric-tab-reps"]').click();
    await expect(page.locator('text=(com 90 kg)')).toBeVisible();

    // Verify Personal Records cards
    await expect(page.locator('text=Maior Carga Levantada')).toBeVisible();
    await expect(page.locator('text=90 kg').first()).toBeVisible();
    await expect(page.locator('text=Melhor e1RM Estimado (Epley)')).toBeVisible();

    // Verify Time Range buttons work
    await page.locator('[data-testid="time-range-1M"]').click();
    await expect(page.locator('[data-testid="global-total-workouts"]')).toHaveText('1');
  });
});
