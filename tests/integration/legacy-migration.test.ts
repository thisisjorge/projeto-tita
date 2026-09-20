import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/test-db.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { LegacyMigrationEngine } from '../../src/migration/legacy-migration-engine.js';
import type { LegacyState } from '../../src/migration/legacy-types.js';
import { IdbExerciseRepository } from '../../src/repositories/indexeddb/idb-exercise-repository.js';
import { IdbRoutineRepository } from '../../src/repositories/indexeddb/idb-routine-repository.js';
import { IdbWorkoutSnapshotRepository } from '../../src/repositories/indexeddb/idb-workout-repository.js';
import { IdbMeasurementRepository } from '../../src/repositories/indexeddb/idb-measurement-repository.js';
import { IdbSnapshotRepository } from '../../src/repositories/indexeddb/idb-snapshot-repository.js';
import { IdbLegacyCompatRepository } from '../../src/repositories/indexeddb/idb-legacy-compat-repository.js';

describe('Legacy Migration Engine Integration', () => {
  let db: IndexedDBTitaDatabase;

  const mockLegacyState: LegacyState = {
    version: '1.1.0',
    createdAt: '2026-08-01T10:00:00.000Z',
    daily: {
      '2026-09-15': {
        weight: '81.5',
        calories: '2400',
        protein: '160',
        carbs: '250',
        fat: '70',
        water: '3000',
        steps: '9500',
        sleep: '7.5',
        meals: { m1: 100, m2: 100 },
        recovery: { score: 85, jointPain: 0 },
        notes: 'Boa disposição',
      },
    },
    workoutLogs: {
      '2026-09-15__mon_pull': {
        date: '2026-09-15',
        sessionId: 'mon_pull',
        completed: true,
        exercises: {
          deadlift: {
            completed: true,
            note: 'Carga subiu fácil',
            sets: [
              { load: '120', reps: '5', rir: '2', pain: 0, done: true, note: 'RPE 8' },
              { load: '120', reps: '5', rir: '2', pain: 0, done: true, note: '' },
              { load: 0, reps: '10', rir: '3', pain: 0, done: true, note: 'Barra pura peso 0' },
            ],
          },
          pullup: {
            completed: true,
            note: 'Barra fixa com peso corporal',
            sets: [{ load: '0', reps: '8', rir: '1', pain: 0, done: true, note: 'Bodyweight' }],
          },
        },
      },
    },
    measurements: [{ date: '2026-09-15', weight: 81.5, waist: 84, chest: 105 }],
    photos: [{ id: 'p1', date: '2026-09-15', uri: 'data:image/jpeg;base64,abc' }],
    history: [
      {
        date: '2026-09-15T19:00:00.000Z',
        type: 'treino',
        text: 'Concluído: Puxar (Costas/Bíceps)',
      },
    ],
    shopping: { frango: true, aveia: true },
    ui: { view: 'training', selectedWeek: 3 },
  };

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
  });

  afterEach(() => {
    db.close();
  });

  it('migrates legacy state without mutating the read-only storage source', async () => {
    const rawStorage = JSON.stringify(mockLegacyState);
    const mockStorage = {
      getItem: (key: string) => (key === 'tita_app_v1' ? rawStorage : null),
    };

    const engine = new LegacyMigrationEngine(db, mockStorage);
    const result = await engine.runMigration();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(false);
    expect(result.counts.exercises).toBe(2);
    expect(result.counts.routines).toBe(1);
    expect(result.counts.workoutSnapshots).toBe(1);
    expect(result.counts.measurements).toBeGreaterThanOrEqual(1);
    expect(result.counts.legacyCompatRecords).toBe(1);

    // Verify entities in database
    const exRepo = new IdbExerciseRepository(db);
    const exercises = await exRepo.getAll();
    expect(exercises.map((e) => e.name)).toContain('Deadlift');
    expect(exercises.map((e) => e.name)).toContain('Pullup');

    const woRepo = new IdbWorkoutSnapshotRepository(db);
    const snapshots = await woRepo.getAll();
    expect(snapshots.length).toBe(1);
    const snap = snapshots[0]!;
    expect(snap.completedSetsCount).toBe(4);
    expect(snap.totalVolumeKg).toBe(1200); // (120*5) + (120*5) + (0*10) + (0*8) = 1200 kg

    // Verify recovery snapshot was created before migration
    const snapRepo = new IdbSnapshotRepository(db);
    const snaps = await snapRepo.getAll();
    expect(snaps.length).toBe(1);
    expect(snaps[0]?.kind).toBe('migration_preflight');

    // Verify legacyCompat preserved raw photos and unmapped fields
    const compatRepo = new IdbLegacyCompatRepository(db);
    const compat = await compatRepo.get('localStorage:tita_app_v1:raw');
    expect(compat).not.toBeNull();
    const rawData = compat?.data as Record<string, unknown>;
    expect(rawData.photos).toBeDefined();
    expect(rawData.shopping).toBeDefined();
  });

  it('is idempotent when run multiple times', async () => {
    const engine = new LegacyMigrationEngine(db);

    // First run
    const result1 = await engine.runMigration(mockLegacyState);
    expect(result1.success).toBe(true);
    expect(result1.skipped).toBe(false);

    // Second run
    const result2 = await engine.runMigration(mockLegacyState);
    expect(result2.success).toBe(true);
    expect(result2.skipped).toBe(true);
    expect(result2.reason).toContain('Migration already applied');

    // Counts remain stable
    const exRepo = new IdbExerciseRepository(db);
    const exercises = await exRepo.getAll();
    expect(exercises.length).toBe(2);
  });

  it('rolls back to pre-migration snapshot if error occurs during migration', async () => {
    // Seed database with pre-existing record
    const exRepo = new IdbExerciseRepository(db);
    await exRepo.save({
      id: 'ex_pre_existing',
      schemaVersion: 1,
      name: 'Pre Existing Movement',
      aliases: [],
      primaryMuscle: 'Back',
      secondaryMuscles: [],
      equipment: 'Bodyweight',
      category: 'Strength',
      instructions: [],
      source: 'custom',
      roles: [],
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
    });

    const engine = new LegacyMigrationEngine(db);

    // Invalid legacy state where exercise has empty name causing domain validation error
    const corruptedLegacyState: LegacyState = {
      ...mockLegacyState,
      workoutLogs: {
        corrupted_session: {
          date: '2026-09-15',
          sessionId: 'session_err',
          completed: true,
          exercises: {
            '   ': {
              // blank exercise ID / name
              completed: true,
              sets: [{ load: 10, reps: 5, done: true }],
            },
          },
        },
      },
    };

    const result = await engine.runMigration(corruptedLegacyState);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // Verify rollback: pre-existing records must remain intact!
    const afterRollback = await exRepo.getAll();
    expect(afterRollback.length).toBe(1);
    expect(afterRollback[0]?.id).toBe('ex_pre_existing');
  });
});
