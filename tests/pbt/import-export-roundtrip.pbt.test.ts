import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createTestDatabase } from '../helpers/test-db.js';
import { exportBackup } from '../../src/backup/backup-exporter.js';
import { executeImport } from '../../src/backup/backup-importer.js';
import { IdbExerciseRepository } from '../../src/repositories/indexeddb/idb-exercise-repository.js';
import { IdbMeasurementRepository } from '../../src/repositories/indexeddb/idb-measurement-repository.js';

describe('PBT 2: Import/Export Round-Trip', () => {
  it('exporting and re-importing into an empty database restores equivalent datasets', async () => {
    const exercisesArbitrary = fc.array(
      fc.record({
        id: fc.stringMatching(/^[a-z0-9_]{4,12}$/).map((s) => `ex_${s}`),
        schemaVersion: fc.constant(1),
        name: fc.stringMatching(/^[A-Za-z0-9 ]{3,15}$/),
        aliases: fc.constant([]),
        primaryMuscle: fc.constant('Chest'),
        secondaryMuscles: fc.constant([]),
        equipment: fc.constant('Barbell'),
        category: fc.constant('Strength'),
        instructions: fc.constant([]),
        source: fc.constant('system' as const),
        roles: fc.constant([]),
        createdAt: fc.constant('2026-09-17T12:00:00.000Z'),
        updatedAt: fc.constant('2026-09-17T12:00:00.000Z'),
      }),
      { minLength: 1, maxLength: 5 },
    );

    const measurementsArbitrary = fc.array(
      fc.record({
        id: fc.stringMatching(/^[a-z0-9_]{4,12}$/).map((s) => `meas_${s}`),
        schemaVersion: fc.constant(1),
        metric: fc.constant('WEIGHT'),
        value: fc.integer({ min: 40, max: 150 }),
        unit: fc.constant('kg'),
        capturedAt: fc.constant('2026-09-17T08:00:00.000Z'),
        createdAt: fc.constant('2026-09-17T08:00:00.000Z'),
        updatedAt: fc.constant('2026-09-17T08:00:00.000Z'),
      }),
      { minLength: 1, maxLength: 5 },
    );

    await fc.assert(
      fc.asyncProperty(
        exercisesArbitrary,
        measurementsArbitrary,
        async (exercises, measurements) => {
          const db1 = createTestDatabase();
          const db2 = createTestDatabase();

          try {
            await db1.open();
            await db2.open();

            // Populate DB1
            const exRepo1 = new IdbExerciseRepository(db1);
            const measRepo1 = new IdbMeasurementRepository(db1);

            // Deduplicate by ID
            const uniqueEx = Array.from(new Map(exercises.map((e) => [e.id, e])).values());
            const uniqueMeas = Array.from(new Map(measurements.map((m) => [m.id, m])).values());

            await exRepo1.saveMany(uniqueEx);
            await measRepo1.saveMany(uniqueMeas);

            // Export from DB1
            const exported = await exportBackup(db1);

            // Import into DB2
            const importRes = await executeImport(db2, exported.backup, {
              mode: 'replace_selected',
            });
            expect(importRes.success).toBe(true);

            // Verify equivalence in DB2
            const exRepo2 = new IdbExerciseRepository(db2);
            const measRepo2 = new IdbMeasurementRepository(db2);

            const db2Exercises = await exRepo2.getAll();
            const db2Measurements = await measRepo2.getAll();

            expect(db2Exercises.length).toBe(uniqueEx.length);
            expect(db2Measurements.length).toBe(uniqueMeas.length);

            // Export from DB2 should match DB1
            const reExported = await exportBackup(db2, {
              exportedAt: exported.backup.manifest.exportedAt,
            });
            expect(reExported.backup.manifest.checksum).toBe(exported.backup.manifest.checksum);
          } finally {
            db1.close();
            db2.close();
          }
        },
      ),
      { numRuns: 10 },
    );
  });
});
