import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createTestDatabase } from '../helpers/test-db.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { ActiveWorkoutService } from '../../src/services/active-workout-service.js';

describe('PBT 7: Set Completion Uniqueness (REQ-4)', () => {
  let db: IndexedDBTitaDatabase;
  let service: ActiveWorkoutService;

  beforeEach(async () => {
    db = createTestDatabase(`test-pbt-completion-${Date.now()}-${Math.random()}`);
    await db.open();
    service = new ActiveWorkoutService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('preserves the unique initial completedAt across arbitrary subsequent edits', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          initialWeight: fc.float({ min: 0, max: 200, noNaN: true }),
          initialReps: fc.integer({ min: 1, max: 20 }),
          initialCompletionMs: fc.integer({ min: 1000000, max: 2000000 }),
          edits: fc.array(
            fc.record({
              weight: fc.float({ min: 0, max: 250, noNaN: true }),
              reps: fc.integer({ min: 0, max: 30 }),
              editTimeDeltaMs: fc.integer({ min: 1000, max: 60000 }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
        }),
        async ({ initialWeight, initialReps, initialCompletionMs, edits }) => {
          const startRes = await service.startWorkout({ nowMs: initialCompletionMs - 10000 });
          if (startRes.type !== 'started') throw new Error('Start failed');
          const workoutId = startRes.workout.id;

          const withEx = await service.addExercise(workoutId, {
            exerciseId: 'ex-completion-pbt',
            exerciseName: 'PBT Press',
            initialSetsCount: 1,
          });

          const exId = withEx.exercises[0]!.id;
          const setId = withEx.exercises[0]!.sets[0]!.id;

          // Initial set completion
          const completedWorkout = await service.updateSet(
            workoutId,
            exId,
            setId,
            { weight: initialWeight, reps: initialReps, completed: true },
            initialCompletionMs,
          );

          const initialCompletedAt = completedWorkout.exercises[0]?.sets[0]?.completedAt;
          expect(initialCompletedAt).toBe(new Date(initialCompletionMs).toISOString());

          // Apply arbitrary subsequent updates at future times without changing completed: true
          let currentTime = initialCompletionMs;
          for (const edit of edits) {
            currentTime += edit.editTimeDeltaMs;
            const updatedWorkout = await service.updateSet(
              workoutId,
              exId,
              setId,
              { weight: edit.weight, reps: edit.reps },
              currentTime,
            );

            // Invariant: completedAt must remain completely unchanged
            const setAfterEdit = updatedWorkout.exercises[0]?.sets[0];
            expect(setAfterEdit?.completed).toBe(true);
            expect(setAfterEdit?.completedAt).toBe(initialCompletedAt);
          }

          // Cleanup for next iteration
          await db.transaction(['activeWorkouts'], 'readwrite', async (tx) => {
            await tx.getStore('activeWorkouts').clear();
          });
        },
      ),
      { numRuns: 20 },
    );
  });
});
