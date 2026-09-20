import { App } from '@capacitor/app';
import { isNativePlatform } from './platform-detector.js';
import type { AppState, AppStateChangeListener } from './types.js';

export class LifecycleAdapter {
  private listeners: Set<AppStateChangeListener> = new Set();
  private isSubscribed = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    if (isNativePlatform()) {
      try {
        App.addListener('appStateChange', (state) => {
          this.notify({ isActive: state.isActive });
        }).catch(() => {
          this.setupWebListeners();
        });
        return;
      } catch {
        this.setupWebListeners();
        return;
      }
    }

    this.setupWebListeners();
  }

  private setupWebListeners(): void {
    if (this.isSubscribed || typeof document === 'undefined') return;
    this.isSubscribed = true;

    document.addEventListener('visibilitychange', () => {
      const isActive = document.visibilityState === 'visible';
      this.notify({ isActive });
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', () => {
        this.notify({ isActive: true });
      });

      window.addEventListener('blur', () => {
        this.notify({ isActive: false });
      });
    }
  }

  private notify(state: AppState): void {
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('Error in AppState listener:', err);
      }
    }
  }

  onAppStateChange(listener: AppStateChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Helper for testing/manual simulation of lifecycle transitions.
   */
  simulateStateChange(isActive: boolean): void {
    this.notify({ isActive });
  }
}

export const lifecycleAdapter = new LifecycleAdapter();
