import { describe, it, expect } from 'vitest';
import { SEED_EXERCISES } from '../../src/data/seed-exercises.js';
import { validateExercise } from '../../src/domain/validators/exercise-validator.js';
import { isValidId } from '../../src/domain/common/id.js';

describe('Seed Exercises Dataset (Task 6.1)', () => {
  it('contains at least 40 canonical exercises', () => {
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(40);
  });

  it('all seed exercises pass domain validator validateExercise', () => {
    for (const ex of SEED_EXERCISES) {
      const result = validateExercise(ex);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    }
  });

  it('all seed exercises have valid Stable_ID (UUIDv4) and unique IDs', () => {
    const idSet = new Set<string>();
    for (const ex of SEED_EXERCISES) {
      expect(isValidId(ex.id)).toBe(true);
      expect(idSet.has(ex.id)).toBe(false);
      idSet.add(ex.id);
    }
    expect(idSet.size).toBe(SEED_EXERCISES.length);
  });

  it('all seed exercises have unique names', () => {
    const nameSet = new Set<string>();
    for (const ex of SEED_EXERCISES) {
      const lower = ex.name.toLowerCase().trim();
      expect(nameSet.has(lower)).toBe(false);
      nameSet.add(lower);
    }
  });

  it('all seed exercises have source === "system"', () => {
    for (const ex of SEED_EXERCISES) {
      expect(ex.source).toBe('system');
    }
  });

  it('all seed exercises have roles defined and non-empty instructions', () => {
    for (const ex of SEED_EXERCISES) {
      expect(ex.roles.length).toBeGreaterThan(0);
      expect(ex.instructions.length).toBeGreaterThan(0);
      expect(ex.defaultRestSeconds).toBeGreaterThan(0);
    }
  });
});
