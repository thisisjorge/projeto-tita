import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TimerStatus } from '../../src/domain/enums/timer-status.js';
import type { RestTimer } from '../../src/domain/entities/rest-timer.js';

const bridge = vi.hoisted(() => {
  let listener: (() => void) | null = null;
  const pending = { present: false } as Record<string, unknown>;
  return {
    pending,
    getPendingSharedFile: vi.fn(async () => ({ ...pending })),
    acknowledgeSharedFile: vi.fn(async ({ id }: { id: string }) => {
      if (pending.id === id) pending.present = false;
    }),
    addListener: vi.fn(async (_event: string, callback: () => void) => {
      listener = callback;
      return {
        remove: async () => {
          listener = null;
        },
      };
    }),
    emit: () => listener?.(),
    getState: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    extend: vi.fn(),
    cancel: vi.fn(),
  };
});

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
  registerPlugin: () => bridge,
}));

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: async () => ({ display: 'denied' }),
    requestPermissions: async () => ({ display: 'denied' }),
  },
}));

import {
  onNativeIncomingJson,
  takeNativeIncomingJson,
} from '../../src/platform/native-incoming-json.js';
import { reconcileNativeTimer, startNativeTimer } from '../../src/platform/native-rest-timer.js';

beforeEach(() => {
  bridge.pending.present = false;
  bridge.acknowledgeSharedFile.mockClear();
  bridge.start.mockClear();
});

describe('Ponte Android de JSON e timer', () => {
  it('entrega arquivo pendente no cold start apenas uma vez', async () => {
    Object.assign(bridge.pending, { present: true, id: 'cold', name: 'rotina.json', text: '{}' });
    expect((await takeNativeIncomingJson())?.name).toBe('rotina.json');
    expect(await takeNativeIncomingJson()).toBeNull();
    expect(bridge.acknowledgeSharedFile).toHaveBeenCalledWith({ id: 'cold' });
  });

  it('avisa a interface em warm start e transporta erro sem importar', async () => {
    const received = vi.fn();
    const handle = await onNativeIncomingJson(received);
    Object.assign(bridge.pending, {
      present: true,
      id: 'warm',
      error: 'Selecione um JSON de até 5 MB.',
    });
    bridge.emit();
    expect(received).toHaveBeenCalledOnce();
    expect((await takeNativeIncomingJson())?.error).toMatch(/5 MB/);
    await handle?.remove();
  });

  it('reconcilia o prazo nativo e cancela o timer sem valor negativo', () => {
    const cached: RestTimer = {
      id: 'one',
      durationSeconds: 90,
      startedAt: new Date(10_000).toISOString(),
      deadlineAt: new Date(100_000).toISOString(),
      status: TimerStatus.RUNNING,
    };
    const resumed = reconcileNativeTimer(
      {
        present: true,
        id: 'one',
        status: TimerStatus.RUNNING,
        durationSeconds: 120,
        startedAtMs: 10_000,
        deadlineAtMs: 130_000,
        remainingMs: 45_000,
        notificationsAllowed: false,
        exactAlertsAllowed: false,
      },
      cached,
    );
    expect(resumed?.durationSeconds).toBe(120);
    expect(resumed?.deadlineAt).toBe(new Date(130_000).toISOString());
    expect(
      reconcileNativeTimer(
        {
          present: true,
          id: 'one',
          status: TimerStatus.CANCELLED,
          notificationsAllowed: false,
          exactAlertsAllowed: false,
        },
        cached,
      ),
    ).toBeNull();
  });

  it('inicia o timer nativo mesmo com a permissão de notificação negada', async () => {
    await startNativeTimer({
      id: 'one',
      durationSeconds: 60,
      startedAt: new Date(0).toISOString(),
      deadlineAt: new Date(60_000).toISOString(),
      status: TimerStatus.RUNNING,
    });
    expect(bridge.start).toHaveBeenCalledWith({
      id: 'one',
      workoutId: undefined,
      durationSeconds: 60,
      deadlineAtMs: 60_000,
    });
  });
});
