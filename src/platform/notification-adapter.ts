import { LocalNotifications } from '@capacitor/local-notifications';
import { isNativePlatform } from './platform-detector.js';
import type { ScheduleNotificationOptions } from './types.js';

export class NotificationAdapter {
  private audioCtx: AudioContext | null = null;

  async requestPermission(): Promise<boolean> {
    try {
      if (isNativePlatform()) {
        const status = await LocalNotifications.requestPermissions();
        return status.display === 'granted';
      }

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') return true;
        if (Notification.permission !== 'denied') {
          const res = await Notification.requestPermission();
          return res === 'granted';
        }
      }
    } catch {
      // Ignore errors in environments where permissions are not supported
    }
    return false;
  }

  async scheduleNotification(options: ScheduleNotificationOptions): Promise<boolean> {
    const id = options.id ?? Math.floor(Math.random() * 1000000) + 1;
    try {
      if (isNativePlatform()) {
        await LocalNotifications.schedule({
          notifications: [
            {
              id,
              title: options.title,
              body: options.body,
              schedule: options.scheduleAt ? { at: options.scheduleAt } : undefined,
              sound: options.sound !== false ? 'beep.wav' : undefined,
            },
          ],
        });
        return true;
      }

      // Web Notification API fallback
      if (
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const delay = options.scheduleAt
          ? Math.max(0, options.scheduleAt.getTime() - Date.now())
          : 0;

        if (delay <= 0) {
          new Notification(options.title, { body: options.body });
        } else {
          setTimeout(() => {
            new Notification(options.title, { body: options.body });
          }, delay);
        }
        return true;
      }
    } catch {
      // Fall through to in-app audio/banner fallback
    }

    return false;
  }

  async cancelNotification(id: number): Promise<void> {
    try {
      if (isNativePlatform()) {
        await LocalNotifications.cancel({ notifications: [{ id }] });
      }
    } catch {
      // Safe no-op
    }
  }

  /**
   * In-app audio chime synthesis using Web Audio API (zero external audio file dependencies).
   */
  playChime(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      // High-low two-tone pleasant workout timer chime
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1174.66, now + 0.12); // D6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Safe fallback on restricted autoplay policy
    }
  }
}

export const notificationAdapter = new NotificationAdapter();
