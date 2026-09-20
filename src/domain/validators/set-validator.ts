import type { ValidationResult } from '../common/types.js';
import type { ExerciseSet } from '../entities/exercise-set.js';

/**
 * Validates an ExerciseSet for internal domain consistency.
 * Pure function with zero I/O side-effects.
 *
 * NOTE: 0 is explicitly a valid value for weight, reps, rir, and painLevel.
 */
export function validateExerciseSet(set: Partial<ExerciseSet>): ValidationResult {
  const errors: string[] = [];

  if (!set.id || typeof set.id !== 'string' || set.id.trim().length === 0) {
    errors.push('Set id is required and must be a non-empty string');
  }

  if (typeof set.setNumber !== 'number' || !Number.isInteger(set.setNumber) || set.setNumber < 1) {
    errors.push('Set setNumber must be an integer >= 1');
  }

  if (!set.type) {
    errors.push('Set type is required');
  }

  // When marked as completed, load and repetitions must be valid numbers (can be 0)
  if (set.completed === true) {
    if (
      set.weight === undefined ||
      set.weight === null ||
      typeof set.weight !== 'number' ||
      isNaN(set.weight) ||
      set.weight < 0
    ) {
      errors.push('Completed set must have a valid weight >= 0');
    }

    if (
      set.reps === undefined ||
      set.reps === null ||
      typeof set.reps !== 'number' ||
      !Number.isInteger(set.reps) ||
      set.reps < 0
    ) {
      errors.push('Completed set must have a valid integer reps >= 0');
    }

    if (set.completedAt) {
      const parsedTime = Date.parse(set.completedAt);
      if (isNaN(parsedTime)) {
        errors.push('Set completedAt must be a valid ISO-8601 date string');
      }
    }
  }

  // Advanced fields validation (if present)
  if (set.rpe !== undefined && set.rpe !== null) {
    if (typeof set.rpe !== 'number' || isNaN(set.rpe) || set.rpe < 1 || set.rpe > 10) {
      errors.push('Set RPE must be a number between 1.0 and 10.0');
    }
  }

  if (set.rir !== undefined && set.rir !== null) {
    if (typeof set.rir !== 'number' || isNaN(set.rir) || set.rir < 0 || set.rir > 10) {
      errors.push('Set RIR must be a number between 0 and 10');
    }
  }

  if (set.painLevel !== undefined && set.painLevel !== null) {
    if (
      typeof set.painLevel !== 'number' ||
      !Number.isInteger(set.painLevel) ||
      set.painLevel < 0 ||
      set.painLevel > 5
    ) {
      errors.push('Set painLevel must be an integer between 0 and 5');
    }
  }

  if (set.durationSeconds !== undefined && set.durationSeconds !== null) {
    if (
      typeof set.durationSeconds !== 'number' ||
      isNaN(set.durationSeconds) ||
      set.durationSeconds < 0
    ) {
      errors.push('Set durationSeconds must be a number >= 0');
    }
  }

  if (set.distanceMeters !== undefined && set.distanceMeters !== null) {
    if (
      typeof set.distanceMeters !== 'number' ||
      isNaN(set.distanceMeters) ||
      set.distanceMeters < 0
    ) {
      errors.push('Set distanceMeters must be a number >= 0');
    }
  }

  if (set.restTargetSeconds !== undefined && set.restTargetSeconds !== null) {
    if (
      typeof set.restTargetSeconds !== 'number' ||
      isNaN(set.restTargetSeconds) ||
      set.restTargetSeconds < 0
    ) {
      errors.push('Set restTargetSeconds must be a number >= 0');
    }
  }

  if (set.restActualSeconds !== undefined && set.restActualSeconds !== null) {
    if (
      typeof set.restActualSeconds !== 'number' ||
      isNaN(set.restActualSeconds) ||
      set.restActualSeconds < 0
    ) {
      errors.push('Set restActualSeconds must be a number >= 0');
    }
  }

  if (set.tempo !== undefined && set.tempo !== null) {
    if (typeof set.tempo !== 'string') {
      errors.push('Set tempo must be a string');
    }
  }

  if (set.notes !== undefined && set.notes !== null) {
    if (typeof set.notes !== 'string') {
      errors.push('Set notes must be a string');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
