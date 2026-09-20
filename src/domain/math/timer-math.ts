import { generateId } from '../common/id.js';
import type { EntityId } from '../common/types.js';
import type { RestTimer } from '../entities/rest-timer.js';
import { TimerStatus } from '../enums/timer-status.js';

/**
 * Calculates remaining milliseconds for a deadline-based RestTimer.
 * Pure function: calculates remaining = max(0, deadline - now).
 * Does not depend on setInterval/ticks.
 *
 * @param timer RestTimer entity
 * @param nowMs Current epoch time in milliseconds (defaults to Date.now())
 */
export function calculateRemainingMs(timer: RestTimer, nowMs = Date.now()): number {
  if (timer.status === TimerStatus.COMPLETED || timer.status === TimerStatus.CANCELLED) {
    return 0;
  }

  if (timer.status === TimerStatus.PAUSED) {
    return Math.max(0, timer.remainingMsWhenPaused ?? 0);
  }

  const deadlineMs = Date.parse(timer.deadlineAt);
  if (isNaN(deadlineMs)) return 0;

  return Math.max(0, deadlineMs - nowMs);
}

/**
 * Creates a new deadline-based RestTimer.
 *
 * @param durationSeconds Target rest period in seconds
 * @param workoutId Optional active workout owning this timer
 * @param nowMs Optional epoch time for deterministic testing (defaults to Date.now())
 */
export function createRestTimer(
  durationSeconds: number,
  workoutId?: EntityId,
  nowMs = Date.now(),
): RestTimer {
  const safeSeconds = Math.max(0, Math.round(durationSeconds));
  const startedAt = new Date(nowMs).toISOString();
  const deadlineAt = new Date(nowMs + safeSeconds * 1000).toISOString();

  return {
    id: generateId('timer'),
    workoutId,
    durationSeconds: safeSeconds,
    startedAt,
    deadlineAt,
    status: safeSeconds > 0 ? TimerStatus.RUNNING : TimerStatus.COMPLETED,
  };
}

/**
 * Pauses a running RestTimer, capturing exact remaining milliseconds.
 */
export function pauseRestTimer(timer: RestTimer, nowMs = Date.now()): RestTimer {
  if (timer.status !== TimerStatus.RUNNING) {
    return timer;
  }

  const remaining = calculateRemainingMs(timer, nowMs);

  return {
    ...timer,
    status: TimerStatus.PAUSED,
    pausedAt: new Date(nowMs).toISOString(),
    remainingMsWhenPaused: remaining,
  };
}

/**
 * Resumes a paused RestTimer, establishing a new deadline based on preserved remaining milliseconds.
 */
export function resumeRestTimer(timer: RestTimer, nowMs = Date.now()): RestTimer {
  if (timer.status !== TimerStatus.PAUSED) {
    return timer;
  }

  const remaining = Math.max(0, timer.remainingMsWhenPaused ?? 0);
  const newDeadlineAt = new Date(nowMs + remaining).toISOString();

  return {
    ...timer,
    status: remaining > 0 ? TimerStatus.RUNNING : TimerStatus.COMPLETED,
    deadlineAt: newDeadlineAt,
    pausedAt: undefined,
    remainingMsWhenPaused: undefined,
  };
}

/**
 * Adds extra seconds to a running or paused RestTimer.
 */
export function addTimerSeconds(
  timer: RestTimer,
  additionalSeconds: number,
  nowMs = Date.now(),
): RestTimer {
  const additionalMs = additionalSeconds * 1000;

  if (timer.status === TimerStatus.PAUSED) {
    const currentRemaining = timer.remainingMsWhenPaused ?? 0;
    const newRemaining = Math.max(0, currentRemaining + additionalMs);
    return {
      ...timer,
      durationSeconds: Math.max(0, timer.durationSeconds + additionalSeconds),
      remainingMsWhenPaused: newRemaining,
    };
  }

  if (timer.status === TimerStatus.RUNNING) {
    const currentDeadlineMs = Date.parse(timer.deadlineAt);
    const newDeadlineMs = Math.max(nowMs, currentDeadlineMs + additionalMs);
    return {
      ...timer,
      durationSeconds: Math.max(0, timer.durationSeconds + additionalSeconds),
      deadlineAt: new Date(newDeadlineMs).toISOString(),
    };
  }

  // If timer was already completed or cancelled, reactivate with the added duration
  if (additionalSeconds > 0) {
    return createRestTimer(additionalSeconds, timer.workoutId, nowMs);
  }

  return timer;
}
