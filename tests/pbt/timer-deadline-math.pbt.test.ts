import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  createRestTimer,
  calculateRemainingMs,
  pauseRestTimer,
  resumeRestTimer,
  addTimerSeconds,
} from '../../src/domain/math/timer-math.js';
import { TimerStatus } from '../../src/domain/enums/timer-status.js';

describe('PBT 8: Timer Deadline Math Across Time Jumps and Resume (REQ-4)', () => {
  it('calculates exact remainingMs = max(0, deadline - now) across arbitrary time jumps without tick drift', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 600 }), // durationSeconds
        fc.integer({ min: 1000000, max: 2000000 }), // startEpochMs
        fc.integer({ min: 0, max: 1200 }), // elapsedSeconds
        (durationSeconds, startEpochMs, elapsedSeconds) => {
          const timer = createRestTimer(durationSeconds, undefined, startEpochMs);
          const currentEpochMs = startEpochMs + elapsedSeconds * 1000;

          const remainingMs = calculateRemainingMs(timer, currentEpochMs);
          const expectedRemainingMs = Math.max(0, durationSeconds * 1000 - elapsedSeconds * 1000);

          expect(remainingMs).toBe(expectedRemainingMs);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('preserves exact remaining duration across arbitrary pause intervals and resumes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 30, max: 300 }), // durationSeconds
        fc.integer({ min: 1000000, max: 2000000 }), // startEpochMs
        fc.integer({ min: 5, max: 25 }), // runBeforePauseSeconds
        fc.integer({ min: 10, max: 1000 }), // pausedDurationSeconds
        fc.integer({ min: 1, max: 10 }), // runAfterResumeSeconds
        (durationSeconds, startEpochMs, runBeforePause, pausedDuration, runAfterResume) => {
          const timer = createRestTimer(durationSeconds, undefined, startEpochMs);

          // 1. Pause timer at start + runBeforePause
          const pauseTimeMs = startEpochMs + runBeforePause * 1000;
          const pausedTimer = pauseRestTimer(timer, pauseTimeMs);
          expect(pausedTimer.status).toBe(TimerStatus.PAUSED);

          const expectedRemainingAtPause = (durationSeconds - runBeforePause) * 1000;
          expect(pausedTimer.remainingMsWhenPaused).toBe(expectedRemainingAtPause);

          // 2. While paused, remainingMs must remain strictly frozen regardless of elapsed time
          const checkDuringPauseMs = pauseTimeMs + pausedDuration * 1000;
          expect(calculateRemainingMs(pausedTimer, checkDuringPauseMs)).toBe(
            expectedRemainingAtPause,
          );

          // 3. Resume timer at pauseTimeMs + pausedDuration
          const resumeTimeMs = pauseTimeMs + pausedDuration * 1000;
          const resumedTimer = resumeRestTimer(pausedTimer, resumeTimeMs);
          expect(resumedTimer.status).toBe(TimerStatus.RUNNING);

          // 4. Check remaining after resuming
          const checkAfterResumeMs = resumeTimeMs + runAfterResume * 1000;
          const remainingAfterResume = calculateRemainingMs(resumedTimer, checkAfterResumeMs);

          const expectedFinalRemaining = Math.max(
            0,
            expectedRemainingAtPause - runAfterResume * 1000,
          );
          expect(remainingAfterResume).toBe(expectedFinalRemaining);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('accurately extends deadline when adding extra seconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 120 }), // initial duration
        fc.integer({ min: 10, max: 60 }), // added duration
        fc.integer({ min: 1000000, max: 2000000 }), // start epoch
        (initialDuration, addedDuration, startEpochMs) => {
          const timer = createRestTimer(initialDuration, undefined, startEpochMs);
          const updatedTimer = addTimerSeconds(timer, addedDuration, startEpochMs);

          expect(updatedTimer.durationSeconds).toBe(initialDuration + addedDuration);
          const expectedRemaining = (initialDuration + addedDuration) * 1000;
          expect(calculateRemainingMs(updatedTimer, startEpochMs)).toBe(expectedRemaining);
        },
      ),
      { numRuns: 30 },
    );
  });
});
