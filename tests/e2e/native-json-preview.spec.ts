import { test, expect } from '@playwright/test';

test('JSON pendente no bridge Android abre a confirmação sem importar sozinho', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const program = {
      format: 'titan-program',
      schemaVersion: 1,
      appVersion: '1.0.1',
      exportedAt: new Date().toISOString(),
      kind: 'routine',
      program: {
        name: 'Android',
        progressionStrategy: 'DOUBLE_PROGRESSION',
        durationWeeks: 1,
        daysPerWeek: 1,
        weeks: [{ weekNumber: 1, routineRefIds: ['native'] }],
      },
      routines: [{ localRefId: 'native', name: 'Rotina recebida do Android', exercises: [] }],
    };
    const state = {
      pending: {
        present: true,
        id: 'android-cold',
        name: 'treino.json',
        mimeType: 'application/json',
        size: 200,
        source: 'android-share',
        text: JSON.stringify(program),
      },
    };
    const host = window as unknown as {
      androidBridge: object;
      Capacitor: object;
      __incoming: typeof state;
      __listener?: () => void;
    };
    host.__incoming = state;
    host.androidBridge = { postMessage() {} };
    host.Capacitor = {
      PluginHeaders: [
        {
          name: 'TitaIncomingJson',
          methods: [
            { name: 'getPendingSharedFile', rtype: 'promise' },
            { name: 'acknowledgeSharedFile', rtype: 'promise' },
            { name: 'addListener', rtype: 'callback' },
            { name: 'removeListener', rtype: 'promise' },
          ],
        },
      ],
      nativePromise: async (_plugin: string, method: string) => {
        if (method === 'getPendingSharedFile') return { ...state.pending };
        if (method === 'acknowledgeSharedFile') {
          state.pending.present = false;
          return {};
        }
        return {};
      },
      nativeCallback: (
        _plugin: string,
        _method: string,
        _options: object,
        callback: () => void,
      ) => {
        host.__listener = callback;
        return Promise.resolve('listener-1');
      },
    };
  });
  await page.goto('/app');
  const dialog = page.getByRole('dialog', { name: 'Importar JSON' });
  await expect(dialog).toContainText('treino.json');
  await expect(page.getByTestId('routines-grid')).toHaveCount(0);
  await page.getByTestId('confirm-json-import').click();
  await expect(page.getByTestId('routines-grid')).toContainText('Rotina recebida do Android');
});
