import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { RestTimer } from '../domain/entities/rest-timer.js';
import { TimerStatus } from '../domain/enums/timer-status.js';
import { isAndroidApk } from './native-incoming-json.js';

export interface NativeTimerState {
  present: boolean;
  id?: string;
  workoutId?: string;
  status?: TimerStatus;
  durationSeconds?: number;
  startedAtMs?: number;
  deadlineAtMs?: number;
  remainingMs?: number;
  notificationsAllowed: boolean;
  exactAlertsAllowed: boolean;
}

interface NativeTimerPlugin {
  start(options: {
    id: string;
    workoutId?: string;
    durationSeconds: number;
    deadlineAtMs: number;
  }): Promise<NativeTimerState>;
  getState(): Promise<NativeTimerState>;
  pause(): Promise<NativeTimerState>;
  resume(): Promise<NativeTimerState>;
  extend(options: { seconds: number }): Promise<NativeTimerState>;
  cancel(): Promise<NativeTimerState>;
  openExactAlarmSettings(): Promise<void>;
  addListener(
    event: 'timerChanged',
    listener: (state: NativeTimerState) => void,
  ): Promise<PluginListenerHandle>;
}

const plugin = registerPlugin<NativeTimerPlugin>('TitaRestTimer');
const permissionKey = 'tita-native-rest-notification-asked';

export async function requestTimerNotificationPermission(): Promise<boolean> {
  if (!isAndroidApk()) return true;
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted') return true;
  if (localStorage.getItem(permissionKey)) return false;
  localStorage.setItem(permissionKey, '1');
  return (await LocalNotifications.requestPermissions()).display === 'granted';
}

export async function startNativeTimer(timer: RestTimer): Promise<void> {
  if (!isAndroidApk() || timer.status !== TimerStatus.RUNNING) return;
  await plugin.start({
    id: timer.id,
    workoutId: timer.workoutId,
    durationSeconds: timer.durationSeconds,
    deadlineAtMs: Date.parse(timer.deadlineAt),
  });
}

export async function nativeTimerState(): Promise<NativeTimerState | null> {
  return isAndroidApk() ? plugin.getState() : null;
}

export async function nativeTimerAction(
  action: 'pause' | 'resume' | 'cancel' | 'extend',
  seconds = 0,
): Promise<NativeTimerState | null> {
  if (!isAndroidApk()) return null;
  if (action === 'extend') return plugin.extend({ seconds });
  return plugin[action]();
}

export async function onNativeTimerChanged(
  listener: () => void,
): Promise<PluginListenerHandle | null> {
  if (!isAndroidApk()) return null;
  return plugin.addListener('timerChanged', listener);
}

export async function openExactAlarmSettings(): Promise<void> {
  if (isAndroidApk()) await plugin.openExactAlarmSettings();
}

export function reconcileNativeTimer(
  native: NativeTimerState,
  cached: RestTimer | null,
): RestTimer | null {
  if (!native.present || !native.id || !native.status) return cached;
  if (native.status === TimerStatus.CANCELLED) return null;
  const now = Date.now();
  return {
    id: native.id,
    workoutId: native.workoutId,
    status: native.status,
    durationSeconds: native.durationSeconds ?? cached?.durationSeconds ?? 0,
    startedAt: new Date(native.startedAtMs ?? now).toISOString(),
    deadlineAt: new Date(native.deadlineAtMs ?? now).toISOString(),
    pausedAt: native.status === TimerStatus.PAUSED ? new Date(now).toISOString() : undefined,
    remainingMsWhenPaused:
      native.status === TimerStatus.PAUSED ? (native.remainingMs ?? 0) : undefined,
  };
}
