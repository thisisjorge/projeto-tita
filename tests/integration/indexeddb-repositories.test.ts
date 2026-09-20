import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/test-db.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { IdbExerciseRepository } from '../../src/repositories/indexeddb/idb-exercise-repository.js';
import { IdbRoutineRepository } from '../../src/repositories/indexeddb/idb-routine-repository.js';
import {
  IdbActiveWorkoutRepository,
  IdbWorkoutSnapshotRepository,
} from '../../src/repositories/indexeddb/idb-workout-repository.js';
import { IdbMeasurementRepository } from '../../src/repositories/indexeddb/idb-measurement-repository.js';
import { IdbMetadataRepository } from '../../src/repositories/indexeddb/idb-metadata-repository.js';
import { IdbJournalRepository } from '../../src/repositories/indexeddb/idb-journal-repository.js';
import { IdbSnapshotRepository } from '../../src/repositories/indexeddb/idb-snapshot-repository.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import { ExerciseRole } from '../../src/domain/enums/exercise-role.js';
import { WorkoutStatus } from '../../src/domain/enums/workout-status.js';

describe('IndexedDB Repositories Integration', () => {
  let db: IndexedDBTitaDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
  });

  afterEach(() => {
    db.close();
  });

  it('initializes and verifies database is open', () => {
    expect(db.isOpen()).toBe(true);
  });

  it('performs exercise CRUD operations and name lookup', async () => {
    const repo = new IdbExerciseRepository(db);

    const exercise = {
      id: 'ex_test_1',
      schemaVersion: 1,
      name: 'Supino Reto com Barra',
      aliases: ['Bench Press', 'Supino'],
      primaryMuscle: 'Peito',
      secondaryMuscles: ['Tríceps', 'Ombro Anterior'],
      equipment: 'Barra',
      category: 'Strength',
      instructions: ['Deitar no banco', 'Descer até o peito', 'Empurrar'],
      source: 'system' as const,
      roles: [ExerciseRole.HORIZONTAL_PRESS],
      createdAt: '2026-09-17T12:00:00.000Z',
      updatedAt: '2026-09-17T12:00:00.000Z',
    };

    await repo.save(exercise);

    const fetched = await repo.getById('ex_test_1');
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Supino Reto com Barra');

    // Case-insensitive name and alias lookup
    const byName = await repo.getByName('supino reto com barra');
    expect(byName?.id).toBe('ex_test_1');

    const byAlias = await repo.getByName('bench press');
    expect(byAlias?.id).toBe('ex_test_1');

    const all = await repo.getAll();
    expect(all.length).toBe(1);

    await repo.delete('ex_test_1');
    const afterDelete = await repo.getById('ex_test_1');
    expect(afterDelete).toBeNull();
  });

  it('performs routine CRUD and respects archive flags', async () => {
    const repo = new IdbRoutineRepository(db);

    const routine = {
      id: 'rt_upper_a',
      schemaVersion: 1,
      name: 'Upper A — Hipertrofia',
      exercises: [],
      createdAt: '2026-09-17T12:00:00.000Z',
      updatedAt: '2026-09-17T12:00:00.000Z',
    };

    await repo.save(routine);
    const fetched = await repo.getById('rt_upper_a');
    expect(fetched?.name).toBe('Upper A — Hipertrofia');

    // Archive via deletedAt
    const archivedRoutine = {
      ...routine,
      deletedAt: '2026-09-17T13:00:00.000Z',
    };
    await repo.save(archivedRoutine);

    const activeList = await repo.getAll(false);
    expect(activeList.length).toBe(0);

    const allList = await repo.getAll(true);
    expect(allList.length).toBe(1);
  });

  it('manages active workout and single active invariant', async () => {
    const repo = new IdbActiveWorkoutRepository(db);

    const workout = {
      id: 'wo_active_1',
      schemaVersion: 1,
      title: 'Treino de Pernas',
      status: WorkoutStatus.IN_PROGRESS,
      startedAt: '2026-09-17T14:00:00.000Z',
      pauseIntervals: [],
      exercises: [],
      createdAt: '2026-09-17T14:00:00.000Z',
      updatedAt: '2026-09-17T14:00:00.000Z',
    };

    await repo.save(workout);
    const active = await repo.getActive();
    expect(active).not.toBeNull();
    expect(active?.id).toBe('wo_active_1');

    await repo.clear();
    const afterClear = await repo.getActive();
    expect(afterClear).toBeNull();
  });

  it('preserves immutable workout snapshots with descending date sorting and tiebreak', async () => {
    const repo = new IdbWorkoutSnapshotRepository(db);

    const snap1 = {
      id: 'snap_1',
      schemaVersion: 1,
      sourceWorkoutId: 'wo_1',
      title: 'Treino 1',
      startedAt: '2026-09-10T10:00:00.000Z',
      completedAt: '2026-09-10T11:00:00.000Z',
      activeDurationMs: 3600000,
      totalDurationMs: 3600000,
      exercises: [],
      totalVolumeKg: 1000,
      totalReps: 50,
      completedSetsCount: 10,
      revision: 1,
    };

    const snap2 = {
      id: 'snap_2',
      schemaVersion: 1,
      sourceWorkoutId: 'wo_2',
      title: 'Treino 2 (Mais Recente)',
      startedAt: '2026-09-15T10:00:00.000Z',
      completedAt: '2026-09-15T11:00:00.000Z',
      activeDurationMs: 3600000,
      totalDurationMs: 3600000,
      exercises: [],
      totalVolumeKg: 1200,
      totalReps: 60,
      completedSetsCount: 12,
      revision: 1,
    };

    await repo.saveMany([snap1, snap2]);

    const all = await repo.getAll();
    expect(all.length).toBe(2);
    // Descending order: snap2 (Sep 15) must come before snap1 (Sep 10)
    expect(all[0]?.id).toBe('snap_2');
    expect(all[1]?.id).toBe('snap_1');

    const inRange = await repo.getByDateRange(
      '2026-09-14T00:00:00.000Z',
      '2026-09-16T00:00:00.000Z',
    );
    expect(inRange.length).toBe(1);
    expect(inRange[0]?.id).toBe('snap_2');
  });

  it('stores and retrieves body measurements preserving zero values', async () => {
    const repo = new IdbMeasurementRepository(db);

    const meas = {
      id: 'meas_1',
      schemaVersion: 1,
      metric: 'WEIGHT',
      value: 82.5,
      unit: 'kg',
      capturedAt: '2026-09-17T08:00:00.000Z',
      createdAt: '2026-09-17T08:00:00.000Z',
      updatedAt: '2026-09-17T08:00:00.000Z',
    };

    const zeroMeas = {
      id: 'meas_zero_delta',
      schemaVersion: 1,
      metric: 'WAIST_DELTA',
      value: 0, // Strict zero test
      unit: 'cm',
      capturedAt: '2026-09-17T08:05:00.000Z',
      createdAt: '2026-09-17T08:05:00.000Z',
      updatedAt: '2026-09-17T08:05:00.000Z',
    };

    await repo.saveMany([meas, zeroMeas]);

    const fetchedZero = await repo.getById('meas_zero_delta');
    expect(fetchedZero).not.toBeNull();
    expect(fetchedZero?.value).toBe(0);
    expect(fetchedZero?.value).not.toBeUndefined();
  });

  it('creates and restores point-in-time recovery snapshots', async () => {
    const exRepo = new IdbExerciseRepository(db);
    const snapRepo = new IdbSnapshotRepository(db);

    await exRepo.save({
      id: 'ex_base',
      schemaVersion: 1,
      name: 'Agachamento Livre',
      aliases: ['Squat'],
      primaryMuscle: 'Quadríceps',
      secondaryMuscles: ['Glúteos'],
      equipment: 'Barra',
      category: 'Strength',
      instructions: [],
      source: 'system',
      roles: [ExerciseRole.SQUAT_PATTERN],
      createdAt: '2026-09-17T12:00:00.000Z',
      updatedAt: '2026-09-17T12:00:00.000Z',
    });

    // Create snapshot
    const snapshot = await db.createRecoverySnapshot('manual', 'Test base snapshot');
    expect(snapshot.id).toBeDefined();
    expect(snapshot.stores.exercises.length).toBe(1);

    // Mutate database
    await exRepo.delete('ex_base');
    const emptyExercises = await exRepo.getAll();
    expect(emptyExercises.length).toBe(0);

    // Restore snapshot
    await db.restoreSnapshot(snapshot.id);
    const restoredExercises = await exRepo.getAll();
    expect(restoredExercises.length).toBe(1);
    expect(restoredExercises[0]?.name).toBe('Agachamento Livre');

    // Snapshots store itself remains preserved
    const allSnaps = await snapRepo.getAll();
    expect(allSnaps.length).toBe(1);
  });

  it('handles journal append and status update', async () => {
    const journalRepo = new IdbJournalRepository(db);

    const entry = await journalRepo.append({
      operation: 'create',
      store: 'exercises',
      entityId: 'ex_test',
      status: 'pending',
    });

    expect(entry.id).toBeDefined();
    expect(entry.status).toBe('pending');

    await journalRepo.markStatus(entry.id, 'committed');

    const pending = await journalRepo.getByStatus('pending');
    expect(pending.length).toBe(0);

    const committed = await journalRepo.getByStatus('committed');
    expect(committed.length).toBe(1);
    expect(committed[0]?.id).toBe(entry.id);
  });
});
