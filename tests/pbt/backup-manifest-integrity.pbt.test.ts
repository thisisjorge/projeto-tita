import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateSha256,
  serializeDeterministicJson,
  type BackupManifest,
} from '../../src/backup/backup-grammar.js';

describe('PBT 3: Backup Manifest Integrity', () => {
  it('manifest counts and SHA-256 checksum strictly match records serialization and detect tampering', async () => {
    const recordsArbitrary = fc.record({
      exercises: fc.array(
        fc.record({
          id: fc.stringMatching(/^[a-z0-9_]{3,8}$/),
          name: fc.stringMatching(/^[A-Za-z ]{3,12}$/),
          weight: fc.integer({ min: 0, max: 200 }),
        }),
        { maxLength: 5 },
      ),
      routines: fc.array(
        fc.record({
          id: fc.stringMatching(/^[a-z0-9_]{3,8}$/),
          name: fc.stringMatching(/^[A-Za-z ]{3,12}$/),
        }),
        { maxLength: 5 },
      ),
    });

    await fc.assert(
      fc.asyncProperty(recordsArbitrary, async (records) => {
        const recordsJson = serializeDeterministicJson(records);
        const checksum = await calculateSha256(recordsJson);

        const manifest: BackupManifest = {
          format: 'tita-backup-v1',
          schemaVersion: 1,
          exportedAt: '2026-09-17T12:00:00.000Z',
          categories: Object.keys(records),
          counts: {
            exercises: records.exercises.length,
            routines: records.routines.length,
          },
          checksum,
        };

        // 1. Invariant: counts must match lengths exactly
        expect(manifest.counts.exercises).toBe(records.exercises.length);
        expect(manifest.counts.routines).toBe(records.routines.length);

        // 2. Invariant: recalculating checksum on untampered records matches 100%
        const verifiedChecksum = await calculateSha256(serializeDeterministicJson(records));
        expect(verifiedChecksum).toBe(manifest.checksum);

        // 3. Invariant: Tampering detection — modifying any value changes the hash
        const tamperedRecords = {
          ...records,
          exercises: [...records.exercises, { id: 'tampered', name: 'Tampered', weight: 999 }],
        };
        const tamperedChecksum = await calculateSha256(serializeDeterministicJson(tamperedRecords));
        expect(tamperedChecksum).not.toBe(manifest.checksum);
      }),
      { numRuns: 25 },
    );
  });
});
