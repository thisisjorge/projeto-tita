import { test, expect } from '@playwright/test';
import { exportWorkoutSnapshot } from '../../src/backup/backup-exporter.js';

test('weekday no editor fica visível na lista', async ({ page }) => {
  await page.goto('/routines');
  await page.getByTestId('create-routine-btn').click();
  const editor = page.getByRole('dialog');
  await editor.getByPlaceholder(/Superior A/).fill('Pull A');
  await editor.getByTestId('routine-weekday-select').selectOption('SEGUNDA');
  await editor.getByTestId('add-exercise-to-routine-btn').click();
  await page.getByText('Puxada Frontal na Polia', { exact: true }).first().click();
  await editor.getByTestId('save-routine-btn').click();
  await expect(page.getByTestId('routines-grid')).toContainText('Seg');
  await expect(page.getByTestId('export-week-btn')).toBeVisible();
});

test('home sugere a rotina do dia local e inicia a sessão escolhida', async ({ page }) => {
  await page.goto('/routines');
  await page.getByTestId('create-routine-btn').click();
  const editor = page.getByRole('dialog');
  await editor.getByPlaceholder(/Superior A/).fill('Rotina de hoje');
  const today = await page.evaluate(
    () =>
      ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'][new Date().getDay()],
  );
  await editor.getByTestId('routine-weekday-select').selectOption(today!);
  await editor.getByTestId('add-exercise-to-routine-btn').click();
  await page.getByText('Puxada Frontal na Polia', { exact: true }).first().click();
  await editor.getByTestId('save-routine-btn').click();
  await page.goto('/app');
  await expect(page.getByTestId('start-today-routine-button')).toContainText('Rotina de hoje');
  await page.getByTestId('start-today-routine-button').click();
  await expect(page.getByTestId('active-workout-session')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('active-workout-session')).toBeVisible();
});

test('JSON recebido pelo share target aguarda confirmação', async ({ page }) => {
  await page.goto('/app');
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const manifest = await page.evaluate(
    async () => await (await fetch('/manifest.webmanifest')).json(),
  );
  expect(manifest.share_target.params.files[0].name).toBe('json');
  const status = await page.evaluate(async () => {
    const program = {
      format: 'titan-program',
      schemaVersion: 1,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      kind: 'routine',
      program: {
        name: 'Compartilhado',
        progressionStrategy: 'DOUBLE_PROGRESSION',
        durationWeeks: 1,
        daysPerWeek: 1,
        weeks: [{ weekNumber: 1, routineRefIds: ['incoming'] }],
      },
      routines: [
        { localRefId: 'incoming', name: 'Pull compartilhado', weekday: 'SEGUNDA', exercises: [] },
      ],
    };
    const body = new FormData();
    body.append(
      'json',
      new File([JSON.stringify(program)], 'rotina.json', { type: 'application/json' }),
    );
    return (await fetch('/routines', { method: 'POST', body })).status;
  });
  expect(status).toBe(200);
  await page.goto('/routines');
  await expect(page.getByRole('dialog', { name: 'Importar JSON' })).toContainText('rotina.json');
  await expect(page.getByTestId('routines-grid')).toHaveCount(0);
  await page.getByTestId('confirm-json-import').click();
  await expect(page.getByTestId('routines-grid')).toContainText('Pull compartilhado');
});

test('arquivo aberto via launchQueue mostra prévia antes da importação', async ({ page }) => {
  await page.addInitScript(() => {
    const program = {
      format: 'titan-program',
      schemaVersion: 1,
      appVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      kind: 'routine',
      program: {
        name: 'Arquivo aberto',
        progressionStrategy: 'DOUBLE_PROGRESSION',
        durationWeeks: 1,
        daysPerWeek: 1,
        weeks: [{ weekNumber: 1, routineRefIds: ['opened'] }],
      },
      routines: [{ localRefId: 'opened', name: 'Rotina do arquivo', exercises: [] }],
    };
    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: {
        setConsumer: (consumer: (params: { files: { getFile: () => Promise<File> }[] }) => void) =>
          consumer({
            files: [
              {
                getFile: async () =>
                  new File([JSON.stringify(program)], 'aberto.json', {
                    type: 'application/json',
                  }),
              },
            ],
          }),
      },
    });
  });
  await page.goto('/routines');
  await expect(page.getByRole('dialog', { name: 'Importar JSON' })).toContainText('aberto.json');
  await expect(page.getByTestId('routines-grid')).toHaveCount(0);
  await page.getByTestId('confirm-json-import').click();
  await expect(page.getByTestId('routines-grid')).toContainText('Rotina do arquivo');
});

test('backup compartilhado não sobrescreve sessão local com o mesmo ID', async ({ page }) => {
  await page.goto('/routines');
  await expect(page.getByText('Nenhuma rotina criada ainda')).toBeVisible();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  const incoming = {
    id: 'same-session',
    schemaVersion: 1,
    sourceWorkoutId: 'workout',
    title: 'Versão recebida',
    startedAt: '2026-09-27T10:00:00.000Z',
    completedAt: '2026-09-27T11:00:00.000Z',
    activeDurationMs: 3600000,
    totalDurationMs: 3600000,
    exercises: [],
    totalVolumeKg: 0,
    totalReps: 0,
    completedSetsCount: 0,
    revision: 1,
  };
  await page.evaluate(async (snapshot) => {
    const request = indexedDB.open('tita-db');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('workoutSnapshots', 'readwrite');
      tx.objectStore('workoutSnapshots').put({ ...snapshot, title: 'Versão local' });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, incoming);
  const { json } = await exportWorkoutSnapshot(incoming);
  await page.evaluate(async (text) => {
    const body = new FormData();
    body.append('json', new File([text], 'sessao.json', { type: 'application/json' }));
    await fetch('/routines', { method: 'POST', body });
  }, json);
  await page.reload();
  await expect(page.getByRole('dialog', { name: 'Importar JSON' })).toContainText('Backup Titã');
  await page.getByTestId('confirm-json-import').click();
  const storedTitle = await page.evaluate(async () => {
    const request = indexedDB.open('tita-db');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const title = await new Promise<string>((resolve, reject) => {
      const tx = db.transaction('workoutSnapshots', 'readonly');
      const read = tx.objectStore('workoutSnapshots').get('same-session');
      read.onsuccess = () => resolve(read.result.title);
      read.onerror = () => reject(read.error);
    });
    db.close();
    return title;
  });
  expect(storedTitle).toBe('Versão local');
});
