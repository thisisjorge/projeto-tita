import { test, expect } from '@playwright/test';

test.describe('Projeto Titã — React Exercise Library E2E (REQ-3, Phase 5)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/app/library');
  });

  test('executes complete exercise library flow: search, filter, detail, favorite, and custom exercise creation', async ({
    page,
  }) => {
    // 1. Verify Library header and seed exercises loaded
    const heading = page.locator('h2');
    await expect(heading).toHaveText('Biblioteca de Exercícios', { timeout: 10000 });

    const grid = page.locator('[data-testid="exercise-cards-grid"]');
    await expect(grid).toBeVisible();

    // 2. Search by name: "Supino"
    const searchInput = page.locator('input[placeholder*="Buscar por nome"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Supino');

    // Verify filtered cards
    const benchPressCard = page.locator('text=Supino Reto com Barra').first();
    await expect(benchPressCard).toBeVisible();

    // Clear search
    await searchInput.fill('');

    // 3. Filter by muscle pill: "Costas"
    const costasPill = page.locator('button:has-text("Costas")').first();
    await costasPill.click();

    const latPulldownCard = page.locator('text=Puxada Frontal na Polia').first();
    await expect(latPulldownCard).toBeVisible();

    // 4. Open Exercise Detail Modal
    await latPulldownCard.click();

    // Dialog should open
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    const dialogTitle = dialog.locator('h2');
    await expect(dialogTitle).toHaveText('Puxada Frontal na Polia', { timeout: 10000 });

    // Verify technical instructions are visible
    const instructionsSection = page.locator('text=Instruções de Execução:');
    await expect(instructionsSection).toBeVisible();

    // Toggle favorite inside dialog
    const favBtn = page.locator('[data-testid="detail-favorite-btn"]');
    await favBtn.click();
    await expect(favBtn).toHaveText('★ Favorito');

    // Close detail dialog
    const closeBtn = page.locator('div[role="dialog"] button:has-text("Fechar")');
    await closeBtn.click();
    await expect(page.locator('div[role="dialog"]')).not.toBeVisible();

    // 5. Create a custom exercise
    const createBtn = page.locator('[data-testid="create-custom-exercise-btn"]');
    await createBtn.click();

    const createDialog = page.locator('div[role="dialog"]');
    await expect(createDialog).toBeVisible();

    const nameInput = createDialog.locator('input[placeholder*="Supino Spoto"]');
    await nameInput.fill('Desenvolvimento Arnold Custom');

    const muscleSelect = createDialog.locator('select#muscle-select');
    await muscleSelect.selectOption('Ombros');

    const submitCreateBtn = createDialog.locator('button:has-text("Criar Exercício")');
    await submitCreateBtn.click();

    await expect(createDialog).not.toBeVisible();

    // 6. Reset muscle filter and filter by "Personalizados" source
    const todosMuscleBtn = page.locator('button:has-text("Todos")').first();
    await todosMuscleBtn.click();

    const customSourceBtn = page.locator('button:has-text("Personalizados")');
    await customSourceBtn.click();

    const customCard = page.locator('text=Desenvolvimento Arnold Custom').first();
    await expect(customCard).toBeVisible({ timeout: 5000 });
  });
});
