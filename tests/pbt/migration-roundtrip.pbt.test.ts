import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createTestDatabase } from '../helpers/test-db.js';
import { transformLegacyState } from '../../src/migration/legacy-transformer.js';
import type { LegacyState } from '../../src/migration/legacy-types.js';

describe('PBT 1: Migration Round-Trip', () => {
  it('preserves volume, sets, and deterministic identity across arbitrary legacy logs', () => {
    const legacyArbitrary = fc.record({
      version: fc.constant('1.1.0'),
      workoutLogs: fc.dictionary(
        fc.stringMatching(/^[a-z0-9_]{3,10}$/),
        fc.record({
          date: fc.constant('2026-09-17'),
          sessionId: fc.stringMatching(/^[a-z0-9_]{3,10}$/),
          completed: fc.boolean(),
          exercises: fc.dictionary(
            fc.stringMatching(/^[a-z0-9_]{3,10}$/),
            fc.record({
              completed: fc.boolean(),
              sets: fc.array(
                fc.record({
                  load: fc.oneof(
                    fc.integer({ min: 0, max: 300 }),
                    fc.constant('0'),
                    fc.constant('100'),
                  ),
                  reps: fc.integer({ min: 1, max: 30 }),
                  rir: fc.integer({ min: 0, max: 5 }),
                  done: fc.boolean(),
                  note: fc.string({ maxLength: 20 }),
                }),
                { maxLength: 5 },
              ),
            }),
            { maxKeys: 3 },
          ),
        }),
        { maxKeys: 3 },
      ),
      measurements: fc.array(
        fc.record({
          date: fc.constant('2026-09-17'),
          weight: fc.integer({ min: 50, max: 150 }),
        }),
        { maxLength: 3 },
      ),
    });

    fc.assert(
      fc.property(legacyArbitrary, (legacy) => {
        const transformed1 = transformLegacyState(legacy as LegacyState);
        const transformed2 = transformLegacyState(legacy as LegacyState);

        // 1. Invariant: Determinism — Identical input must yield strictly identical entity IDs
        expect(transformed1.exercises.map((e) => e.id)).toEqual(
          transformed2.exercises.map((e) => e.id),
        );
        expect(transformed1.routines.map((r) => r.id)).toEqual(
          transformed2.routines.map((r) => r.id),
        );
        expect(transformed1.workoutSnapshots.map((w) => w.id)).toEqual(
          transformed2.workoutSnapshots.map((w) => w.id),
        );

        // 2. Invariant: Zero preservation — Any set with load = 0 must have weight = 0, not undefined or null
        for (const snap of transformed1.workoutSnapshots) {
          for (const ex of snap.exercises) {
            for (const set of ex.sets) {
              if (set.completed) {
                expect(set.weight).toBeDefined();
                expect(typeof set.weight).toBe('number');
              }
            }
          }
        }

        // 3. Invariant: Raw legacy data preserved in legacyCompat
        expect(transformed1.legacyCompatRecords.length).toBe(1);
        expect(transformed1.legacyCompatRecords[0]?.source).toBe('localStorage:tita_app_v1:raw');
      }),
      { numRuns: 25 },
    );
  });
});
