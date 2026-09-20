import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPlatform,
  isNativePlatform,
  hapticsAdapter,
  notificationAdapter,
  fileShareAdapter,
  lifecycleAdapter,
  type AppState,
} from '../../src/platform/index.js';

describe('Platform Adapters (REQ-12, Phase 11)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Platform Detection', () => {
    it('detects web platform in standard browser/test environment', () => {
      expect(getPlatform()).toBe('web');
      expect(isNativePlatform()).toBe(false);
    });
  });

  describe('HapticsAdapter', () => {
    it('handles impact feedback safely in web/fallback mode', async () => {
      await expect(hapticsAdapter.impact('light')).resolves.toBeUndefined();
      await expect(hapticsAdapter.impact('medium')).resolves.toBeUndefined();
      await expect(hapticsAdapter.impact('heavy')).resolves.toBeUndefined();
    });

    it('handles vibration requests safely', async () => {
      await expect(hapticsAdapter.vibrate(100)).resolves.toBeUndefined();
    });
  });

  describe('NotificationAdapter', () => {
    it('requests permission gracefully', async () => {
      const result = await notificationAdapter.requestPermission();
      expect(typeof result).toBe('boolean');
    });

    it('schedules notifications with fallback', async () => {
      const success = await notificationAdapter.scheduleNotification({
        id: 999,
        title: 'Descanso Finalizado',
        body: 'Hora de treinar!',
        scheduleAt: new Date(Date.now() + 1000),
      });
      expect(typeof success).toBe('boolean');
    });

    it('cancels scheduled notifications safely', async () => {
      await expect(notificationAdapter.cancelNotification(999)).resolves.toBeUndefined();
    });

    it('plays synthesized audio chime without throwing', () => {
      expect(() => notificationAdapter.playChime()).not.toThrow();
    });
  });

  describe('FileShareAdapter', () => {
    it('handles file sharing with download/web-share fallback', async () => {
      const blob = new Blob(['{"test": true}'], { type: 'application/json' });
      const result = await fileShareAdapter.shareFile({
        fileName: 'tita-test.json',
        blob,
        text: 'Backup Teste',
      });

      expect(result).toBeDefined();
      expect(['native-share', 'web-share', 'download']).toContain(result.method);
    });
  });

  describe('LifecycleAdapter', () => {
    it('registers and unregisters lifecycle listeners', () => {
      const states: AppState[] = [];
      const unsubscribe = lifecycleAdapter.onAppStateChange((state) => {
        states.push(state);
      });

      lifecycleAdapter.simulateStateChange(false);
      lifecycleAdapter.simulateStateChange(true);

      expect(states).toEqual([{ isActive: false }, { isActive: true }]);

      unsubscribe();

      lifecycleAdapter.simulateStateChange(false);
      // After unsubscribe, no new state should be appended
      expect(states).toHaveLength(2);
    });
  });
});
