import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/test-db.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { ExerciseLibraryService } from '../../src/services/exercise-library-service.js';

describe('Exercise Library IndexedDB Integration (Task 6.1)', () => {
  let db: IndexedDBTitaDatabase;
  const dbName = `test-idb-exercise-${Date.now()}`;

  beforeEach(async () => {
    db = createTestDatabase(dbName);
    await db.open();
  });

  afterEach(() => {
    db.close();
  });

  it('persists seeded exercises and custom exercises across service reinstantiation', async () => {
    const service1 = new ExerciseLibraryService(db);
    await service1.initialize();

    const custom = await service1.createCustomExercise({
      name: 'Supino com Pegada Fechada Especial',
      primaryMuscle: 'Tríceps',
      equipment: 'Barra',
    });
    await service1.toggleFavorite(custom.id);

    // Reinstantiate service on the same database
    const service2 = new ExerciseLibraryService(db);
    const loaded = await service2.getExerciseById(custom.id);
    expect(loaded).not.toBeNull();
    expect(loaded?.name).toBe('Supino com Pegada Fechada Especial');
    expect(await service2.isFavorite(custom.id)).toBe(true);

    const systemExercises = await service2.getExercises({ source: 'system' });
    expect(systemExercises.length).toBeGreaterThanOrEqual(42);
  });
});
