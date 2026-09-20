import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createTestDatabase } from '../helpers/test-db.js';
import { IdbExerciseRepository } from '../../src/repositories/indexeddb/idb-exercise-repository.js';
import { IdbRoutineRepository } from '../../src/repositories/indexeddb/idb-routine-repository.js';

describe('PBT 4: Recovery Snapshot and Rollback Exactness', () => {
  it('restores the exact database state after arbitrary destructive mutations', async () => {
    const initialExercisesArbitrary = fc.array(
      fc.record({
        id: fc.stringMatching(/^[a-z0-9_]{3,8}$/).map((s) => `ex_${s}`),
        schemaVersion: fc.constant(1),
        name: fc.stringMatching(/^[A-Za-z ]{3,12}$/),
        aliases: fc.constant([]),
        primaryMuscle: fc.constant('Legs'),
        secondaryMuscles: fc.constant([]),
        equipment: fc.constant('Dumbbell'),
        category: fc.constant('Strength'),
        instructions: fc.constant([]),
        source: fc.constant('custom' as const),
        roles: fc.constant([]),
        createdAt: fc.constant('2026-09-17T12:00:00.000Z'),
        updatedAt: fc.constant('2026-09-17T12:00:00.000Z'),
      }),
      { minLength: 1, maxLength: 4 },
    );

    await fc.assert(
      fc.asyncProperty(initialExercisesArbitrary, async (rawExercises) => {
        const db = createTestDatabase();
        try {
          await db.open();
          const exRepo = new IdbExerciseRepository(db);
          const rtRepo = new IdbRoutineRepository(db);

          const exercises = Array.from(new Map(rawExercises.map((e) => [e.id, e])).values());
          await exRepo.saveMany(exercises);

          // 1. Capture snapshot of state A
          const snapshot = await db.createRecoverySnapshot('manual', 'PBT snapshot');

          // 2. Perform destructive mutations: clear exercises, add junk routines
          for (const ex of exercises) {
            await exRepo.delete(ex.id);
          }
          await rtRepo.save({
            id: 'rt_junk',
            schemaVersion: 1,
            name: 'Junk Routine',
            exercises: [],
            createdAt: '2026-09-17T12:00:00.000Z',
            updatedAt: '2026-09-17T12:00:00.000Z',
          });

          // Verify state was indeed mutated
          const duringMutation = await exRepo.getAll();
          expect(duringMutation.length).toBe(0);

          // 3. Rollback to snapshot
          await db.restoreSnapshot(snapshot.id);

          // 4. Invariant: Exact restoration of State A
          const restoredExercises = await exRepo.getAll();
          expect(restoredExercises.length).toBe(exercises.length);
          expect(restoredExercises.map((e) => e.id).sort()).toEqual(
            exercises.map((e) => e.id).sort(),
          );

          // Junk routine must be completely gone
          const junk = await rtRepo.getById('rt_junk');
          expect(junk).toBeNull();
        } finally {
          db.close();
        }
      }),
      { numRuns: 10 },
    );
  });
});
