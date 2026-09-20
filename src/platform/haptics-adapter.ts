import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { isNativePlatform } from './platform-detector.js';
import type { HapticsImpactStyle } from './types.js';

export class HapticsAdapter {
  async impact(style: HapticsImpactStyle = 'medium'): Promise<void> {
    try {
      if (isNativePlatform()) {
        const capacitorStyle =
          style === 'light'
            ? ImpactStyle.Light
            : style === 'heavy'
              ? ImpactStyle.Heavy
              : ImpactStyle.Medium;
        await Haptics.impact({ style: capacitorStyle });
        return;
      }

      // Web fallback
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        const ms = style === 'light' ? 25 : style === 'heavy' ? 70 : 45;
        navigator.vibrate(ms);
      }
    } catch {
      // Safe no-op on unsupported environments
    }
  }

  async vibrate(durationMs = 200): Promise<void> {
    try {
      if (isNativePlatform()) {
        await Haptics.vibrate({ duration: durationMs });
        return;
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(durationMs);
      }
    } catch {
      // Safe no-op
    }
  }
}

export const hapticsAdapter = new HapticsAdapter();
