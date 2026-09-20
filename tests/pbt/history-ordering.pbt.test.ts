import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ProgressEngine } from '../../src/domain/analytics/progress-engine.js';
import type { WorkoutSnapshot } from '../../src/domain/entities/workout-snapshot.js';

describe('PBT 9: History Ordering Determinism', () => {
  it('strictly orders snapshots by completedAt descending with stable ID tiebreak', () => {
    // Generate arbitrary snapshots with varying timestamps and IDs
    const snapshotArb = fc.record({
      id: fc.stringMatching(/^[a-z0-9_-]{1,16}$/),
      schemaVersion: fc.constant(1),
      sourceWorkoutId: fc.string(),
      title: fc.string(),
      startedAt: fc.constant('2026-09-01T10:00:00.000Z'),
      completedAt: fc
        .integer({
          min: 1735689600000, // 2025-01-01T00:00:00.000Z
          max: 1798761600000, // 2027-01-01T00:00:00.000Z
        })
        .map((ms) => new Date(ms).toISOString()),
      activeDurationMs: fc.nat(7200000),
      totalDurationMs: fc.nat(7200000),
      exercises: fc.constant([]),
      totalVolumeKg: fc.nat(50000),
      totalReps: fc.nat(500),
      completedSetsCount: fc.nat(50),
      revision: fc.constant(1),
    }) as fc.Arbitrary<WorkoutSnapshot>;

    fc.assert(
      fc.property(fc.array(snapshotArb, { minLength: 0, maxLength: 50 }), (snapshots) => {
        const sorted = ProgressEngine.sortSnapshots(snapshots, 'desc');

        // 1. Length must be preserved
        expect(sorted).toHaveLength(snapshots.length);

        // 2. Ordering invariant check
        for (let i = 0; i < sorted.length - 1; i++) {
          const current = sorted[i];
          const next = sorted[i + 1];

          const timeCurrent = Date.parse(current.completedAt);
          const timeNext = Date.parse(next.completedAt);

          if (timeCurrent === timeNext) {
            // Tiebreak: ID must be descending
            expect(current.id.localeCompare(next.id)).toBeGreaterThanOrEqual(0);
          } else {
            // Primary: timestamp must be descending
            expect(timeCurrent).toBeGreaterThanOrEqual(timeNext);
          }
        }

        // 3. Sorting must be idempotent
        const sortedAgain = ProgressEngine.sortSnapshots(sorted, 'desc');
        expect(sortedAgain.map((s) => s.id)).toEqual(sorted.map((s) => s.id));
      }),
      { numRuns: 100 },
    );
  });
});
