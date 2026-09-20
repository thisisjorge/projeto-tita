import { test, expect } from '@playwright/test';

test.describe('Projeto Titã — Advanced Tracking & Progressive Disclosure E2E (REQ-10, REQ-11, Phase 10)', () => {
  test('progressive disclosure: advanced tracking enabled via settings and used in active workout', async ({
    page,
  }) => {
    // 1. Navigate to Settings view
    await page.goto('/app/settings');

    const settingsTitle = page.locator('h2', { hasText: 'Ajustes & Dados' });
    await expect(settingsTitle).toBeVisible({ timeout: 10000 });

    // 2. Locate master toggle for advanced tracking
    const masterToggle = page.locator('[data-testid="toggle-advanced-tracking-master"]');
    await expect(masterToggle).toBeVisible();

    // Default state: disabled (basic mode)
    await expect(masterToggle).not.toBeChecked();

    // 3. Enable advanced tracking and select recommended preset
    const presetBtn = page.locator('[data-testid="preset-recommended-btn"]');
    await expect(presetBtn).toBeVisible();
    await presetBtn.click();

    // Verify master toggle is now checked
    await expect(masterToggle).toBeChecked();

    // 4. Navigate back to Workout / Treinar view
    await page.goto('/app');

    const startBtn = page.locator('button[data-testid="start-workout-button"]');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    const activeSession = page.locator('[data-testid="active-workout-session"]');
    await expect(activeSession).toBeVisible({ timeout: 10000 });

    // 5. Verify SetType dropdown is now visible on Set 1
    const firstSetRow = page.locator('[data-testid="set-row-1"]').first();
    await expect(firstSetRow).toBeVisible();

    const setTypeSelect = firstSetRow.locator('select[data-testid="set-type-select-1"]');
    await expect(setTypeSelect).toBeVisible();

    // Change Set 1 to WARMUP
    await setTypeSelect.selectOption('WARMUP');

    // 6. Expand advanced details for Set 1
    const expanderBtn = firstSetRow.locator('button[aria-label^="Campos avançados"]');
    await expect(expanderBtn).toBeVisible();
    await expanderBtn.click();

    // Advanced fields container should now be open
    const advancedContainer = firstSetRow.locator('[data-testid="advanced-fields-container-1"]');
    await expect(advancedContainer).toBeVisible();

    // Fill RPE
    const rpeInput = advancedContainer.locator('input[placeholder="8.0"]');
    await expect(rpeInput).toBeVisible();
    await rpeInput.fill('7.5');
    await rpeInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    // Fill notes
    const notesInput = advancedContainer.locator('input[placeholder*="pausa no peito"]');
    await expect(notesInput).toBeVisible();
    await notesInput.fill('Aquecimento dinâmico com pausa');
    await notesInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    // Log weight and reps
    const weightInput = firstSetRow.locator('input[aria-label^="Carga"]');
    const repsInput = firstSetRow.locator('input[aria-label^="Repetições"]');
    const completeBtn = firstSetRow.locator('[data-testid="complete-set-btn-1"]');

    await weightInput.fill('60');
    await weightInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    await repsInput.fill('12');
    await repsInput.evaluate((el) => el.dispatchEvent(new Event('change', { bubbles: true })));

    await completeBtn.click();
    await expect(completeBtn).toHaveText('✓');

    // 7. Reload page and verify persistence of advanced fields
    await page.reload();
    await expect(page.locator('[data-testid="active-workout-session"]')).toBeVisible({
      timeout: 10000,
    });

    const reloadedFirstRow = page.locator('[data-testid="set-row-1"]').first();
    const reloadedTypeSelect = reloadedFirstRow.locator('select[data-testid="set-type-select-1"]');
    await expect(reloadedTypeSelect).toHaveValue('WARMUP');

    // Clean up workout for next test
    const discardBtn = page.locator('button[data-testid="discard-workout-button"]');
    await discardBtn.click();
    const confirmDiscard = page.locator('button[data-testid="confirm-discard-workout"]');
    await confirmDiscard.click();
  });

  test('grouped work: creates a superset container and allows un-grouping', async ({ page }) => {
    // Navigate to active workout
    await page.goto('/app');

    const startBtn = page.locator('button[data-testid="start-workout-button"]');
    await expect(startBtn).toBeVisible({ timeout: 10000 });
    await startBtn.click();

    const activeSession = page.locator('[data-testid="active-workout-session"]');
    await expect(activeSession).toBeVisible({ timeout: 10000 });

    // Secondary exercise actions share the contextual menu.
    await page.locator('.tita-exercise-options summary').first().click();
    const createSupersetBtn = page.locator('[data-testid="create-group-btn-slot-1"]');
    await expect(createSupersetBtn).toBeVisible({ timeout: 5000 });
    await createSupersetBtn.click();

    // Verify dialog opened
    const dialogTitle = page.locator('h2', { hasText: 'Criar Agrupamento' });
    await expect(dialogTitle).toBeVisible();

    // Select second slot (slot-2) to form a superset pair
    const slot2Checkbox = page.locator('[data-testid="checkbox-group-slot-slot-2"]');
    await expect(slot2Checkbox).toBeVisible();
    await slot2Checkbox.check();

    // Confirm group
    const confirmBtn = page.locator('[data-testid="confirm-create-group-btn"]');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify grouped container is rendered
    const groupContainer = page.locator('[data-testid^="exercise-group-container-"]');
    await expect(groupContainer).toBeVisible({ timeout: 5000 });

    const groupBadge = page.locator('[data-testid^="group-badge-"]');
    await expect(groupBadge).toHaveText('SUPERSET');

    // Now test ungrouping
    const ungroupBtn = page.locator('[data-testid^="ungroup-btn-"]');
    await expect(ungroupBtn).toBeVisible();
    await ungroupBtn.click();

    // Verify group container is removed
    await expect(groupContainer).not.toBeVisible();

    // Clean up
    const discardBtn = page.locator('button[data-testid="discard-workout-button"]');
    await discardBtn.click();
    const confirmDiscard = page.locator('button[data-testid="confirm-discard-workout"]');
    await confirmDiscard.click();
  });
});
