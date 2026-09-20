import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({ serviceWorkers: 'block' });
for (const theme of ['dark', 'light']) {
  test(`Ajude-me ${theme}: local first, preview, main provider, failure, offline and focus`, async ({
    page,
    context,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript((t) => localStorage.setItem('tita-theme', t), theme);
    const calls: Record<string, unknown>[] = [];
    let fail = false;
    await page.route('https://integrate.api.nvidia.com/v1/chat/completions', async (route) => {
      const body = route.request().postDataJSON();
      const payload = JSON.parse(body.messages[1].content);
      calls.push(payload);
      expect(payload.kind).toBe('help');
      expect(body.model).toBe('main-help-model');
      expect(JSON.stringify(payload)).not.toMatch(/notes|sourceWorkoutId|help-fixture|completedAt/);
      if (fail) return route.fulfill({ status: 429, body: 'private-provider-message' });
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary:
                    'Esta rotina distribui o trabalho entre os exercícios listados. A estratégia usa seus registros para sugerir a próxima meta; confira a evidência antes de aplicar. Não há dados suficientes aqui para avaliar sua recuperação.',
                  positives: [],
                  concerns: [],
                  suggestions: [],
                  confidence: 'low',
                }),
              },
            },
          ],
        }),
      });
    });
    const capture = async (name: string) => {
      if (!process.env.RC_HELP_CAPTURE_DIR) return;
      await fs.mkdir(process.env.RC_HELP_CAPTURE_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(process.env.RC_HELP_CAPTURE_DIR, `${name}-${theme}.png`),
      });
    };
    await page.goto('/app/onboarding');
    await page.getByTestId('onboarding-load-sample-btn').click();
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('button', { name: '? Ajude-me', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Ajude-me', exact: true });
    await dialog.getByRole('button', { name: 'Minha chave fica salva?', exact: true }).click();
    await expect(page.getByTestId('help-answer')).toContainText('memória desta aba');
    expect(calls).toHaveLength(0);
    await capture('help-local-settings');
    await dialog.getByRole('button', { name: 'Fazer outra pergunta', exact: true }).click();
    await dialog
      .getByLabel('Fazer outra pergunta', { exact: true })
      .fill('Qual modelo combina com esta análise?');
    await dialog.getByRole('button', { name: 'Consultar ajuda' }).click();
    await expect(dialog).toContainText('Configure Titã Intelligence');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: '? Ajude-me', exact: true })).toBeFocused();
    await page.getByLabel('Ativar Titã Intelligence').check();
    await page.getByLabel('Provider de IA').selectOption('nvidia');
    await page.getByLabel('API Key', { exact: true }).fill('help-fixture-not-a-real-key');
    await page.getByLabel('Modelo', { exact: true }).fill('main-help-model');
    await page.getByRole('button', { name: 'Usar nesta aba', exact: true }).click();
    await page.getByRole('button', { name: 'Rotinas', exact: true }).click();
    await page.getByRole('button', { name: '? Ajude-me', exact: true }).first().click();
    await dialog.getByRole('button', { name: 'Como funciona Double Progression?' }).click();
    expect(calls).toHaveLength(0);
    await capture('help-local-routine');
    await dialog.getByRole('button', { name: 'Fazer outra pergunta', exact: true }).click();
    await dialog.getByRole('button', { name: 'Como funciona a estratégia escolhida?' }).click();
    await dialog.getByText('Ver dados que serão enviados', { exact: true }).click();
    await expect(page.getByTestId('help-payload')).toContainText('routine');
    await expect(page.getByTestId('help-payload')).not.toContainText('notes');
    expect(calls).toHaveLength(0);
    await capture('help-context-preview');
    await dialog.getByRole('button', { name: 'Enviar pergunta e contexto' }).click();
    await expect(page.getByTestId('help-answer')).toContainText('Esta rotina distribui');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.data).toMatchObject({ screen: 'routine' });
    await capture('help-context-result');
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
    for (const width of [360, 390, 430, 1440]) {
      await page.setViewportSize({ width, height: width > 430 ? 900 : 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      expect(
        (await dialog
          .getByRole('button', { name: 'Fazer outra pergunta', exact: true })
          .boundingBox())!.height,
      ).toBeGreaterThanOrEqual(44);
    }
    await capture('help-context-desktop');
    fail = true;
    await dialog.getByRole('button', { name: 'Fazer outra pergunta', exact: true }).click();
    await dialog.getByRole('button', { name: 'Como funciona a estratégia escolhida?' }).click();
    await dialog.getByRole('button', { name: 'Enviar pergunta e contexto' }).click();
    await expect(dialog).toContainText('As respostas locais continuam disponíveis');
    await expect(dialog).not.toContainText('private-provider-message');
    await dialog.getByRole('button', { name: 'Fazer outra pergunta', exact: true }).click();
    await context.setOffline(true);
    await dialog.getByRole('button', { name: 'Como funciona a estratégia escolhida?' }).click();
    await expect(dialog).toContainText('Você está offline');
    await dialog.getByRole('button', { name: 'O que é progressão?' }).click();
    await expect(page.getByTestId('help-answer')).toContainText('motor local');
    expect(calls).toHaveLength(2);
  });
}

test('Ajude-me workout and exercise catalog use only the selected context', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/onboarding');
  await page.getByTestId('onboarding-load-sample-btn').click();
  await page.getByRole('button', { name: 'Rotinas', exact: true }).click();
  await page.locator('[data-testid^="start-routine-btn-"]').first().click();
  await page.locator('.tita-exercise-options summary').first().click();
  await page.getByRole('button', { name: '? Ajude-me', exact: true }).first().click();
  const help = page.getByRole('dialog', { name: 'Ajude-me', exact: true });
  await help.getByRole('button', { name: 'O que é RIR?' }).click();
  await expect(page.getByTestId('help-answer')).toContainText('repetições');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');
  await page.goto('/app/library');
  await page.locator('[data-testid^="exercise-card-"]').first().click();
  await page.getByRole('button', { name: '? Ajude-me', exact: true }).click();
  await page.getByRole('button', { name: 'O que este exercício trabalha?' }).click();
  await expect(page.getByTestId('help-answer')).toContainText('Segundo o catálogo');
  await page.getByRole('button', { name: 'Fazer outra pergunta', exact: true }).click();
  await page.getByRole('button', { name: 'O que significam estas instruções?' }).click();
  await expect(page.getByTestId('help-answer')).not.toContainText('modelo principal');
  await page.getByRole('button', { name: 'Fechar ajuda' }).click();
  await expect(page.getByTestId('help-content')).not.toBeVisible();
});
