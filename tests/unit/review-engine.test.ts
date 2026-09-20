import { describe, it, expect } from 'vitest';
import { ReviewEngine } from '../../src/domain/analytics/review-engine.js';
import type { WorkoutSnapshot } from '../../src/domain/entities/workout-snapshot.js';
import { SetType } from '../../src/domain/enums/set-type.js';

describe('ReviewEngine (Deterministic Weekly & Monthly Analytics)', () => {
  const createMockSnapshot = (
    id: string,
    completedAt: string,
    exercises: { id: string; name: string; weight: number; reps: number }[],
  ): WorkoutSnapshot => {
    let totalVolume = 0;
    let totalReps = 0;
    let completedSetsCount = 0;

    const snapshotExercises = exercises.map((e, idx) => {
      const sets = [
        {
          id: `${id}_ex${idx}_s1`,
          setNumber: 1,
          type: SetType.NORMAL,
          weight: e.weight,
          reps: e.reps,
          completed: true,
          completedAt,
        },
        {
          id: `${id}_ex${idx}_s2`,
          setNumber: 2,
          type: SetType.NORMAL,
          weight: e.weight,
          reps: e.reps,
          completed: true,
          completedAt,
        },
      ];
      const vol = e.weight * e.reps * 2;
      totalVolume += vol;
      totalReps += e.reps * 2;
      completedSetsCount += 2;

      return {
        exerciseId: e.id,
        exerciseName: e.name,
        sets,
        totalVolumeKg: vol,
        totalReps: e.reps * 2,
      };
    });

    return {
      id,
      schemaVersion: 1,
      sourceWorkoutId: 'source_' + id,
      title: 'Treino A',
      startedAt: completedAt,
      completedAt,
      activeDurationMs: 3600000, // 60 min
      totalDurationMs: 3600000,
      exercises: snapshotExercises,
      totalVolumeKg: totalVolume,
      totalReps,
      completedSetsCount,
      revision: 1,
    };
  };

  it('generates a complete WeeklyReview with volume, muscle distribution, PRs and week comparison', () => {
    // Week 38 of 2026: Monday 2026-09-14 to Sunday 2026-09-20
    // Previous week 37: Monday 2026-09-07 to Sunday 2026-09-13
    const prevWeekSnapshot = createMockSnapshot('w_prev', '2026-09-09T10:00:00.000Z', [
      { id: 'ex_bench', name: 'Supino Reto com Barra', weight: 80, reps: 10 },
      { id: 'ex_pullup', name: 'Puxada Alta na Barra', weight: 60, reps: 10 },
    ]);

    const curWeekSnapshot1 = createMockSnapshot('w_cur1', '2026-09-16T10:00:00.000Z', [
      { id: 'ex_bench', name: 'Supino Reto com Barra', weight: 90, reps: 8 }, // PR vs prev week
      { id: 'ex_pullup', name: 'Puxada Alta na Barra', weight: 65, reps: 10 },
    ]);

    const curWeekSnapshot2 = createMockSnapshot('w_cur2', '2026-09-18T10:00:00.000Z', [
      { id: 'ex_squat', name: 'Agachamento Livre com Barra', weight: 110, reps: 8 },
    ]);

    const all = [prevWeekSnapshot, curWeekSnapshot1, curWeekSnapshot2];

    const review = ReviewEngine.generateWeeklyReview(all, '2026-09-16T10:00:00.000Z');

    expect(review.weekKey).toBe('2026-W38');
    expect(review.totalWorkouts).toBe(2);
    expect(review.totalWorkingSets).toBe(6); // 2 sets * (2 + 1) exercises
    expect(review.totalVolumeKg).toBeGreaterThan(0);
    expect(review.totalDurationMs).toBe(7200000); // 120 min

    // Muscle distribution
    expect(review.muscleDistribution.length).toBeGreaterThan(0);
    const peito = review.muscleDistribution.find((m) => m.muscle === 'Peito');
    expect(peito).toBeDefined();
    expect(peito?.sets).toBe(2);

    // Week comparison
    expect(review.comparisonWithPreviousWeek).not.toBeNull();
    expect(review.comparisonWithPreviousWeek?.previousCount).toBe(1);
    expect(review.comparisonWithPreviousWeek?.countDelta).toBe(1); // 2 - 1 = +1
    expect(review.comparisonWithPreviousWeek?.volumeDeltaPercent).toBeGreaterThan(0);

    // Exercise progression
    const benchProg = review.exerciseProgressions.find((p) => p.exerciseId === 'ex_bench');
    expect(benchProg).toBeDefined();
    expect(benchProg?.currentE1RM).toBeGreaterThan(benchProg?.previousE1RM ?? 0);
  });

  it('generates a complete MonthlyReview with consistency score, month-over-month comparison, and available months', () => {
    // August 2026
    const augSnapshot = createMockSnapshot('s_aug', '2026-08-15T10:00:00.000Z', [
      { id: 'ex_bench', name: 'Supino Reto com Barra', weight: 80, reps: 10 },
    ]);

    // September 2026
    const sepSnapshot1 = createMockSnapshot('s_sep1', '2026-09-05T10:00:00.000Z', [
      { id: 'ex_bench', name: 'Supino Reto com Barra', weight: 90, reps: 10 },
    ]);
    const sepSnapshot2 = createMockSnapshot('s_sep2', '2026-09-20T10:00:00.000Z', [
      { id: 'ex_bench', name: 'Supino Reto com Barra', weight: 95, reps: 8 },
    ]);

    const all = [augSnapshot, sepSnapshot1, sepSnapshot2];

    const review = ReviewEngine.generateMonthlyReview(all, '2026-09');

    expect(review.monthKey).toBe('2026-09');
    expect(review.monthLabel).toBe('Setembro de 2026');
    expect(review.totalSessions).toBe(2);
    expect(review.consistency.activeWeeksCount).toBe(2);
    expect(review.consistency.consistencyPercentage).toBeGreaterThan(0);

    // Month-over-month comparison
    expect(review.comparisonWithPreviousMonth).not.toBeNull();
    expect(review.comparisonWithPreviousMonth?.previousCount).toBe(1);
    expect(review.comparisonWithPreviousMonth?.countDelta).toBe(1);

    // Largest changes
    expect(review.largestChanges.length).toBeGreaterThan(0);
    expect(review.largestChanges[0].exerciseId).toBe('ex_bench');
    expect(review.largestChanges[0].direction).toBe('up');

    // Available months list
    const availableMonths = ReviewEngine.getAvailableMonths(all);
    expect(availableMonths).toHaveLength(2);
    expect(availableMonths[0].monthKey).toBe('2026-09');
    expect(availableMonths[1].monthKey).toBe('2026-08');
  });

  it('handles empty datasets cleanly without throwing or dividing by zero', () => {
    const review = ReviewEngine.generateWeeklyReview([], new Date('2026-09-17'));
    expect(review.totalWorkouts).toBe(0);
    expect(review.totalVolumeKg).toBe(0);
    expect(review.totalWorkingSets).toBe(0);
    expect(review.muscleDistribution).toHaveLength(0);
    expect(review.comparisonWithPreviousWeek).toBeNull();

    const monthlyReview = ReviewEngine.generateMonthlyReview([], '2026-09');
    expect(monthlyReview.totalSessions).toBe(0);
    expect(monthlyReview.weeklyFrequency).toBe(0);
    expect(monthlyReview.possiblePlateaus).toHaveLength(0);
  });
});
