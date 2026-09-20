import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/test-db.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { exportBackup } from '../../src/backup/backup-exporter.js';
import { preflightImport, executeImport } from '../../src/backup/backup-importer.js';
import { IdbExerciseRepository } from '../../src/repositories/indexeddb/idb-exercise-repository.js';
import { IdbRoutineRepository } from '../../src/repositories/indexeddb/idb-routine-repository.js';
import { ExerciseRole } from '../../src/domain/enums/exercise-role.js';

describe('Backup Export and Import Integration', () => {
  let db: IndexedDBTitaDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
  });

  afterEach(() => {
    db.close();
  });

  it('exports deterministic backup with valid manifest, counts and SHA-256 checksum', async () => {
    const exRepo = new IdbExerciseRepository(db);
    const rtRepo = new IdbRoutineRepository(db);

    await exRepo.saveMany([
      {
        id: 'ex_2',
        schemaVersion: 1,
        name: 'Supino Inclinado com Halteres',
        aliases: [],
        primaryMuscle: 'Peito Superior',
        secondaryMuscles: ['Tríceps'],
        equipment: 'Halteres',
        category: 'Strength',
        instructions: [],
        source: 'custom',
        roles: [ExerciseRole.HORIZONTAL_PRESS],
        createdAt: '2026-09-17T12:00:00.000Z',
        updatedAt: '2026-09-17T12:00:00.000Z',
      },
      {
        id: 'ex_1',
        schemaVersion: 1,
        name: 'Agachamento Barra Costas',
        aliases: [],
        primaryMuscle: 'Quadríceps',
        secondaryMuscles: ['Glúteos'],
        equipment: 'Barra',
        category: 'Strength',
        instructions: [],
        source: 'system',
        roles: [ExerciseRole.SQUAT_PATTERN],
        createdAt: '2026-09-17T12:00:00.000Z',
        updatedAt: '2026-09-17T12:00:00.000Z',
      },
    ]);

    await rtRepo.save({
      id: 'rt_push',
      schemaVersion: 1,
      name: 'Push Day',
      exercises: [],
      createdAt: '2026-09-17T12:00:00.000Z',
      updatedAt: '2026-09-17T12:00:00.000Z',
    });

    const exportResult = await exportBackup(db);
    expect(exportResult.backup.manifest.format).toBe('tita-backup-v1');
    expect(exportResult.backup.manifest.schemaVersion).toBe(1);
    expect(exportResult.backup.manifest.counts.exercises).toBe(2);
    expect(exportResult.backup.manifest.counts.routines).toBe(1);
    expect(exportResult.backup.manifest.checksum.length).toBe(64); // 64-char hex SHA-256

    // Records are ordered by ID ascending: ex_1 must precede ex_2
    const exRecords = exportResult.backup.records.exercises as { id: string }[];
    expect(exRecords[0]?.id).toBe('ex_1');
    expect(exRecords[1]?.id).toBe('ex_2');

    // Preflight import on this clean exported JSON should pass cleanly
    const preflight = await preflightImport(db, exportResult.json);
    expect(preflight.valid).toBe(true);
    expect(preflight.errors.length).toBe(0);
    expect(preflight.counts.exercises).toBe(2);
    expect(preflight.counts.routines).toBe(1);
  });

  it('detects corrupted checksum or invalid JSON without mutating the database', async () => {
    const exRepo = new IdbExerciseRepository(db);
    await exRepo.save({
      id: 'ex_base',
      schemaVersion: 1,
      name: 'Base Movement',
      aliases: [],
      primaryMuscle: 'Back',
      secondaryMuscles: [],
      equipment: 'Barbell',
      category: 'Strength',
      instructions: [],
      source: 'system',
      roles: [],
      createdAt: '2026-09-17T12:00:00.000Z',
      updatedAt: '2026-09-17T12:00:00.000Z',
    });

    // Corrupted payload with invalid checksum
    const corruptedBackup = {
      manifest: {
        format: 'tita-backup-v1',
        schemaVersion: 1,
        exportedAt: '2026-09-17T12:00:00.000Z',
        categories: ['exercises'],
        counts: { exercises: 1 },
        checksum: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff', // invalid
      },
      records: {
        exercises: [{ id: 'ex_tampered', name: 'Tampered' }],
      },
    };

    const preflight = await preflightImport(db, JSON.stringify(corruptedBackup));
    expect(preflight.valid).toBe(false);
    expect(preflight.errors.some((e) => e.includes('checksum mismatch'))).toBe(true);

    // Verify database was untouched
    const currentExercises = await exRepo.getAll();
    expect(currentExercises.length).toBe(1);
    expect(currentExercises[0]?.id).toBe('ex_base');
  });

  it('supports cancel mode with zero mutation', async () => {
    const exportResult = await exportBackup(db);
    const importRes = await executeImport(db, exportResult.backup, { mode: 'cancel' });

    expect(importRes.success).toBe(true);
    expect(importRes.cancelled).toBe(true);
  });

  it('supports merge and replace_selected modes with snapshot and rollback safety', async () => {
    const exRepo = new IdbExerciseRepository(db);

    // Initial state: ex_1
    await exRepo.save({
      id: 'ex_1',
      schemaVersion: 1,
      name: 'Ex 1',
      aliases: [],
      primaryMuscle: 'Chest',
      secondaryMuscles: [],
      equipment: 'Barbell',
      category: 'Strength',
      instructions: [],
      source: 'system',
      roles: [],
      createdAt: '2026-09-17T12:00:00.000Z',
      updatedAt: '2026-09-17T12:00:00.000Z',
    });

    // Backup to import has: ex_2
    const incomingBackup = {
      manifest: {
        format: 'tita-backup-v1' as const,
        schemaVersion: 1,
        exportedAt: '2026-09-17T12:00:00.000Z',
        categories: ['exercises'],
        counts: { exercises: 1 },
        checksum: '',
      },
      records: {
        exercises: [
          {
            id: 'ex_2',
            schemaVersion: 1,
            name: 'Ex 2',
            aliases: [],
            primaryMuscle: 'Legs',
            secondaryMuscles: [],
            equipment: 'Barbell',
            category: 'Strength',
            instructions: [],
            source: 'system',
            roles: [],
            createdAt: '2026-09-17T12:00:00.000Z',
            updatedAt: '2026-09-17T12:00:00.000Z',
          },
        ],
      },
    };

    // Test Merge Mode: should now have both ex_1 and ex_2
    const mergeRes = await executeImport(db, incomingBackup, {
      mode: 'merge',
      selectedCategories: ['exercises'],
    });
    expect(mergeRes.success).toBe(true);
    const afterMerge = await exRepo.getAll();
    expect(afterMerge.length).toBe(2);

    // Test Replace Selected Mode: should now have ONLY ex_2
    const replaceRes = await executeImport(db, incomingBackup, {
      mode: 'replace_selected',
      selectedCategories: ['exercises'],
    });
    expect(replaceRes.success).toBe(true);
    const afterReplace = await exRepo.getAll();
    expect(afterReplace.length).toBe(1);
    expect(afterReplace[0]?.id).toBe('ex_2');
  });
});
