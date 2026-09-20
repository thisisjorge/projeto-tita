import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { createTestDatabase } from '../helpers/test-db.js';
import type { TitaDatabase } from '../../src/repositories/interfaces/database.interface.js';
import { IdbWorkoutSnapshotRepository } from '../../src/repositories/indexeddb/idb-workout-repository.js';
import { HistoryService } from '../../src/services/history-service.js';
import type { WorkoutSnapshot } from '../../src/domain/entities/workout-snapshot.js';
import { SetType } from '../../src/domain/enums/set-type.js';

describe('Reviews & Plateau IDB Integration Tests', () => {
  let db: TitaDatabase;
  let snapshotRepo: IdbWorkoutSnapshotRepository;
  let historyService: HistoryService;

  beforeEach(async () => {
    db = await createTestDatabase(`test-reviews-idb-${Date.now()}`);
    snapshotRepo = new IdbWorkoutSnapshotRepository(db);
    historyService = new HistoryService(db);
  });

  afterEach(() => {
    db.close();
  });

  const createSnapshot = (
    id: string,
    completedAt: string,
    exerciseId: string,
    exerciseName: string,
    weight: number,
    reps: number,
  ): WorkoutSnapshot => ({
    id,
    schemaVersion: 1,
    sourceWorkoutId: 'workout_' + id,
    title: 'Treino Integrado',
    startedAt: completedAt,
    completedAt,
    activeDurationMs: 3600000,
    totalDurationMs: 3600000,
    exercises: [
      {
        exerciseId,
        exerciseName,
        sets: [
          {
            id: 'set_1',
            setNumber: 1,
            type: SetType.NORMAL,
            weight,
            reps,
            completed: true,
            completedAt,
          },
          {
            id: 'set_2',
            setNumber: 2,
            type: SetType.NORMAL,
            weight,
            reps,
            completed: true,
            completedAt,
          },
        ],
        totalVolumeKg: weight * reps * 2,
        totalReps: reps * 2,
      },
    ],
    totalVolumeKg: weight * reps * 2,
    totalReps: reps * 2,
    completedSetsCount: 2,
    revision: 1,
  });

  it('queries weekly review, monthly review and plateau reports across IndexedDB persisted snapshots', async () => {
    // Persist 4 sessions in IndexedDB for Bench Press
    const snap1 = createSnapshot(
      'snap_1',
      '2026-09-02T10:00:00.000Z',
      'ex_bench',
      'Supino Reto com Barra',
      90,
      8,
    );
    const snap2 = createSnapshot(
      'snap_2',
      '2026-09-09T10:00:00.000Z',
      'ex_bench',
      'Supino Reto com Barra',
      90,
      8,
    );
    const snap3 = createSnapshot(
      'snap_3',
      '2026-09-16T10:00:00.000Z',
      'ex_bench',
      'Supino Reto com Barra',
      90,
      8,
    );
    const snap4 = createSnapshot(
      'snap_4',
      '2026-09-23T10:00:00.000Z',
      'ex_bench',
      'Supino Reto com Barra',
      90,
      8,
    );

    await snapshotRepo.save(snap1);
    await snapshotRepo.save(snap2);
    await snapshotRepo.save(snap3);
    await snapshotRepo.save(snap4);

    // 1. Available weeks & months
    const weeks = await historyService.getAvailableReviewWeeks();
    expect(weeks.length).toBeGreaterThanOrEqual(4);

    const months = await historyService.getAvailableReviewMonths();
    expect(months.length).toBe(1);
    expect(months[0].monthKey).toBe('2026-09');

    // 2. Weekly review for 2026-09-23
    const weeklyReview = await historyService.getWeeklyReview('2026-09-23T10:00:00.000Z');
    expect(weeklyReview.totalWorkouts).toBe(1);
    expect(weeklyReview.totalVolumeKg).toBe(90 * 8 * 2);
    expect(weeklyReview.muscleDistribution).toHaveLength(1);
    expect(weeklyReview.muscleDistribution[0].muscle).toBe('Peito');
    expect(weeklyReview.comparisonWithPreviousWeek).not.toBeNull();

    // 3. Monthly review for September 2026
    const monthlyReview = await historyService.getMonthlyReview('2026-09');
    expect(monthlyReview.totalSessions).toBe(4);
    expect(monthlyReview.consistency.activeWeeksCount).toBe(4);

    // 4. Plateau reports (4 sessions with no progress on ex_bench)
    const plateaus = await historyService.getPlateauReports('2026-09-25T00:00:00.000Z');
    expect(plateaus.length).toBeGreaterThanOrEqual(1);
    expect(plateaus[0].exerciseId).toBe('ex_bench');
    expect(plateaus[0].type).toBe('STAGNANT_LOAD');
    expect(plateaus[0].disclaimer).toBeDefined();
  });
});
