import { test, expect, type Page } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

test.use({ serviceWorkers: 'block' });
const fixtureKey = 'e2e-only-not-a-real-provider-key';
async function capture(page: Page, name: string) {
  if (!process.env.RC_CAPTURE_DIR) return;
  await fs.mkdir(process.env.RC_CAPTURE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(process.env.RC_CAPTURE_DIR, `${name}.png`) });
}
async function nav(page: Page, route: string) {
  const label = route === '/settings' ? 'Ajustes' : 'Rotinas';
  await page.getByRole('button', { name: label, exact: true }).click();
}
async function configure(page: Page, preset = 'nvidia') {
  await page.getByLabel('Ativar Titã Intelligence').check();
  await page.getByLabel('Provider de IA').selectOption(preset);
  await page.getByLabel('API Key', { exact: true }).fill(fixtureKey);
  await page
    .getByLabel('Modelo', { exact: true })
    .fill(preset === 'gemini' ? 'gemini-test-model' : 'meta/llama-3.2-1b-instruct');
  await page.getByRole('button', { name: 'Usar nesta aba', exact: true }).click();
  await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Usar o mesmo provider/modelo principal')).toBeChecked();
}
async function openSubstitution(page: Page) {
  await page.locator('.tita-exercise-options summary').first().click();
  await page.getByRole('button', { name: 'Trocar exercício', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Trocar exercício' })).toBeVisible();
}
async function storedData(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open('tita-db');
      r.onsuccess = () => resolve(r.result);
      r.onerror = reject;
    });
    const result: Record<string, unknown> = {};
    for (const name of Array.from(db.objectStoreNames)) {
      result[name] = await new Promise((resolve, reject) => {
        const r = db.transaction(name).objectStore(name).getAll();
        r.onsuccess = () => resolve(r.result);
        r.onerror = reject;
      });
    }
    db.close();
    return result;
  });
}

for (const theme of ['dark', 'light']) {
  test(`RC ${theme}: local swap, consented NVIDIA refinement, fallback and immutable history`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript((value) => localStorage.setItem('tita-theme', value), theme);
    const calls: unknown[] = [];
    let fail = false;
    const logs: string[] = [];
    page.on('console', (message) => logs.push(message.text()));
    await page.route('https://integrate.api.nvidia.com/v1/chat/completions', async (route) => {
      const body = route.request().postDataJSON();
      calls.push(body);
      expect(route.request().headers().authorization).toBe(`Bearer ${fixtureKey}`);
      const payload = JSON.parse(body.messages[1].content);
      expect(payload.kind).toBe('substitution');
      expect(JSON.stringify(payload)).not.toMatch(
        /completedAt|notes|sourceWorkoutId|schemaVersion/,
      );
      if (fail) return route.fulfill({ status: 429, body: 'Limit exceeded' });
      const result = {
        rankedCandidates: payload.data.candidates.map((c: { exerciseId: string }, i: number) => ({
          exerciseId: c.exerciseId,
          score: i * 10,
          reason: 'Alternativa com equipamento diferente; confira a técnica.',
        })),
      };
      return route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ choices: [{ message: { content: JSON.stringify(result) } }] }),
      });
    });
    await page.goto('/app/onboarding');
    await page.getByTestId('onboarding-load-sample-btn').click();
    await nav(page, '/settings');
    await configure(page);
    await page.getByTestId('intelligence-settings').scrollIntoViewIfNeeded();
    await capture(page, `intelligence-nvidia-same-provider-${theme}-390x844`);
    await page.getByLabel('Usar o mesmo provider/modelo principal').scrollIntoViewIfNeeded();
    await capture(page, `intelligence-routing-default-${theme}-390x844`);
    await nav(page, '/routines');
    await page.locator('[data-testid^="start-routine-btn-"]').first().click();
    const first = page.getByTestId('set-row-1').first();
    await first.locator('input[aria-label^="Carga"]').fill('60');
    await first.locator('input[aria-label^="Repetições"]').fill('8');
    await first.getByRole('checkbox').click();
    await expect(first.getByRole('checkbox')).toBeChecked();
    const before = (await storedData(page)).activeWorkouts as {
      exercises: { exerciseId: string; sets: { completed: boolean }[] }[];
    }[];
    const original = before.find((w) => w.exercises.some((e) => e.sets.some((s) => s.completed)))!
      .exercises[0]!;
    await openSubstitution(page);
    const choices = page.locator('.tita-substitution__candidate');
    expect(await choices.count()).toBeGreaterThan(0);
    expect(calls).toHaveLength(0);
    const localOrder = await choices.locator('strong').allTextContents();
    await capture(page, `substitution-local-${theme}-390x844`);
    for (const width of [360, 390, 430]) {
      await page.setViewportSize({ width, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
      expect((await choices.first().boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(axe.violations).toEqual([]);
    await page.getByRole('button', { name: 'Refinar com Fast Judge', exact: true }).click();
    expect(calls).toHaveLength(0);
    await page.getByText('Ver JSON que será enviado', { exact: true }).click();
    await expect(page.locator('.tita-intelligence__preview')).toContainText('candidate-1');
    await page.getByRole('button', { name: 'Enviar candidatos e refinar' }).click();
    await expect(page.getByText('Ordem refinada · Fast Judge', { exact: true })).toBeVisible();
    expect(await choices.locator('strong').allTextContents()).toEqual([...localOrder].reverse());
    await page.locator('.tita-dialog').evaluate((el) => {
      el.scrollTop = 0;
    });
    await capture(page, `substitution-fast-judge-${theme}-390x844`);
    fail = true;
    await page.getByRole('button', { name: 'Enviar candidatos e refinar' }).click();
    await expect(
      page.getByText('Refinamento indisponível. Sugestões locais mantidas.'),
    ).toBeVisible();
    expect(await choices.locator('strong').allTextContents()).toEqual(localOrder);
    await choices.first().click();
    await capture(page, `substitution-confirm-${theme}-390x844`);
    await page.getByRole('button', { name: 'Confirmar troca', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Trocar exercício' })).toBeHidden();
    const saved = await storedData(page);
    expect(JSON.stringify(saved)).not.toContain(fixtureKey);
    const workouts = saved.activeWorkouts as {
      substitutions: unknown[];
      exercises: { exerciseId: string; sets: unknown[] }[];
    }[];
    expect(workouts[0]!.substitutions).toHaveLength(1);
    expect(workouts[0]!.exercises[0]!.sets).toEqual(original.sets.filter((s) => s.completed));
    expect(workouts[0]!.exercises[1]!.sets[0]).not.toHaveProperty('weight', 60);
    await capture(page, `substitution-saved-${theme}-390x844`);
    await page.getByTestId('mobile-hud-finalize-btn').click();
    await page.getByTestId('confirm-finalize-button').click();
    const final = await storedData(page);
    const snapshots = final.workoutSnapshots as {
      substitutions: unknown[];
      totalVolumeKg: number;
    }[];
    expect(snapshots[0]!.substitutions).toHaveLength(1);
    expect(snapshots[0]!.totalVolumeKg).toBe(480);
    await nav(page, '/settings');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar Backup JSON' }).click();
    const download = await downloadPromise;
    const content = await fs.readFile((await download.path())!, 'utf8');
    expect(content).not.toContain(fixtureKey);
    expect(content).toContain('substitutions');
    expect(logs.join('\n')).not.toContain(fixtureKey);
    expect(
      await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
    ).not.toContain(fixtureKey);
    await page.reload();
    await expect(page.getByLabel('Ativar Titã Intelligence')).not.toBeChecked();
  });
}

test('RC: AI-off quick workout can swap offline, including legacy exercise IDs', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app');
  await page.getByTestId('start-workout-button').click();
  await expect(page.locator('.tita-exercise-options summary').first()).toBeVisible();
  await context.setOffline(true);
  await openSubstitution(page);
  await expect(page.getByRole('button', { name: 'Refinar com Fast Judge' })).toHaveCount(0);
  await page.locator('.tita-substitution__candidate').first().click();
  await page.getByRole('button', { name: 'Confirmar troca' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(JSON.stringify(await storedData(page))).toContain('fromExerciseId');
});

test('RC: Gemini analysis requires consent; desktop settings and separate routing remain optional', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const calls: unknown[] = [];
  await page.route('https://generativelanguage.googleapis.com/**', async (route) => {
    calls.push(route.request().postDataJSON());
    const content = route.request().postDataJSON().contents[0].parts[0].text;
    const value = content.includes('"ok":true')
      ? { ok: true }
      : {
          summary: 'Rotina com distribuição de séries registrada localmente.',
          positives: ['Dados suficientes para revisar a distribuição.'],
          concerns: [],
          suggestions: ['Revise a disponibilidade de equipamento.'],
          confidence: 'medium',
        };
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
      }),
    });
  });
  await page.goto('/app/onboarding');
  await page.getByTestId('onboarding-load-sample-btn').click();
  await nav(page, '/settings');
  await configure(page, 'gemini');
  await page.getByRole('button', { name: 'Testar conexão', exact: true }).click();
  await expect(page.getByText('● Conectado', { exact: true })).toBeVisible();
  await page.getByTestId('intelligence-settings').scrollIntoViewIfNeeded();
  await capture(page, 'intelligence-gemini-desktop');
  await page.getByLabel('Usar o mesmo provider/modelo principal').uncheck();
  await page.getByLabel('API Key do Fast Judge').fill('second-e2e-fixture-key');
  await page.getByLabel('Modelo do Fast Judge', { exact: true }).fill('meta/llama-3.2-1b-instruct');
  await page.getByRole('button', { name: 'Usar configuração separada' }).click();
  await capture(page, 'intelligence-separate-routing-desktop');
  const audit = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.getByLabel('Usar o mesmo provider/modelo principal').check();
  await nav(page, '/routines');
  await page.getByRole('button', { name: 'Analisar rotina', exact: true }).first().click();
  expect(calls).toHaveLength(1);
  await page.getByRole('button', { name: 'Enviar resumo e analisar' }).click();
  await expect(page.getByTestId('intelligence-result')).toBeVisible();
  expect(calls).toHaveLength(2);
  await capture(page, 'intelligence-routine-result-desktop');
});
