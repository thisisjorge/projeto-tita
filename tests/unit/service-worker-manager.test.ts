import { describe, it, expect, vi } from 'vitest';
import { ServiceWorkerManager, type PwaState } from '../../src/services/service-worker-manager.js';
import fs from 'node:fs';
import path from 'node:path';

describe('ServiceWorkerManager (Unit Tests - REQ-8, Phase 9)', () => {
  it('handles unsupported environment gracefully', async () => {
    const manager = new ServiceWorkerManager({
      navigatorContainer: undefined,
    });

    const state = manager.getState();
    expect(state.isSupported).toBe(false);
    expect(state.isUpdateAvailable).toBe(false);

    const reg = await manager.register();
    expect(reg).toBeNull();
  });

  it('subscribes to state updates and immediately receives initial state', () => {
    const manager = new ServiceWorkerManager({
      navigatorContainer: undefined,
    });

    const received: PwaState[] = [];
    const unsubscribe = manager.subscribe((state) => {
      received.push(state);
    });

    expect(received.length).toBe(1);
    expect(received[0].isUpdateAvailable).toBe(false);

    unsubscribe();
  });

  it('detects update and defers when an active workout is in progress', async () => {
    const mockWorker = {
      state: 'installing',
      addEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === 'statechange') {
          // Store callback to invoke later
          (mockWorker as any).triggerStateChange = callback;
        }
      }),
      postMessage: vi.fn(),
    } as unknown as ServiceWorker;

    let updateFoundListener: (() => void) | null = null;

    const mockRegistration = {
      waiting: null,
      installing: mockWorker,
      addEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === 'updatefound') {
          updateFoundListener = callback;
        }
      }),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    const mockContainer = {
      register: vi.fn().mockResolvedValue(mockRegistration),
      controller: {} as ServiceWorker,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as ServiceWorkerContainer;

    let activeWorkoutRunning = true;
    const manager = new ServiceWorkerManager({
      navigatorContainer: mockContainer,
      activeWorkoutChecker: async () => activeWorkoutRunning,
    });

    await manager.register('/sw.js');

    // Trigger update found
    expect(updateFoundListener).not.toBeNull();
    updateFoundListener!();

    // Change installing worker state to installed
    (mockWorker as any).state = 'installed';
    await (mockWorker as any).triggerStateChange();

    // Verify state: update is available, but DEFERRED because of active workout!
    const state = manager.getState();
    expect(state.isUpdateAvailable).toBe(true);
    expect(state.isUpdateDeferred).toBe(true);
    expect(state.waitingWorker).toBe(mockWorker);

    // Now workout finishes!
    await manager.notifyActiveWorkoutChanged(false);

    // Verify state: update is still available, but NO LONGER deferred!
    const updatedState = manager.getState();
    expect(updatedState.isUpdateAvailable).toBe(true);
    expect(updatedState.isUpdateDeferred).toBe(false);
  });

  it('detects update and prepares for immediate activation when NO active workout is in progress', async () => {
    const mockWorker = {
      state: 'installed',
      addEventListener: vi.fn(),
      postMessage: vi.fn(),
    } as unknown as ServiceWorker;

    const mockRegistration = {
      waiting: mockWorker,
      installing: null,
      addEventListener: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    } as unknown as ServiceWorkerRegistration;

    const mockContainer = {
      register: vi.fn().mockResolvedValue(mockRegistration),
      controller: {} as ServiceWorker,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as ServiceWorkerContainer;

    const manager = new ServiceWorkerManager({
      navigatorContainer: mockContainer,
      activeWorkoutChecker: async () => false, // No active workout
    });

    await manager.register('/sw.js');

    const state = manager.getState();
    expect(state.isUpdateAvailable).toBe(true);
    expect(state.isUpdateDeferred).toBe(false);
    expect(state.waitingWorker).toBe(mockWorker);
  });

  it('applies update by posting SKIP_WAITING to waiting worker and reloads on controllerchange', async () => {
    const mockWorker = {
      state: 'installed',
      postMessage: vi.fn(),
    } as unknown as ServiceWorker;

    let controllerChangeCallback: (() => void) | null = null;

    const mockContainer = {
      register: vi.fn().mockResolvedValue({
        waiting: mockWorker,
        addEventListener: vi.fn(),
      }),
      controller: {} as ServiceWorker,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === 'controllerchange') {
          controllerChangeCallback = cb;
        }
      }),
      removeEventListener: vi.fn(),
    } as unknown as ServiceWorkerContainer;

    const onReload = vi.fn();
    const manager = new ServiceWorkerManager({
      navigatorContainer: mockContainer,
      activeWorkoutChecker: async () => false,
      onReload,
    });

    await manager.register('/sw.js');

    // User approves update
    manager.applyUpdate();

    expect(mockWorker.postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });

    // When new service worker takes control
    expect(controllerChangeCallback).not.toBeNull();
    controllerChangeCallback!();

    expect(onReload).toHaveBeenCalled();
  });

  it('allows user to explicitly defer update with deferUpdate()', async () => {
    const manager = new ServiceWorkerManager({
      navigatorContainer: undefined,
    });

    await manager.simulateUpdateAvailable(false);
    expect(manager.getState().isUpdateDeferred).toBe(false);

    manager.deferUpdate();
    expect(manager.getState().isUpdateDeferred).toBe(true);
  });
});

describe('PWA Service Worker File Verification (Tasks 10.1 & 10.2)', () => {
  const swFilePath = path.resolve(__dirname, '../../public/sw.js');
  const swContent = fs.readFileSync(swFilePath, 'utf-8');

  it('uses versioned cache name matching tita-shell-${releaseId}', () => {
    expect(swContent).toMatch(/const\s+SHELL_CACHE\s*=\s*`tita-shell-\${RELEASE_ID}`/);
    expect(swContent).toMatch(/const\s+RELEASE_ID\s*=\s*['"]v/);
  });

  it('does NOT automatically call self.skipWaiting() on install', () => {
    // Inside install listener, skipWaiting should not be called directly
    const installIndex = swContent.indexOf("self.addEventListener('install'");
    const activateIndex = swContent.indexOf("self.addEventListener('activate'");
    const installBlock = swContent.substring(installIndex, activateIndex);

    expect(installBlock).not.toMatch(/^\s*self\.skipWaiting\(\)/m);
  });

  it('listens for SKIP_WAITING message to activate upon explicit approval', () => {
    expect(swContent).toMatch(/event\.data\.type\s*===\s*['"]SKIP_WAITING['"]/);
    expect(swContent).toMatch(/self\.skipWaiting\(\)/);
  });

  it('excludes user data and API requests from cache', () => {
    expect(swContent).toMatch(/\/api\//);
    expect(swContent).toMatch(/\/user-data\//);
  });

  it('only deletes older shell caches during activate (preserving last-good shell on failed install)', () => {
    const activateIndex = swContent.indexOf("self.addEventListener('activate'");
    const fetchIndex = swContent.indexOf("self.addEventListener('fetch'");
    const activateBlock = swContent.substring(activateIndex, fetchIndex);

    expect(activateBlock).toMatch(/tita-shell-/);
    expect(activateBlock).toMatch(/caches\.delete/);
  });
});
