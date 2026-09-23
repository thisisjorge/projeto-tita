import { expect, test } from '@playwright/test';

test('mobile mostra built-ins legados em PT-BR sem regravar dados', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/app/routines');
  await expect(page.getByRole('heading', { name: 'Minhas Rotinas' })).toBeVisible();

  const exerciseId = '3f353d81-231a-52ea-a84d-36ae89aee8b5';
  await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tita-db');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(
        ['programs', 'routines', 'exercises', 'workoutSnapshots'],
        'readwrite',
      );
      const exercises = transaction.objectStore('exercises');
      const request = exercises.get(id);
      request.onsuccess = () => exercises.put({ ...request.result, name: 'Row Chest' });
      transaction.objectStore('programs').put({
        id: 'prog_legacy_ptbr',
        name: 'Push / Pull / Legs (PPL) 6x Semanal',
        templateRef: 'template-ppl-6x',
        active: false,
      });
      transaction.objectStore('routines').put({
        id: 'rt_legacy_ptbr',
        name: 'Mon Pull',
        programId: 'prog_legacy_ptbr',
        exercises: [{ id: 'slot_legacy_ptbr', exerciseId: id, order: 0, sets: [] }],
        groups: [],
      });
      transaction.objectStore('workoutSnapshots').put({
        id: 'snap_legacy_ptbr',
        sourceRoutineId: 'rt_legacy_ptbr',
        title: 'Mon Pull',
        completedAt: '2026-09-20T12:00:00.000Z',
        exercises: [{ exerciseId: id, exerciseName: 'Row Chest', sets: [] }],
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, exerciseId);

  await page.reload();
  const card = page.getByTestId('routine-card-rt_legacy_ptbr');
  await expect(card.getByRole('heading', { name: 'Segunda · Puxar' })).toBeVisible();
  await expect(card.getByText('Remada na máquina com apoio no peito')).toBeVisible();

  const stored = await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('tita-db');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise<{ routine: string; exercise: string; history: string }>(
      (resolve, reject) => {
        const transaction = db.transaction(
          ['routines', 'exercises', 'workoutSnapshots'],
          'readonly',
        );
        const routineRequest = transaction.objectStore('routines').get('rt_legacy_ptbr');
        const exerciseRequest = transaction.objectStore('exercises').get(id);
        const historyRequest = transaction.objectStore('workoutSnapshots').get('snap_legacy_ptbr');
        transaction.oncomplete = () =>
          resolve({
            routine: routineRequest.result.name,
            exercise: exerciseRequest.result.name,
            history: historyRequest.result.exercises[0].exerciseName,
          });
        transaction.onerror = () => reject(transaction.error);
      },
    );
    db.close();
    return result;
  }, exerciseId);
  expect(stored).toEqual({ routine: 'Mon Pull', exercise: 'Row Chest', history: 'Row Chest' });
});
