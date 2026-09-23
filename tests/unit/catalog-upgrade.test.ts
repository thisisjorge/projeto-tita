import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { SEED_EXERCISES } from '../../src/data/seed-exercises.js';
import { EXERCISE_MEDIA_SLUGS } from '../../src/data/catalog-generated.js';
import { ExerciseRole } from '../../src/domain/enums/exercise-role.js';
import { createTestDatabase } from '../helpers/test-db.js';
import { ExerciseLibraryService } from '../../src/services/exercise-library-service.js';
import { IdbExerciseRepository } from '../../src/repositories/indexeddb/idb-exercise-repository.js';
import type { Exercise } from '../../src/domain/entities/exercise.js';
const legacy = JSON.parse(
  readFileSync('scripts/catalog/legacy-exercises.json', 'utf8'),
) as Exercise[];

describe('V1 catalog upgrade', () => {
  it('preserves every field and ID of all 42 legacy exercises', () => {
    expect(SEED_EXERCISES.slice(0, 42)).toEqual(legacy);
    expect(SEED_EXERCISES).toHaveLength(217);
  });
  it('ships verified frames and real GIFs for every supported mapping', () => {
    let count = 0;
    for (const exercise of SEED_EXERCISES) {
      expect(exercise.roles.every((r) => Object.values(ExerciseRole).includes(r))).toBe(true);
      const slug = EXERCISE_MEDIA_SLUGS[exercise.id];
      if (!slug) continue;
      count++;
      for (const frame of [1, 2, 3])
        expect(existsSync(`public/media/exercises/${slug}/frame-${frame}.svg`)).toBe(true);
      expect(
        readFileSync(`public/media/exercises/${slug}/animation.gif`).subarray(0, 6).toString(),
      ).toBe('GIF89a');
    }
    expect(count).toBe(215);
  });
  it('inserts only missing IDs without changing custom, modified or tombstoned records', async () => {
    const db = createTestDatabase('v1-upgrade-preservation');
    await db.open();
    try {
      const repo = new IdbExerciseRepository(db);
      const old = legacy.map((e, index) =>
        index === 0
          ? { ...e, name: 'Meu nome preservado', deletedAt: '2026-08-01T00:00:00.000Z' }
          : e,
      );
      const custom: Exercise = {
        ...legacy[0]!,
        id: 'custom-preserved',
        source: 'custom',
        name: 'Meu exercício',
      };
      await repo.saveMany([...old, custom]);
      const service = new ExerciseLibraryService(db);
      await service.initialize();
      await service.initialize();
      for (const e of [...old, custom]) expect(await repo.getById(e.id)).toEqual(e);
      expect(await repo.getAll(true)).toHaveLength(218);
    } finally {
      db.close();
    }
  });
});
