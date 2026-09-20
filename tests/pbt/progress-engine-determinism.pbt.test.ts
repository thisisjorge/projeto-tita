import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ProgressEngine } from '../../src/domain/analytics/progress-engine.js';
import type { WorkoutSnapshot } from '../../src/domain/entities/workout-snapshot.js';
import { SetType } from '../../src/domain/enums/set-type.js';

describe('PBT 10: Progress Engine Determinism', () => {
  const setArb = fc.record({
    id: fc.stringMatching(/^[a-z0-9_-]{1,16}$/),
    setNumber: fc.integer({ min: 1, max: 10 }),
    type: fc.constant(SetType.NORMAL),
    weight: fc.integer({ min: 1, max: 200 }),
    reps: fc.integer({ min: 1, max: 20 }),
    completed: fc.constant(true),
    completedAt: fc.constant('2026-09-01T10:00:00.000Z'),
  });

  const exerciseArb = fc.record({
    exerciseId: fc.constantFrom('ex_squat', 'ex_bench', 'ex_deadlift'),
    exerciseName: fc.constant('Compound Lift'),
    sets: fc.array(setArb, { minLength: 1, maxLength: 5 }),
    totalVolumeKg: fc.nat(10000),
    totalReps: fc.nat(100),
  });

  const snapshotArb = fc.record({
    id: fc.stringMatching(/^[a-z0-9_-]{1,16}$/),
    schemaVersion: fc.constant(1),
    sourceWorkoutId: fc.string(),
    title: fc.string(),
    startedAt: fc.constant('2026-09-01T09:00:00.000Z'),
    completedAt: fc
      .integer({
        min: 1735689600000, // 2025-01-01T00:00:00.000Z
        max: 1798761600000, // 2027-01-01T00:00:00.000Z
      })
      .map((ms) => new Date(ms).toISOString()),
    activeDurationMs: fc.nat(7200000),
    totalDurationMs: fc.nat(7200000),
    exercises: fc.array(exerciseArb, { minLength: 1, maxLength: 3 }),
    totalVolumeKg: fc.nat(50000),
    totalReps: fc.nat(500),
    completedSetsCount: fc.nat(50),
    revision: fc.constant(1),
  }) as unknown as fc.Arbitrary<WorkoutSnapshot>;

  it('produces identical global metrics and exercise progress when evaluated repeatedly', () => {
    fc.assert(
      fc.property(
        fc.array(snapshotArb, { minLength: 0, maxLength: 20 }),
        fc.constantFrom('ex_squat', 'ex_bench', 'ex_deadlift'),
        (snapshots, targetExerciseId) => {
          // Freeze inputs to verify no mutation occurred
          const clonedSnapshots = JSON.parse(JSON.stringify(snapshots));

          // Run evaluation 1
          const globalResult1 = ProgressEngine.calculateGlobalMetrics(snapshots);
          const exerciseResult1 = ProgressEngine.extractExerciseProgress(
            snapshots,
            targetExerciseId,
          );
          const monthGroups1 = ProgressEngine.groupSnapshotsByMonth(snapshots);

          // Run evaluation 2
          const globalResult2 = ProgressEngine.calculateGlobalMetrics(snapshots);
          const exerciseResult2 = ProgressEngine.extractExerciseProgress(
            snapshots,
            targetExerciseId,
          );
          const monthGroups2 = ProgressEngine.groupSnapshotsByMonth(snapshots);

          // Asserts deep equality: same inputs produce 100% identical outputs
          expect(globalResult1).toEqual(globalResult2);
          expect(exerciseResult1).toEqual(exerciseResult2);
          expect(monthGroups1).toEqual(monthGroups2);

          // Asserts input was not mutated
          expect(snapshots).toEqual(clonedSnapshots);
        },
      ),
      { numRuns: 100 },
    );
  });
});
