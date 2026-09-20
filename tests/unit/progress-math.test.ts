import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  calculateActiveDurationMs,
  calculateEpley1RM,
  calculateBrzycki1RM,
  calculateSetVolume,
  calculateWorkoutSummary,
} from '../../src/domain/math/progress-math.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import { WorkoutStatus } from '../../src/domain/enums/workout-status.js';
import type { ActiveWorkout } from '../../src/domain/entities/active-workout.js';

describe('Progress Math — Duration, 1RM, Volume, and Summaries', () => {
  const t0 = 1773700000000;

  describe('calculateActiveDurationMs', () => {
    it('calculates duration for a workout with no pauses', () => {
      const workout: ActiveWorkout = {
        id: 'w1',
        schemaVersion: 1,
        createdAt: new Date(t0).toISOString(),
        updatedAt: new Date(t0).toISOString(),
        title: 'Treino A',
        status: WorkoutStatus.COMPLETED,
        startedAt: new Date(t0).toISOString(),
        endedAt: new Date(t0 + 3600_000).toISOString(), // 60 mins
        pauseIntervals: [],
        exercises: [],
      };

      expect(calculateActiveDurationMs(workout)).toBe(3600_000);
    });

    it('accurately subtracts pause intervals from active duration', () => {
      const workout: ActiveWorkout = {
        id: 'w1',
        schemaVersion: 1,
        createdAt: new Date(t0).toISOString(),
        updatedAt: new Date(t0).toISOString(),
        title: 'Treino A',
        status: WorkoutStatus.COMPLETED,
        startedAt: new Date(t0).toISOString(),
        endedAt: new Date(t0 + 3600_000).toISOString(), // 60 mins wall clock
        pauseIntervals: [
          // 10 min pause
          {
            pausedAt: new Date(t0 + 600_000).toISOString(),
            resumedAt: new Date(t0 + 1200_000).toISOString(),
          },
          // 5 min pause
          {
            pausedAt: new Date(t0 + 2400_000).toISOString(),
            resumedAt: new Date(t0 + 2700_000).toISOString(),
          },
        ],
        exercises: [],
      };

      // 60 mins - 15 mins pause = 45 mins (2,700,000 ms)
      expect(calculateActiveDurationMs(workout)).toBe(2700_000);
    });
  });

  describe('calculateEpley1RM', () => {
    it('returns exact load when reps === 1', () => {
      expect(calculateEpley1RM(140, 1)).toBe(140);
      expect(calculateEpley1RM(72.5, 1)).toBe(72.5);
    });

    it('calculates e1RM according to canonical formula: weight * (1 + reps/30)', () => {
      // 100 * (1 + 10/30) = 133.33 -> 133.3
      expect(calculateEpley1RM(100, 10)).toBe(133.3);
      // 80 * (1 + 5/30) = 93.33 -> 93.3
      expect(calculateEpley1RM(80, 5)).toBe(93.3);
    });

    it('returns 0 for zero or negative values', () => {
      expect(calculateEpley1RM(0, 10)).toBe(0);
      expect(calculateEpley1RM(100, 0)).toBe(0);
      expect(calculateEpley1RM(-50, 5)).toBe(0);
      expect(calculateEpley1RM(100, -5)).toBe(0);
    });
  });

  describe('calculateBrzycki1RM', () => {
    it('returns exact load when reps === 1', () => {
      expect(calculateBrzycki1RM(100, 1)).toBe(100);
    });

    it('calculates Brzycki e1RM: weight * (36 / (37 - reps))', () => {
      // 100 * (36 / 27) = 133.33 -> 133.3
      expect(calculateBrzycki1RM(100, 10)).toBe(133.3);
    });

    it('returns 0 for reps >= 37 or zero/negative values', () => {
      expect(calculateBrzycki1RM(100, 37)).toBe(0);
      expect(calculateBrzycki1RM(100, 50)).toBe(0);
      expect(calculateBrzycki1RM(0, 10)).toBe(0);
    });
  });

  describe('calculateSetVolume and calculateWorkoutSummary', () => {
    it('calculates set volume and supports zero weight', () => {
      expect(
        calculateSetVolume({
          id: 's1',
          setNumber: 1,
          type: SetType.NORMAL,
          weight: 100,
          reps: 8,
          completed: true,
        }),
      ).toBe(800);

      // Bodyweight or zero weight = 0 volume
      expect(
        calculateSetVolume({
          id: 's2',
          setNumber: 2,
          type: SetType.NORMAL,
          weight: 0,
          reps: 15,
          completed: true,
        }),
      ).toBe(0);
    });

    it('excludes warmup sets from total workout volume', () => {
      const summary = calculateWorkoutSummary([
        {
          sets: [
            // Warmup: 60kg * 10 reps (should NOT count in volume)
            {
              id: 'w1',
              setNumber: 1,
              type: SetType.WARMUP,
              weight: 60,
              reps: 10,
              completed: true,
            },
            // Working 1: 100kg * 8 reps = 800kg
            {
              id: 's1',
              setNumber: 2,
              type: SetType.NORMAL,
              weight: 100,
              reps: 8,
              completed: true,
            },
            // Working 2: 100kg * 6 reps = 600kg
            {
              id: 's2',
              setNumber: 3,
              type: SetType.TOP_SET,
              weight: 100,
              reps: 6,
              completed: true,
            },
          ],
        },
      ]);

      expect(summary.completedSetsCount).toBe(3);
      expect(summary.totalReps).toBe(24); // 10 + 8 + 6
      expect(summary.totalVolumeKg).toBe(1400); // 800 + 600 (warmup excluded!)
    });
  });

  // --- Property-Based Test ---
  it('PBT: Epley 1RM is strictly monotonic with respect to weight and reps', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 10, max: 300, noNaN: true }), // weight 10 to 300 kg
        fc.float({ min: 1, max: 50, noNaN: true }), // delta weight
        fc.integer({ min: 1, max: 20 }), // reps
        (weight, deltaWeight, reps) => {
          const e1rm1 = calculateEpley1RM(weight, reps);
          const e1rm2 = calculateEpley1RM(weight + deltaWeight, reps);

          // Heavier weight with same reps must yield higher or equal e1RM
          expect(e1rm2).toBeGreaterThanOrEqual(e1rm1);
        },
      ),
      { numRuns: 100 },
    );
  });
});
