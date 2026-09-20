/**
 * Service Worker & PWA Manager for Projeto Titã
 * Conforms to REQ-8, ARCHITECTURE_LOCAL_FIRST.md, and Phase 9 (Tasks 10.1 - 10.4)
 *
 * Responsibilities:
 * 1. Safe registration of versioned service worker.
 * 2. Real-time online/offline connectivity tracking.
 * 3. Update detection without automatic skipWaiting.
 * 4. Update deferral during Active Workout ("Nova versão disponível — Atualizar após o treino").
 * 5. Update application upon user approval, dispatching SKIP_WAITING to waiting worker.
 */

export interface PwaState {
  readonly isSupported: boolean;
  readonly isOnline: boolean;
  readonly isUpdateAvailable: boolean;
  readonly isUpdateDeferred: boolean;
  readonly waitingWorker: ServiceWorker | null;
  readonly lastCheckedAt?: number;
}

export type PwaListener = (state: PwaState) => void;

export interface ServiceWorkerManagerOptions {
  swUrl?: string;
  scope?: string;
  navigatorContainer?: ServiceWorkerContainer;
  activeWorkoutChecker?: () => Promise<boolean>;
  onReload?: () => void;
}

export class ServiceWorkerManager {
  private readonly swUrl: string;
  private readonly scope?: string;
  private readonly navigatorContainer: ServiceWorkerContainer | null;
  private activeWorkoutChecker: (() => Promise<boolean>) | null;
  private onReload: () => void;

  private registration: ServiceWorkerRegistration | null = null;
  private waitingWorker: ServiceWorker | null = null;
  private isUpdateAvailable = false;
  private isUpdateDeferred = false;
  private isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  private readonly listeners = new Set<PwaListener>();
  private boundOnlineHandler: (() => void) | null = null;
  private boundOfflineHandler: (() => void) | null = null;
  private boundCustomUpdateHandler: ((event: Event) => void) | null = null;
  private boundControllerChangeHandler: (() => void) | null = null;

  constructor(options: ServiceWorkerManagerOptions = {}) {
    this.swUrl = options.swUrl ?? '/sw.js';
    this.scope = options.scope;
    this.navigatorContainer =
      options.navigatorContainer ??
      (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
        ? navigator.serviceWorker
        : null);
    this.activeWorkoutChecker = options.activeWorkoutChecker ?? null;
    this.onReload =
      options.onReload ??
      (() => {
        if (typeof window !== 'undefined' && window.location) {
          window.location.reload();
        }
      });

    this.initNetworkListeners();
    this.initCustomEventListener();
  }

  public getState(): PwaState {
    return {
      isSupported: this.navigatorContainer !== null,
      isOnline: this.isOnline,
      isUpdateAvailable: this.isUpdateAvailable,
      isUpdateDeferred: this.isUpdateDeferred,
      waitingWorker: this.waitingWorker,
    };
  }

  public subscribe(listener: PwaListener): () => void {
    this.listeners.add(listener);
    // Send immediate initial state
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public setActiveWorkoutChecker(checker: () => Promise<boolean>): void {
    this.activeWorkoutChecker = checker;
  }

  /**
   * Called by WorkoutView or ActiveWorkoutService when active workout state changes.
   */
  public async notifyActiveWorkoutChanged(hasActive: boolean): Promise<void> {
    if (this.isUpdateAvailable) {
      if (hasActive && !this.isUpdateDeferred) {
        this.isUpdateDeferred = true;
        this.emitState();
      } else if (!hasActive && this.isUpdateDeferred) {
        this.isUpdateDeferred = false;
        this.emitState();
      }
    }
  }

  /**
   * Registers the service worker and begins watching for updates.
   */
  public async register(swUrl?: string): Promise<ServiceWorkerRegistration | null> {
    if (!this.navigatorContainer) {
      return null;
    }

    const targetUrl = swUrl ?? this.swUrl;
    try {
      const reg = await this.navigatorContainer.register(targetUrl, {
        scope: this.scope,
      });
      this.registration = reg;

      // Check if a worker is already waiting from a previous session
      if (reg.waiting) {
        this.waitingWorker = reg.waiting;
        await this.handleUpdateFound(reg.waiting);
      }

      // Listen for new workers entering the pipeline
      reg.addEventListener('updatefound', () => {
        const installingWorker = reg.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', async () => {
          if (installingWorker.state === 'installed' && this.navigatorContainer?.controller) {
            this.waitingWorker = installingWorker;
            await this.handleUpdateFound(installingWorker);
          }
        });
      });

      // Listen for controller changes to trigger clean reload
      this.boundControllerChangeHandler = () => {
        this.onReload();
      };
      this.navigatorContainer.addEventListener(
        'controllerchange',
        this.boundControllerChangeHandler,
      );

      return reg;
    } catch (error) {
      console.warn('[PWA] ServiceWorker registration error:', error);
      return null;
    }
  }

  /**
   * Check for service worker updates immediately.
   */
  public async checkForUpdate(): Promise<boolean> {
    if (!this.registration) return false;
    try {
      await this.registration.update();
      return this.isUpdateAvailable;
    } catch (error) {
      console.warn('[PWA] Error checking for updates:', error);
      return false;
    }
  }

  /**
   * Explicitly defer update until after current workout.
   */
  public deferUpdate(): void {
    if (this.isUpdateAvailable) {
      this.isUpdateDeferred = true;
      this.emitState();
    }
  }

  /**
   * User approved update. Sends SKIP_WAITING to the waiting service worker.
   */
  public applyUpdate(): void {
    if (this.waitingWorker) {
      this.waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // Fallback reload if no waiting worker reference
      this.onReload();
    }
  }

  /**
   * For testing or synthetic events: trigger an update state programmatically.
   */
  public async simulateUpdateAvailable(hasActiveWorkout?: boolean): Promise<void> {
    const active =
      hasActiveWorkout !== undefined
        ? hasActiveWorkout
        : this.activeWorkoutChecker
          ? await this.activeWorkoutChecker()
          : false;

    this.isUpdateAvailable = true;
    this.isUpdateDeferred = active;
    this.emitState();
  }

  public destroy(): void {
    if (typeof window !== 'undefined') {
      if (this.boundOnlineHandler) window.removeEventListener('online', this.boundOnlineHandler);
      if (this.boundOfflineHandler) window.removeEventListener('offline', this.boundOfflineHandler);
      if (this.boundCustomUpdateHandler) {
        window.removeEventListener('tita:sw-update-available', this.boundCustomUpdateHandler);
      }
    }
    if (this.navigatorContainer && this.boundControllerChangeHandler) {
      this.navigatorContainer.removeEventListener(
        'controllerchange',
        this.boundControllerChangeHandler,
      );
    }
    this.listeners.clear();
  }

  private async handleUpdateFound(_worker: ServiceWorker): Promise<void> {
    const hasActive = this.activeWorkoutChecker ? await this.activeWorkoutChecker() : false;

    this.isUpdateAvailable = true;
    this.isUpdateDeferred = hasActive;
    this.emitState();
  }

  private emitState(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[PWA] Error in listener:', err);
      }
    });
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    this.boundOnlineHandler = () => {
      this.isOnline = true;
      this.emitState();
    };

    this.boundOfflineHandler = () => {
      this.isOnline = false;
      this.emitState();
    };

    window.addEventListener('online', this.boundOnlineHandler);
    window.addEventListener('offline', this.boundOfflineHandler);
  }

  private initCustomEventListener(): void {
    if (typeof window === 'undefined') return;

    this.boundCustomUpdateHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ hasActiveWorkout?: boolean }>;
      const hasActive = customEvent.detail?.hasActiveWorkout;
      this.simulateUpdateAvailable(hasActive);
    };

    window.addEventListener('tita:sw-update-available', this.boundCustomUpdateHandler);
  }
}

// Global singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();
