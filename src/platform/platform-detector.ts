import { Capacitor } from '@capacitor/core';
import type { PlatformType } from './types.js';

export function getPlatform(): PlatformType {
  const p = Capacitor.getPlatform();
  if (p === 'android' || p === 'ios') {
    return p;
  }
  return 'web';
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
