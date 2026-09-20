import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createTestDatabase } from '../helpers/test-db.js';
import { preflightImport } from '../../src/backup/backup-importer.js';
import { IdbExerciseRepository } from '../../src/repositories/indexeddb/idb-exercise-repository.js';

describe('PBT 5: Invalid Import Immutability', () => {
  it('any invalid, corrupted or malformed payload leaves database 100% unchanged', async () => {
    // Generate various corruptions: broken JSON, bad format, schema version mismatch, bad checksum
    const corruptedPayloadArbitrary = fc.oneof(
      fc.string({ maxLength: 50 }).map((s) => `invalid_json_${s}`),
      fc
        .record({
          manifest: fc.record({
            format: fc.constant('unsupported-format-v99'),
            schemaVersion: fc.integer({ min: 2, max: 100 }),
            checksum: fc.string({ minLength: 64, maxLength: 64 }),
          }),
          records: fc.constant({}),
        })
        .map((obj) => JSON.stringify(obj)),
      fc
        .record({
          manifest: fc.record({
            format: fc.constant('tita-backup-v1'),
            schemaVersion: fc.constant(1),
            checksum: fc.constant(
              'deadbeef00000000000000000000000000000000000000000000000000000000',
            ),
          }),
          records: fc.record({
            exercises: fc.constant([{ id: 'malicious', name: 'Malicious' }]),
          }),
        })
        .map((obj) => JSON.stringify(obj)),
    );

    await fc.assert(
      fc.asyncProperty(corruptedPayloadArbitrary, async (corruptedJson) => {
        const db = createTestDatabase();
        try {
          await db.open();
          const exRepo = new IdbExerciseRepository(db);

          const pristineExercise = {
            id: 'ex_pristine',
            schemaVersion: 1,
            name: 'Pristine Safe Movement',
            aliases: [],
            primaryMuscle: 'Back',
            secondaryMuscles: [],
            equipment: 'Cable',
            category: 'Strength',
            instructions: [],
            source: 'system' as const,
            roles: [],
            createdAt: '2026-09-17T12:00:00.000Z',
            updatedAt: '2026-09-17T12:00:00.000Z',
          };

          await exRepo.save(pristineExercise);

          // Attempt preflight on corrupted payload
          const preflight = await preflightImport(db, corruptedJson);
          expect(preflight.valid).toBe(false);
          expect(preflight.errors.length).toBeGreaterThan(0);

          // Invariant: Immutability — database contents remain 100% pristine
          const currentExercises = await exRepo.getAll();
          expect(currentExercises.length).toBe(1);
          expect(currentExercises[0]?.id).toBe('ex_pristine');
          expect(currentExercises[0]?.name).toBe('Pristine Safe Movement');
        } finally {
          db.close();
        }
      }),
      { numRuns: 15 },
    );
  });
});
