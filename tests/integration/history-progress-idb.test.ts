import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { HistoryService } from '../../src/services/history-service.js';
import { IdbWorkoutSnapshotRepository } from '../../src/repositories/indexeddb/idb-workout-repository.js';
import { IdbRoutineRepository } from '../../src/repositories/indexeddb/idb-routine-repository.js';
import type { WorkoutSnapshot } from '../../src/domain/entities/workout-snapshot.js';
import { SetType } from '../../src/domain/enums/set-type.js';

describe('History and Progress IndexedDB Integration (Task 8.1, 8.2)', () => {
  let db: IndexedDBTitaDatabase;
  let historyService: HistoryService;
  let snapshotRepo: IdbWorkoutSnapshotRepository;
  let routineRepo: IdbRoutineRepository;

  beforeEach(async () => {
    db = new IndexedDBTitaDatabase({
      dbName: `test-history-int-${Date.now()}-${Math.random()}`,
    });
    await db.open();

    snapshotRepo = new IdbWorkoutSnapshotRepository(db);
    routineRepo = new IdbRoutineRepository(db);
    historyService = new HistoryService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('persists snapshots in real IDB, queries history, calculates deterministic progress, and resists routine archive', async () => {
    // 1. Create a routine that originates a workout
    const routineId = 'rt_push_day';
    await routineRepo.save({
      id: routineId,
      schemaVersion: 1,
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
      name: 'Push Day Força',
      exercises: [],
      groups: [],
    });

    // 2. Persist 2 chronological snapshots
    const snap1: WorkoutSnapshot = {
      id: 'snap_001',
      schemaVersion: 1,
      sourceWorkoutId: 'w_001',
      sourceRoutineId: routineId,
      title: 'Push Day Força — Sessão 1',
      startedAt: '2026-09-01T10:00:00.000Z',
      completedAt: '2026-09-01T11:00:00.000Z',
      activeDurationMs: 3600000,
      totalDurationMs: 3600000,
      exercises: [
        {
          exerciseId: 'ex_bench',
          exerciseName: 'Supino Reto com Barra',
          sets: [
            {
              id: 'set_1',
              setNumber: 1,
              type: SetType.NORMAL,
              weight: 80,
              reps: 8,
              completed: true,
              completedAt: '2026-09-01T10:15:00.000Z',
            },
            {
              id: 'set_2',
              setNumber: 2,
              type: SetType.NORMAL,
              weight: 80,
              reps: 8,
              completed: true,
              completedAt: '2026-09-01T10:20:00.000Z',
            },
          ],
          totalVolumeKg: 1280,
          totalReps: 16,
        },
      ],
      totalVolumeKg: 1280,
      totalReps: 16,
      completedSetsCount: 2,
      notes: 'Primeira sessão com 80kg',
      revision: 1,
    };

    const snap2: WorkoutSnapshot = {
      id: 'snap_002',
      schemaVersion: 1,
      sourceWorkoutId: 'w_002',
      sourceRoutineId: routineId,
      title: 'Push Day Força — Sessão 2',
      startedAt: '2026-09-08T10:00:00.000Z',
      completedAt: '2026-09-08T11:00:00.000Z',
      activeDurationMs: 3600000,
      totalDurationMs: 3600000,
      exercises: [
        {
          exerciseId: 'ex_bench',
          exerciseName: 'Supino Reto com Barra',
          sets: [
            {
              id: 'set_3',
              setNumber: 1,
              type: SetType.NORMAL,
              weight: 85,
              reps: 8,
              completed: true,
              completedAt: '2026-09-08T10:15:00.000Z',
            },
          ],
          totalVolumeKg: 680,
          totalReps: 8,
        },
      ],
      totalVolumeKg: 680,
      totalReps: 8,
      completedSetsCount: 1,
      notes: 'Subi para 85kg!',
      revision: 1,
    };

    await snapshotRepo.saveMany([snap1, snap2]);

    // 3. Query history with pagination and search
    const historyAll = await historyService.getHistory();
    expect(historyAll.pagination.totalItems).toBe(2);
    expect(historyAll.groups.length).toBeGreaterThan(0);
    expect(historyAll.groups[0].monthKey).toBe('2026-09');

    // Search query
    const searchResult = await historyService.getHistory({ search: '85kg' });
    expect(searchResult.pagination.totalItems).toBe(1);
    expect(searchResult.pagination.items[0].id).toBe('snap_002');

    // 4. Archive the originating routine
    const routine = await routineRepo.getById(routineId);
    expect(routine).not.toBeNull();
    await routineRepo.save({
      ...routine!,
      deletedAt: new Date().toISOString(),
    });

    // 5. Invariant: Archived routine does NOT break existing snapshots
    const historyAfterArchive = await historyService.getHistory();
    expect(historyAfterArchive.pagination.totalItems).toBe(2);
    expect(historyAfterAfterArchiveRoutineIsPreserved(historyAfterArchive.pagination.items)).toBe(
      true,
    );

    // 6. Global progress metrics
    const globalMetrics = await historyService.getGlobalMetrics('ALL');
    expect(globalMetrics.totalWorkouts).toBe(2);
    expect(globalMetrics.totalVolumeKg).toBe(1960);
    expect(globalMetrics.totalSets).toBe(3);
    expect(globalMetrics.totalReps).toBe(24);

    // 7. Exercise progression and personal records
    const exerciseProg = await historyService.getExerciseProgress('ex_bench', 'ALL');
    expect(exerciseProg.totalSessions).toBe(2);
    expect(exerciseProg.personalBests.heaviestWeightKg).toBe(85);
    expect(exerciseProg.personalBests.bestE1RMKg).toBe(107.7); // 85 * (1 + 8/30) = 107.666 -> 107.7

    // 8. Delete snapshot
    await historyService.deleteSnapshot('snap_001');
    const historyAfterDelete = await historyService.getHistory();
    expect(historyAfterDelete.pagination.totalItems).toBe(1);
    expect(historyAfterDelete.pagination.items[0].id).toBe('snap_002');
  });
});

function historyAfterAfterArchiveRoutineIsPreserved(items: readonly WorkoutSnapshot[]): boolean {
  return items.length === 2 && items.every((item) => item.sourceRoutineId === 'rt_push_day');
}
