import type { ValidationResult } from '../common/types.js';
import type { ActiveWorkout } from '../entities/active-workout.js';
import { WorkoutStatus } from '../enums/workout-status.js';

/**
 * Validates an ActiveWorkout entity.
 * Pure function with zero I/O side-effects.
 */
export function validateActiveWorkout(workout: Partial<ActiveWorkout>): ValidationResult {
  const errors: string[] = [];

  if (!workout.id || typeof workout.id !== 'string' || workout.id.trim().length === 0) {
    errors.push('Workout id is required and must be a non-empty string');
  }

  if (!workout.title || typeof workout.title !== 'string' || workout.title.trim().length === 0) {
    errors.push('Workout title is required');
  }

  if (!workout.status || !Object.values(WorkoutStatus).includes(workout.status)) {
    errors.push(`Workout status must be a valid WorkoutStatus enum value`);
  }

  if (!workout.startedAt || isNaN(Date.parse(workout.startedAt))) {
    errors.push('Workout startedAt must be a valid ISO-8601 date string');
  }

  if (workout.endedAt) {
    const startMs = Date.parse(workout.startedAt || '');
    const endMs = Date.parse(workout.endedAt);
    if (isNaN(endMs)) {
      errors.push('Workout endedAt must be a valid ISO-8601 date string');
    } else if (!isNaN(startMs) && endMs < startMs) {
      errors.push('Workout endedAt cannot precede startedAt');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates whether an ActiveWorkout is eligible for finalization into an immutable WorkoutSnapshot.
 */
export function validateWorkoutFinalization(workout: ActiveWorkout): ValidationResult {
  const errors: string[] = [];

  const baseValidation = validateActiveWorkout(workout);
  if (!baseValidation.valid) {
    errors.push(...baseValidation.errors);
  }

  if (workout.status !== WorkoutStatus.IN_PROGRESS && workout.status !== WorkoutStatus.PAUSED) {
    errors.push(
      `Cannot finalize workout with status '${workout.status}'. Must be IN_PROGRESS or PAUSED`,
    );
  }

  // Check if at least one completed set exists
  const completedSetsCount = workout.exercises.reduce(
    (count, ex) => count + ex.sets.filter((s) => s.completed).length,
    0,
  );

  if (completedSetsCount === 0) {
    errors.push('Workout must contain at least one completed set to finalize into a snapshot');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Enforces the domain invariant: At most one unfinished workout session at any time.
 */
export function validateActiveWorkoutCount(workouts: readonly ActiveWorkout[]): ValidationResult {
  const activeWorkouts = workouts.filter(
    (w) => w.status === WorkoutStatus.IN_PROGRESS || w.status === WorkoutStatus.PAUSED,
  );

  if (activeWorkouts.length > 1) {
    return {
      valid: false,
      errors: [
        `Invariant violation: Found ${activeWorkouts.length} active workouts. At most 1 workout can be active concurrently`,
      ],
    };
  }

  return {
    valid: true,
    errors: [],
  };
}
