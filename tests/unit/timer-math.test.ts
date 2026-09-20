import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  createRestTimer,
  calculateRemainingMs,
  pauseRestTimer,
  resumeRestTimer,
  addTimerSeconds,
} from '../../src/domain/math/timer-math.js';
import { TimerStatus } from '../../src/domain/enums/timer-status.js';

describe('RestTimer Math — Deadline-Based Calculations', () => {
  const t0 = 1773700000000; // Fixed baseline epoch

  it('creates a running timer with correct deadline', () => {
    const timer = createRestTimer(90, 'wo_123', t0);
    expect(timer.status).toBe(TimerStatus.RUNNING);
    expect(timer.durationSeconds).toBe(90);
    expect(Date.parse(timer.deadlineAt)).toBe(t0 + 90_000);
  });

  it('calculates remaining milliseconds accurately before and after deadline', () => {
    const timer = createRestTimer(60, undefined, t0);

    // 20s elapsed -> 40s remaining
    expect(calculateRemainingMs(timer, t0 + 20_000)).toBe(40_000);
    // 60s elapsed -> 0s remaining
    expect(calculateRemainingMs(timer, t0 + 60_000)).toBe(0);
    // 75s elapsed -> 0s remaining (never negative)
    expect(calculateRemainingMs(timer, t0 + 75_000)).toBe(0);
  });

  it('handles pause and resume preserving exact remaining duration', () => {
    const timer = createRestTimer(60, undefined, t0);

    // Lifter pauses after 25 seconds
    const paused = pauseRestTimer(timer, t0 + 25_000);
    expect(paused.status).toBe(TimerStatus.PAUSED);
    expect(paused.remainingMsWhenPaused).toBe(35_000);

    // 10 minutes pass in paused state: remainingMs stays 35_000
    expect(calculateRemainingMs(paused, t0 + 625_000)).toBe(35_000);

    // Lifter resumes 10 minutes later (t0 + 625_000)
    const resumed = resumeRestTimer(paused, t0 + 625_000);
    expect(resumed.status).toBe(TimerStatus.RUNNING);
    expect(Date.parse(resumed.deadlineAt)).toBe(t0 + 625_000 + 35_000);

    // 15 seconds after resume -> 20s remaining
    expect(calculateRemainingMs(resumed, t0 + 625_000 + 15_000)).toBe(20_000);
  });

  it('adds extra seconds to running and paused timers', () => {
    const timer = createRestTimer(60, undefined, t0);

    // Add 30 seconds to running timer
    const extended = addTimerSeconds(timer, 30, t0);
    expect(extended.durationSeconds).toBe(90);
    expect(calculateRemainingMs(extended, t0)).toBe(90_000);

    // Add 15 seconds to paused timer
    const paused = pauseRestTimer(timer, t0 + 20_000); // 40s remaining
    const extendedPaused = addTimerSeconds(paused, 15, t0 + 20_000);
    expect(extendedPaused.remainingMsWhenPaused).toBe(55_000);
  });

  // --- Property-Based Test ---
  it('PBT: remainingMs is always in [0, durationMs] and monotonically non-increasing as time advances', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 600 }), // duration 1s to 600s
        fc.integer({ min: 0, max: 1000 }), // elapsed 1 in seconds
        fc.integer({ min: 0, max: 1000 }), // additional elapsed in seconds
        (durationSec, elapsed1Sec, addElapsedSec) => {
          const timer = createRestTimer(durationSec, undefined, t0);
          const t1 = t0 + elapsed1Sec * 1000;
          const t2 = t1 + addElapsedSec * 1000;

          const rem1 = calculateRemainingMs(timer, t1);
          const rem2 = calculateRemainingMs(timer, t2);

          // 1. Invariant: always non-negative
          expect(rem1).toBeGreaterThanOrEqual(0);
          expect(rem2).toBeGreaterThanOrEqual(0);

          // 2. Invariant: bounded by initial duration
          expect(rem1).toBeLessThanOrEqual(durationSec * 1000);
          expect(rem2).toBeLessThanOrEqual(durationSec * 1000);

          // 3. Invariant: non-increasing with advancing time
          expect(rem2).toBeLessThanOrEqual(rem1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
