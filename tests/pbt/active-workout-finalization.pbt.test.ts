import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { createTestDatabase } from '../helpers/test-db.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { ActiveWorkoutService } from '../../src/services/active-workout-service.js';
import { WorkoutStatus } from '../../src/domain/enums/workout-status.js';

describe('PBT 6: Active Workout Finalization Idempotency (REQ-4)', () => {
  let db: IndexedDBTitaDatabase;
  let service: ActiveWorkoutService;

  beforeEach(async () => {
    db = createTestDatabase(`test-pbt-finalization-${Date.now()}-${Math.random()}`);
    await db.open();
    service = new ActiveWorkoutService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('finalizing a workout multiple times (retries) returns identical snapshot without duplicating records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 40 }),
          reps: fc.integer({ min: 1, max: 30 }),
          weight: fc.float({ min: 1, max: 300, noNaN: true }),
          retries: fc.integer({ min: 1, max: 4 }),
        }),
        async ({ title, reps, weight, retries }) => {
          const startRes = await service.startWorkout({ title });
          if (startRes.type !== 'started') throw new Error('Failed to start workout');
          const workoutId = startRes.workout.id;

          const withEx = await service.addExercise(workoutId, {
            exerciseId: 'ex-pbt',
            exerciseName: 'Exercise PBT',
            initialSetsCount: 1,
          });

          await service.updateSet(
            workoutId,
            withEx.exercises[0]!.id,
            withEx.exercises[0]!.sets[0]!.id,
            { weight, reps, completed: true },
          );

          // Initial finalization
          const firstSnapshot = await service.finalizeWorkout(workoutId);
          expect(firstSnapshot).toBeDefined();
          expect(firstSnapshot.sourceWorkoutId).toBe(workoutId);
          expect(firstSnapshot.completedSetsCount).toBe(1);

          // Repeated finalization attempts (retries)
          for (let i = 0; i < retries; i++) {
            const retrySnapshot = await service.finalizeWorkout(workoutId);
            expect(retrySnapshot.id).toBe(firstSnapshot.id);
            expect(retrySnapshot.completedAt).toBe(firstSnapshot.completedAt);
            expect(retrySnapshot.totalVolumeKg).toBe(firstSnapshot.totalVolumeKg);
            expect(retrySnapshot.totalReps).toBe(firstSnapshot.totalReps);
          }

          // Verify total snapshot records in DB is exactly 1
          const allSnapshots = await db.transaction(
            ['workoutSnapshots'],
            'readonly',
            async (tx) => {
              return tx.getStore('workoutSnapshots').getAll();
            },
          );
          expect(allSnapshots).toHaveLength(1);

          // Verify active workout status is COMPLETED
          const workoutInDb = await service.getWorkoutById(workoutId);
          expect(workoutInDb?.status).toBe(WorkoutStatus.COMPLETED);

          // Cleanup for next iteration
          await db.transaction(['activeWorkouts', 'workoutSnapshots'], 'readwrite', async (tx) => {
            await tx.getStore('activeWorkouts').clear();
            await tx.getStore('workoutSnapshots').clear();
          });
        },
      ),
      { numRuns: 20 },
    );
  });
});
