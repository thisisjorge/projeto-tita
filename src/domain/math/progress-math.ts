import type { ActiveWorkout } from '../entities/active-workout.js';
import type { ExerciseSet } from '../entities/exercise-set.js';
import { isWorkingSet } from '../enums/set-type.js';

/**
 * Computes active duration in milliseconds, strictly excluding pauses.
 * Pure function: calculates (end - start) - totalPausedDuration.
 *
 * @param workout ActiveWorkout session
 * @param nowMs Current epoch time (defaults to Date.now())
 */
export function calculateActiveDurationMs(workout: ActiveWorkout, nowMs = Date.now()): number {
  const startMs = Date.parse(workout.startedAt);
  if (isNaN(startMs)) return 0;

  const endMs = workout.endedAt ? Date.parse(workout.endedAt) : nowMs;
  if (isNaN(endMs) || endMs <= startMs) return 0;

  const wallDurationMs = endMs - startMs;

  // Calculate sum of completed or in-progress pause intervals
  let pausedMs = 0;
  for (const interval of workout.pauseIntervals) {
    const pauseStart = Date.parse(interval.pausedAt);
    if (!isNaN(pauseStart)) {
      const pauseEnd = interval.resumedAt ? Date.parse(interval.resumedAt) : nowMs;
      if (!isNaN(pauseEnd) && pauseEnd > pauseStart) {
        pausedMs += Math.min(pauseEnd, endMs) - Math.max(pauseStart, startMs);
      }
    }
  }

  return Math.max(0, wallDurationMs - pausedMs);
}

/**
 * Calculates estimated 1 Repetition Maximum using Epley's canonical formula.
 * Formula: e1RM = weight * (1 + reps / 30)
 *
 * Requirements & Invariants:
 * - reps === 1: returns exact weight (measured 1RM).
 * - reps <= 0 or weight <= 0: returns 0.
 * - Always treats values as an estimate.
 *
 * @param weight Load in kilograms (can be fractional)
 * @param reps Number of completed repetitions
 * @returns Estimated 1RM in kilograms rounded to 1 decimal place
 */
export function calculateEpley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0 || isNaN(weight) || isNaN(reps)) {
    return 0;
  }
  if (reps === 1) {
    return weight;
  }

  const raw1RM = weight * (1 + reps / 30);
  return Math.round(raw1RM * 10) / 10;
}

/**
 * Calculates estimated 1RM using Brzycki's alternative canonical formula.
 * Formula: e1RM = weight * (36 / (37 - reps))
 * Note: Formula is mathematically valid for reps < 37.
 */
export function calculateBrzycki1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0 || reps >= 37 || isNaN(weight) || isNaN(reps)) {
    return 0;
  }
  if (reps === 1) {
    return weight;
  }

  const raw1RM = weight * (36 / (37 - reps));
  return Math.round(raw1RM * 10) / 10;
}

/**
 * Calculates training volume (load * repetitions) for a set.
 * Returns 0 if either weight or reps is 0.
 */
export function calculateSetVolume(set: ExerciseSet): number {
  if (!set.completed || set.weight === undefined || set.reps === undefined) {
    return 0;
  }
  if (set.weight <= 0 || set.reps <= 0) {
    return 0;
  }
  return set.weight * set.reps;
}

export interface WorkoutSummary {
  readonly totalVolumeKg: number;
  readonly totalReps: number;
  readonly completedSetsCount: number;
}

/**
 * Computes aggregate summary metrics for a workout session.
 * Working sets contribute to total volume; warmups do not per canonical rules.
 */
export function calculateWorkoutSummary(
  exercises: readonly { sets: readonly ExerciseSet[] }[],
): WorkoutSummary {
  let totalVolumeKg = 0;
  let totalReps = 0;
  let completedSetsCount = 0;

  for (const ex of exercises) {
    for (const set of ex.sets) {
      if (set.completed) {
        completedSetsCount++;
        const reps = set.reps ?? 0;
        totalReps += reps;

        if (isWorkingSet(set.type)) {
          totalVolumeKg += calculateSetVolume(set);
        }
      }
    }
  }

  return {
    totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
    totalReps,
    completedSetsCount,
  };
}
