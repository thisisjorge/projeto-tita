import { describe, it, expect } from 'vitest';
import {
  createRestTimer,
  calculateRemainingMs,
  pauseRestTimer,
  resumeRestTimer,
} from '../../src/domain/math/timer-math.js';
import { TimerStatus } from '../../src/domain/enums/timer-status.js';

describe('Workout Lifecycle & Timer Synchronization (REQ-12, Task 12.3)', () => {
  it('preserves absolute deadline when app is in background during running timer', () => {
    const startMs = 1_000_000;
    const durationSeconds = 90;
    const timer = createRestTimer(durationSeconds, 'workout-1', startMs);

    expect(timer.status).toBe(TimerStatus.RUNNING);
    expect(timer.deadlineAt).toBe(new Date(startMs + 90_000).toISOString());

    // Simulate background elapsed time: 30 seconds later
    const thirtySecondsLater = startMs + 30_000;
    const remainingMs = calculateRemainingMs(timer, thirtySecondsLater);
    expect(remainingMs).toBe(60_000);

    // Simulate background elapsed time: 90 seconds later (deadline reached)
    const ninetySecondsLater = startMs + 90_000;
    expect(calculateRemainingMs(timer, ninetySecondsLater)).toBe(0);

    // Simulate background elapsed time: 120 seconds later (deadline passed)
    const twoMinutesLater = startMs + 120_000;
    expect(calculateRemainingMs(timer, twoMinutesLater)).toBe(0);
  });

  it('correctly handles background-to-foreground transition when timer paused', () => {
    const startMs = 1_000_000;
    const timer = createRestTimer(60, 'workout-1', startMs);

    // Paused after 20 seconds
    const pausedTimer = pauseRestTimer(timer, startMs + 20_000);
    expect(pausedTimer.status).toBe(TimerStatus.PAUSED);
    expect(pausedTimer.remainingMsWhenPaused).toBe(40_000);

    // App remains in background for 10 minutes while paused
    const tenMinutesLater = startMs + 620_000;
    // Resumed after 10 minutes: deadline should be tenMinutesLater + 40_000
    const resumedTimer = resumeRestTimer(pausedTimer, tenMinutesLater);
    expect(resumedTimer.status).toBe(TimerStatus.RUNNING);
    expect(resumedTimer.deadlineAt).toBe(new Date(tenMinutesLater + 40_000).toISOString());

    // 10 seconds into resumption
    expect(calculateRemainingMs(resumedTimer, tenMinutesLater + 10_000)).toBe(30_000);
  });

  it('detects missed timer expiry on resume from background', () => {
    const startMs = 1_000_000;
    const timer = createRestTimer(30, 'workout-1', startMs);

    // Resumed 5 minutes later (significantly past deadline)
    const fiveMinutesLater = startMs + 300_000;
    const remainingMs = calculateRemainingMs(timer, fiveMinutesLater);

    expect(remainingMs).toBe(0);
    const isExpired = remainingMs <= 0;
    expect(isExpired).toBe(true);
  });
});
