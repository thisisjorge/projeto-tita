import type { ValidationResult } from '../common/types.js';
import type { Exercise } from '../entities/exercise.js';

/**
 * Validates an Exercise entity.
 * Pure function with zero I/O side-effects.
 */
export function validateExercise(exercise: Partial<Exercise>): ValidationResult {
  const errors: string[] = [];

  if (!exercise.id || typeof exercise.id !== 'string' || exercise.id.trim().length === 0) {
    errors.push('Exercise id is required and must be a non-empty string');
  }

  if (!exercise.name || typeof exercise.name !== 'string' || exercise.name.trim().length === 0) {
    errors.push('Exercise name is required and must be a non-empty string');
  }

  if (
    !exercise.primaryMuscle ||
    typeof exercise.primaryMuscle !== 'string' ||
    exercise.primaryMuscle.trim().length === 0
  ) {
    errors.push('Exercise primaryMuscle is required');
  }

  if (
    !exercise.equipment ||
    typeof exercise.equipment !== 'string' ||
    exercise.equipment.trim().length === 0
  ) {
    errors.push('Exercise equipment is required');
  }

  if (exercise.increment !== undefined && exercise.increment !== null) {
    if (
      typeof exercise.increment !== 'number' ||
      isNaN(exercise.increment) ||
      exercise.increment <= 0
    ) {
      errors.push('Exercise increment must be a positive number > 0');
    }
  }

  if (exercise.defaultRestSeconds !== undefined && exercise.defaultRestSeconds !== null) {
    if (
      typeof exercise.defaultRestSeconds !== 'number' ||
      isNaN(exercise.defaultRestSeconds) ||
      exercise.defaultRestSeconds <= 0
    ) {
      errors.push('Exercise defaultRestSeconds must be a positive number > 0');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
