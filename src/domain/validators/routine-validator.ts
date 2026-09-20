import type { ValidationResult } from '../common/types.js';
import type { Routine } from '../entities/routine.js';

/**
 * Validates a Routine entity and its nested exercise slots.
 * Pure function with zero I/O side-effects.
 */
export function validateRoutine(routine: Partial<Routine>): ValidationResult {
  const errors: string[] = [];

  if (!routine.id || typeof routine.id !== 'string' || routine.id.trim().length === 0) {
    errors.push('Routine id is required and must be a non-empty string');
  }

  if (!routine.name || typeof routine.name !== 'string' || routine.name.trim().length === 0) {
    errors.push('Routine name is required and must be a non-empty string');
  }

  if (!routine.exercises || !Array.isArray(routine.exercises)) {
    errors.push('Routine exercises must be an array');
  } else {
    const slotIds = new Set<string>();

    for (let i = 0; i < routine.exercises.length; i++) {
      const slot = routine.exercises[i]!;
      if (!slot.id || typeof slot.id !== 'string') {
        errors.push(`Exercise slot at index ${i} missing valid id`);
      } else if (slotIds.has(slot.id)) {
        errors.push(`Duplicate exercise slot id '${slot.id}' in routine`);
      } else {
        slotIds.add(slot.id);
      }

      if (!slot.exerciseId || typeof slot.exerciseId !== 'string') {
        errors.push(`Exercise slot at index ${i} missing valid exerciseId`);
      }

      if (!slot.sets || !Array.isArray(slot.sets) || slot.sets.length === 0) {
        errors.push(`Exercise slot at index ${i} must have at least one set template`);
      }
    }

    // Validate groups refer to existing slot IDs
    if (routine.groups && Array.isArray(routine.groups)) {
      for (let g = 0; g < routine.groups.length; g++) {
        const group = routine.groups[g]!;
        if (!group.id || typeof group.id !== 'string') {
          errors.push(`Group at index ${g} missing valid id`);
        }
        if (!group.exerciseSlotIds || group.exerciseSlotIds.length < 2) {
          errors.push(`Group '${group.id || g}' must reference at least 2 exercise slots`);
        } else {
          for (const slotId of group.exerciseSlotIds) {
            if (!slotIds.has(slotId)) {
              errors.push(`Group '${group.id}' references unknown exercise slot '${slotId}'`);
            }
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
