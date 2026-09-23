import { test, expect } from '@playwright/test';

test.describe('Projeto Titã — React Routine Management & Discovery E2E (REQ-5, REQ-11, Phase 6)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/routines');
  });

  test('executes complete routine builder lifecycle, duplicate, archive, restore, and template discovery', async ({
    page,
  }) => {
    // 1. Verify Routines View header
    const heading = page.locator('h2');
    await expect(heading).toHaveText('Minhas Rotinas', { timeout: 10000 });

    // 2. Open Routine Editor to create a new custom routine
    const createBtn = page.locator('[data-testid="create-routine-btn"]');
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    // Dialog should open
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible();

    const nameInput = dialog.locator('input[placeholder*="Superior A"]');
    await nameInput.fill('Treino A — Peito & Tríceps');

    // Add exercise to routine
    const addExBtn = dialog.locator('[data-testid="add-exercise-to-routine-btn"]');
    await addExBtn.click();

    // Exercise picker dialog opens
    const pickerExercise = page.locator('text=Supino Reto com Barra').first();
    await expect(pickerExercise).toBeVisible();
    await pickerExercise.click();

    // Save routine
    await expect(nameInput).toHaveValue('Treino A — Peito & Tríceps');
    const saveBtn = dialog.locator('[data-testid="save-routine-btn"]');
    await saveBtn.click();
    await expect(dialog).not.toBeVisible();

    // 3. Verify created routine card in active grid
    const routineCard = page.locator('text=Treino A — Peito & Tríceps').first();
    await expect(routineCard).toBeVisible({ timeout: 5000 });

    // 4. Duplicate the routine
    const dupBtn = page.locator('button[data-testid^="duplicate-routine-btn-"]').first();
    await dupBtn.click();

    const duplicatedCard = page.locator('text=Treino A — Peito & Tríceps (Cópia)').first();
    await expect(duplicatedCard).toBeVisible({ timeout: 5000 });

    // 5. Archive the duplicate routine
    const archiveBtn = page
      .locator('[data-testid^="routine-card-"]:has-text("(Cópia)")')
      .locator('button[data-testid^="archive-routine-btn-"]');
    await archiveBtn.click();

    // Verify copy is removed from active tab
    await expect(page.locator('text=Treino A — Peito & Tríceps (Cópia)')).not.toBeVisible();

    // 6. Navigate to Archived tab and restore
    const archivedTab = page.locator('[data-testid="tab-archived-routines"]');
    await archivedTab.click();

    const archivedCopy = page.locator('text=Treino A — Peito & Tríceps (Cópia)').first();
    await expect(archivedCopy).toBeVisible({ timeout: 5000 });

    const restoreBtn = page.locator('button[data-testid^="restore-routine-btn-"]').first();
    await restoreBtn.click();

    // 7. Return to active tab and verify restored
    const activeTab = page.locator('[data-testid="tab-active-routines"]');
    await activeTab.click();
    await expect(page.locator('text=Treino A — Peito & Tríceps (Cópia)')).toBeVisible({
      timeout: 5000,
    });

    // 8. Open Program Template Browser
    const openTemplatesBtn = page.locator('[data-testid="open-templates-btn"]');
    await openTemplatesBtn.click();

    await expect(page.locator('text=Modelos de Treino Oficiais')).toBeVisible();
    await expect(page.locator('text=Corpo inteiro 3x por semana')).toBeVisible();

    // Close template browser
    await page.locator('div[role="dialog"] button:has-text("Fechar")').click();
    await expect(page.locator('text=Modelos de Treino Oficiais')).not.toBeVisible();

    // 9. Open and execute Discovery Wizard
    const openDiscoveryBtn = page.locator('[data-testid="open-discovery-btn"]');
    await openDiscoveryBtn.click();

    await expect(page.locator('text=Assistente de Descoberta (1/6)')).toBeVisible();

    // Step 1: 3 days
    await page.locator('button:has-text("3 dias")').click();
    await page.locator('button:has-text("Próximo →")').click();

    // Step 2: 60 min
    await page.locator('button:has-text("~60 min")').click();
    await page.locator('button:has-text("Próximo →")').click();

    // Step 3: Beginner
    await page.locator('button:has-text("Iniciante")').click();
    await page.locator('button:has-text("Próximo →")').click();

    // Step 4: Hypertrophy
    await page.locator('button:has-text("Hipertrofia Muscular")').click();
    await page.locator('button:has-text("Próximo →")').click();

    // Step 5: Full gym
    await page.locator('button:has-text("Academia Completa")').click();
    await page.locator('button:has-text("Próximo →")').click();

    // Step 6: divisão de corpo inteiro
    await page.locator('button:has-text("Corpo inteiro")').click();

    // Submit discovery
    await page.locator('[data-testid="submit-discovery-btn"]').click();

    // Step 7: Verify ranked recommendation & compatibility score
    await expect(page.locator('text=Seu Plano de Treino Ideal')).toBeVisible();
    await expect(page.locator('text=Melhor Escolha')).toBeVisible();
    await expect(page.locator('text=100% Compatível').first()).toBeVisible();

    // Close discovery dialog
    await page.locator('div[role="dialog"] button:has-text("Fechar")').click();
    await expect(page.locator('text=Seu Plano de Treino Ideal')).not.toBeVisible();
  });
});
