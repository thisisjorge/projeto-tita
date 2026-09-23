import { chromium, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { generateVisualQaDataset } from './seed-visual-qa-dataset.mjs';

const base = process.env.TITA_SHOWCASE_URL || 'https://tita.jorgetavares.dev';
const output = path.resolve('public/showcase/v1');
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const manifest = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    if (!localStorage.getItem('tita-theme')) localStorage.setItem('tita-theme', 'dark');
  });
  const page = await context.newPage();
  const release = await (await context.request.get(base + '/release.json')).json();
  const nav = async (route) => {
    await page.goto(base + '/app' + route);
    await expect(page.locator('main')).toBeVisible();
  };
  const shot = async (file, description) => {
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(output, file), animations: 'disabled' });
    manifest.push({
      file,
      description,
      source: base,
      releaseSha: release.commit,
      syntheticProfile: true,
      width: page.viewportSize().width,
    });
    console.log(file);
  };
  await nav('');
  await expect(page.getByTestId('start-workout-button')).toBeEnabled();
  const dataset = generateVisualQaDataset();
  await page.evaluate(async (data) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('tita-db');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['routines', 'workoutSnapshots'], 'readwrite');
      for (const routine of data.routines) tx.objectStore('routines').put(routine);
      for (const snapshot of data.snapshots) tx.objectStore('workoutSnapshots').put(snapshot);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, dataset);
  await nav('/routines');
  await page.getByText('Upper A — Força & Peitoral').first().waitFor();
  await shot('01-rotinas-dark.png', 'Rotinas preenchidas no tema escuro');
  await nav('/progress');
  await page.locator('svg[aria-label^="Gráfico de evolução"]').waitFor();
  await shot('02-progresso-dark.png', 'Gráficos e indicadores de progresso');
  await page.setViewportSize({ width: 390, height: 844 });
  await nav('/library');
  await page.locator('[data-testid^="exercise-card-"]').first().click();
  await page.getByRole('button', { name: 'Reproduzir animação' }).click();
  const gif = page.getByTestId('exercise-media-gif').locator('img');
  await expect(gif).toHaveJSProperty('naturalWidth', 256);
  await shot('03-exercicio-animado-dark.png', 'Detalhe real de exercício com GIF licenciado');
  await page.keyboard.press('Escape');
  await nav('');
  await page.getByTestId('start-workout-button').click();
  const firstRow = page.getByTestId('set-row-1').first();
  await firstRow.getByLabel('Carga série 1', { exact: true }).fill('82.5');
  await firstRow.getByLabel('Repetições série 1', { exact: true }).fill('8');
  await firstRow.getByRole('checkbox').click();
  await expect(page.getByTestId('save-status-indicator')).toContainText('Salvo');
  await shot('04-treino-em-andamento-dark.png', 'Séries, carga e repetições em treino ativo');
  await page.getByTestId('finalize-workout-button').click();
  await page.getByTestId('confirm-finalize-button').click();
  await expect(page.getByTestId('workout-completion-summary')).toBeVisible();
  await shot('05-resumo-do-treino-dark.png', 'Resumo após conclusão do treino');
  await page.getByRole('button', { name: 'Concluir e Voltar' }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: 'Alternar tema claro e escuro' }).click();
  await nav('');
  await page.getByRole('heading', { name: 'Pronto para treinar?' }).waitFor();
  await shot('06-dashboard-light.png', 'Início do app com dados locais no tema claro');
  await nav('/history');
  await page.locator('[data-testid^="history-session-card-"]').first().waitFor();
  await shot('07-historico-light.png', 'Histórico de sessões e dados de treino');
  await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await context.close();
} finally {
  await browser.close();
}
