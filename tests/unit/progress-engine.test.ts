import { describe, it, expect } from 'vitest';
import { ProgressEngine } from '../../src/domain/analytics/progress-engine.js';
import type { WorkoutSnapshot } from '../../src/domain/entities/workout-snapshot.js';
import { SetType } from '../../src/domain/enums/set-type.js';

function makeSnapshot(
  id: string,
  completedAt: string,
  totalVolumeKg: number,
  exercises: {
    exerciseId: string;
    exerciseName: string;
    sets: { weight: number; reps: number; type?: SetType }[];
  }[],
): WorkoutSnapshot {
  return {
    id,
    schemaVersion: 1,
    sourceWorkoutId: `w_${id}`,
    title: `Treino ${id}`,
    startedAt: new Date(Date.parse(completedAt) - 3600000).toISOString(),
    completedAt,
    activeDurationMs: 3000000,
    totalDurationMs: 3600000,
    exercises: exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      sets: ex.sets.map((s, idx) => ({
        id: `set_${id}_${ex.exerciseId}_${idx}`,
        setNumber: idx + 1,
        type: s.type ?? SetType.NORMAL,
        weight: s.weight,
        reps: s.reps,
        completed: true,
        completedAt,
      })),
      totalVolumeKg: ex.sets.reduce((acc, s) => acc + s.weight * s.reps, 0),
      totalReps: ex.sets.reduce((acc, s) => acc + s.reps, 0),
    })),
    totalVolumeKg,
    totalReps: exercises.reduce(
      (acc, ex) => acc + ex.sets.reduce((sAcc, s) => sAcc + s.reps, 0),
      0,
    ),
    completedSetsCount: exercises.reduce((acc, ex) => acc + ex.sets.length, 0),
    revision: 1,
  };
}

describe('ProgressEngine (Pure Domain Analytics)', () => {
  it('handles empty snapshots safely without throwing or returning NaN', () => {
    const metrics = ProgressEngine.calculateGlobalMetrics([]);
    expect(metrics.totalWorkouts).toBe(0);
    expect(metrics.totalVolumeKg).toBe(0);
    expect(metrics.averageDurationMinutes).toBe(0);
    expect(metrics.weeklyFrequency).toBe(0);
    expect(metrics.totalPRsCount).toBe(0);

    const exerciseProgress = ProgressEngine.extractExerciseProgress([], 'ex-1');
    expect(exerciseProgress.totalSessions).toBe(0);
    expect(exerciseProgress.historyPoints).toHaveLength(0);
    expect(exerciseProgress.personalBests.heaviestWeightKg).toBe(0);

    const groups = ProgressEngine.groupSnapshotsByMonth([]);
    expect(groups).toHaveLength(0);

    const paged = ProgressEngine.paginateSnapshots([], 1, 10);
    expect(paged.items).toHaveLength(0);
    expect(paged.totalItems).toBe(0);
    expect(paged.totalPages).toBe(1);
  });

  it('calculates global metrics for multiple snapshots correctly', () => {
    const s1 = makeSnapshot('s1', '2026-09-01T10:00:00.000Z', 2000, [
      {
        exerciseId: 'bench',
        exerciseName: 'Supino Reto',
        sets: [
          { weight: 80, reps: 8 },
          { weight: 80, reps: 8 },
        ],
      },
    ]);
    const s2 = makeSnapshot('s2', '2026-09-08T10:00:00.000Z', 3000, [
      {
        exerciseId: 'bench',
        exerciseName: 'Supino Reto',
        sets: [
          { weight: 85, reps: 8 },
          { weight: 85, reps: 8 },
        ],
      },
    ]);

    const metrics = ProgressEngine.calculateGlobalMetrics([s1, s2]);
    expect(metrics.totalWorkouts).toBe(2);
    expect(metrics.totalVolumeKg).toBe(5000);
    expect(metrics.totalSets).toBe(4);
    expect(metrics.totalReps).toBe(32);
    expect(metrics.averageDurationMinutes).toBe(50); // 3,000,000 ms = 50 min
    expect(metrics.weeklyFrequency).toBeGreaterThan(0);
  });

  it('detects progressive personal records (PRs) accurately across sessions', () => {
    // Session 1: 80 kg for 8 reps
    const s1 = makeSnapshot('s1', '2026-09-01T10:00:00.000Z', 1280, [
      {
        exerciseId: 'bench',
        exerciseName: 'Supino Reto',
        sets: [{ weight: 80, reps: 8 }],
      },
    ]);

    // Session 2: 85 kg for 8 reps (New heaviest weight, e1RM, set volume)
    const s2 = makeSnapshot('s2', '2026-09-08T10:00:00.000Z', 1360, [
      {
        exerciseId: 'bench',
        exerciseName: 'Supino Reto',
        sets: [{ weight: 85, reps: 8 }],
      },
    ]);

    // Session 3: 85 kg for 10 reps (Same weight, but new most reps, e1RM, set volume)
    const s3 = makeSnapshot('s3', '2026-09-15T10:00:00.000Z', 1700, [
      {
        exerciseId: 'bench',
        exerciseName: 'Supino Reto',
        sets: [{ weight: 85, reps: 10 }],
      },
    ]);

    const progress = ProgressEngine.extractExerciseProgress([s1, s2, s3], 'bench');

    expect(progress.totalSessions).toBe(3);
    expect(progress.personalBests.heaviestWeightKg).toBe(85);
    expect(progress.personalBests.heaviestWeightDate).toBe('2026-09-08T10:00:00.000Z');
    expect(progress.personalBests.mostRepsAtWeight?.reps).toBe(10);
    expect(progress.personalBests.mostRepsAtWeight?.weightKg).toBe(85);

    // Verify session 1 achieved initial baseline PRs
    expect(progress.historyPoints[0].isPR).toBe(true);
    // Verify session 2 broke heaviest weight
    expect(progress.historyPoints[1].prCategories).toContain('HEAVIEST_WEIGHT');
    // Verify session 3 broke most reps at weight
    expect(progress.historyPoints[2].prCategories).toContain('MOST_REPS_AT_WEIGHT');
  });

  it('filters snapshots by date range accurately', () => {
    const s1 = makeSnapshot('s1', '2026-08-15T10:00:00.000Z', 1000, []);
    const s2 = makeSnapshot('s2', '2026-09-01T10:00:00.000Z', 2000, []);
    const s3 = makeSnapshot('s3', '2026-09-15T10:00:00.000Z', 3000, []);

    const filtered = ProgressEngine.filterByDateRange([s1, s2, s3], {
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-30T23:59:59.999Z',
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map((s) => s.id)).toEqual(['s2', 's3']);
  });

  it('groups snapshots by month in descending order', () => {
    const s1 = makeSnapshot('s1', '2026-07-20T10:00:00.000Z', 1000, []);
    const s2 = makeSnapshot('s2', '2026-08-10T10:00:00.000Z', 2000, []);
    const s3 = makeSnapshot('s3', '2026-08-25T10:00:00.000Z', 2000, []);
    const s4 = makeSnapshot('s4', '2026-09-05T10:00:00.000Z', 3000, []);

    const groups = ProgressEngine.groupSnapshotsByMonth([s1, s2, s3, s4]);

    expect(groups).toHaveLength(3);
    expect(groups[0].monthKey).toBe('2026-09');
    expect(groups[0].snapshots).toHaveLength(1);
    expect(groups[1].monthKey).toBe('2026-08');
    expect(groups[1].snapshots).toHaveLength(2);
    expect(groups[2].monthKey).toBe('2026-07');
    expect(groups[2].snapshots).toHaveLength(1);
  });

  it('paginates snapshots cleanly with boundary protection', () => {
    const snapshots = Array.from({ length: 25 }, (_, i) =>
      makeSnapshot(`s_${i}`, new Date(2026, 8, i + 1).toISOString(), 1000, []),
    );

    const p1 = ProgressEngine.paginateSnapshots(snapshots, 1, 10);
    expect(p1.items).toHaveLength(10);
    expect(p1.totalPages).toBe(3);
    expect(p1.page).toBe(1);

    const p3 = ProgressEngine.paginateSnapshots(snapshots, 3, 10);
    expect(p3.items).toHaveLength(5);
    expect(p3.page).toBe(3);

    // Overflow page defaults to max page
    const pOverflow = ProgressEngine.paginateSnapshots(snapshots, 99, 10);
    expect(pOverflow.page).toBe(3);
    expect(pOverflow.items).toHaveLength(5);
  });
});
