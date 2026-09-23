import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/test-db.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { ExerciseLibraryService } from '../../src/services/exercise-library-service.js';
import { SEED_EXERCISES } from '../../src/data/seed-exercises.js';
import { IdbExerciseRepository } from '../../src/repositories/indexeddb/idb-exercise-repository.js';
import { ExerciseRole } from '../../src/domain/enums/exercise-role.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import type { WorkoutSnapshot } from '../../src/domain/entities/workout-snapshot.js';
import { IdbWorkoutSnapshotRepository } from '../../src/repositories/indexeddb/idb-workout-repository.js';
import { isValidId } from '../../src/domain/common/id.js';

describe('ExerciseLibraryService (Task 6.1)', () => {
  let db: IndexedDBTitaDatabase;
  let service: ExerciseLibraryService;

  beforeEach(async () => {
    db = createTestDatabase(`test-exercise-library-${Date.now()}-${Math.random()}`);
    await db.open();
    service = new ExerciseLibraryService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('initializes library by seeding canonical system exercises', async () => {
    await service.initialize();
    const exercises = await service.getExercises();
    expect(exercises.length).toBeGreaterThanOrEqual(42);
    expect(exercises.every((e) => e.source === 'system')).toBe(true);
  });

  it('mostra nome PT-BR de exercício built-in antigo sem regravar IndexedDB ou alterar customizados', async () => {
    const seed = SEED_EXERCISES.find((exercise) =>
      exercise.aliases.includes('Chest Supported Row'),
    )!;
    const repo = new IdbExerciseRepository(db);
    await repo.save({ ...seed, name: 'Row Chest' });
    const custom = await service.createCustomExercise({
      name: 'Row Chest pessoal',
      primaryMuscle: 'Costas',
      equipment: 'Máquina',
    });

    await service.initialize();
    expect((await service.getExerciseById(seed.id))?.name).toBe(seed.name);
    expect((await service.getExercises()).find((exercise) => exercise.id === seed.id)?.name).toBe(
      seed.name,
    );
    expect((await repo.getById(seed.id))?.name).toBe('Row Chest');
    expect((await service.getExerciseById(custom.id))?.name).toBe('Row Chest pessoal');
  });

  it('initialize is idempotent and does not erase custom exercises', async () => {
    await service.initialize();
    const countFirst = (await service.getExercises()).length;

    // Create a custom exercise
    await service.createCustomExercise({
      name: 'Meu Exercício Teste',
      primaryMuscle: 'Peito',
      equipment: 'Halteres',
    });

    // Re-initialize
    await service.initialize();
    const all = await service.getExercises();
    expect(all.length).toBe(countFirst + 1);
    expect(all.some((e) => e.name === 'Meu Exercício Teste')).toBe(true);
  });

  it('searches exercises by name and aliases', async () => {
    await service.initialize();

    // Search by Portuguese name
    const bench = await service.getExercises({ search: 'supino reto' });
    expect(bench.length).toBeGreaterThan(0);
    expect(bench[0].name).toContain('Supino Reto');

    // Search by English alias
    const deadlift = await service.getExercises({ search: 'deadlift' });
    expect(deadlift.length).toBeGreaterThan(0);
    expect(deadlift[0].name).toContain('Levantamento Terra');
  });

  it('filters exercises by muscle, equipment, and category', async () => {
    await service.initialize();

    const chestExercises = await service.getExercises({ muscle: 'Peito' });
    expect(chestExercises.length).toBeGreaterThan(0);
    expect(
      chestExercises.every(
        (e) => e.primaryMuscle === 'Peito' || e.secondaryMuscles.includes('Peito'),
      ),
    ).toBe(true);

    const barbellExercises = await service.getExercises({ equipment: 'Barra' });
    expect(barbellExercises.length).toBeGreaterThan(0);
    expect(barbellExercises.every((e) => e.equipment === 'Barra')).toBe(true);

    const strengthExercises = await service.getExercises({ category: 'Força' });
    expect(strengthExercises.length).toBeGreaterThan(0);
    expect(strengthExercises.every((e) => e.category === 'Força')).toBe(true);
  });

  it('toggles favorites and filters by onlyFavorites', async () => {
    await service.initialize();
    const all = await service.getExercises();
    const firstId = all[0].id;

    expect(await service.isFavorite(firstId)).toBe(false);

    // Toggle on
    const favOn = await service.toggleFavorite(firstId);
    expect(favOn).toBe(true);
    expect(await service.isFavorite(firstId)).toBe(true);

    // Filter only favorites
    const favs = await service.getExercises({ onlyFavorites: true });
    expect(favs.length).toBe(1);
    expect(favs[0].id).toBe(firstId);

    // Toggle off
    const favOff = await service.toggleFavorite(firstId);
    expect(favOff).toBe(false);
    expect(await service.isFavorite(firstId)).toBe(false);
  });

  it('creates custom exercise with validation and rejects duplicate names', async () => {
    await service.initialize();

    const created = await service.createCustomExercise({
      name: 'Rosca Concentrada Especial',
      primaryMuscle: 'Bíceps',
      equipment: 'Halteres',
      roles: [ExerciseRole.ELBOW_FLEXION],
    });

    expect(created.id).toBeDefined();
    expect(isValidId(created.id)).toBe(true);
    expect(created.source).toBe('custom');
    expect(created.name).toBe('Rosca Concentrada Especial');

    // Attempt to create duplicate name
    await expect(
      service.createCustomExercise({
        name: 'rosca concentrada especial',
        primaryMuscle: 'Bíceps',
        equipment: 'Halteres',
      }),
    ).rejects.toThrow('Já existe um exercício com o nome');
  });

  it('updates custom exercise but rejects updating system exercises', async () => {
    await service.initialize();

    const custom = await service.createCustomExercise({
      name: 'Exercício Editável',
      primaryMuscle: 'Ombros',
      equipment: 'Halteres',
    });

    const updated = await service.updateCustomExercise(custom.id, {
      equipment: 'Polia',
      defaultRestSeconds: 75,
    });
    expect(updated.equipment).toBe('Polia');
    expect(updated.defaultRestSeconds).toBe(75);

    // Try to update system exercise
    const all = await service.getExercises();
    const systemEx = all.find((e) => e.source === 'system')!;
    await expect(service.updateCustomExercise(systemEx.id, { equipment: 'Polia' })).rejects.toThrow(
      'Exercícios do sistema são protegidos',
    );
  });

  it('deletes custom exercise but rejects deleting system exercises', async () => {
    await service.initialize();

    const custom = await service.createCustomExercise({
      name: 'Exercício Para Excluir',
      primaryMuscle: 'Tríceps',
      equipment: 'Polia',
    });

    await service.deleteCustomExercise(custom.id);
    const afterDelete = await service.getExercises({ search: 'Exercício Para Excluir' });
    expect(afterDelete.length).toBe(0);

    // Try to delete system exercise
    const all = await service.getExercises();
    const systemEx = all.find((e) => e.source === 'system')!;
    await expect(service.deleteCustomExercise(systemEx.id)).rejects.toThrow(
      'Exercícios do sistema são protegidos',
    );
  });

  it('finds alternative exercises with shared roles or primary muscle', async () => {
    await service.initialize();

    const benchPress = (await service.getExercises({ search: 'Supino Reto com Barra' }))[0];
    const alternatives = await service.getAlternatives(benchPress);

    expect(alternatives.length).toBeGreaterThan(0);
    // Should prioritize exercises with HORIZONTAL_PRESS
    expect(alternatives.some((a) => a.roles.includes(ExerciseRole.HORIZONTAL_PRESS))).toBe(true);
    // Bench press itself is not included
    expect(alternatives.every((a) => a.id !== benchPress.id)).toBe(true);
  });

  it('calculates personal history and metrics from completed workout snapshots', async () => {
    await service.initialize();
    const benchPress = (await service.getExercises({ search: 'Supino Reto com Barra' }))[0];

    // Seed a workout snapshot containing bench press
    const snapshotRepo = new IdbWorkoutSnapshotRepository(db);
    const mockSnapshot: WorkoutSnapshot = {
      id: 'snap-1',
      schemaVersion: 1,
      sourceWorkoutId: 'workout-1',
      title: 'Treino Peito',
      startedAt: '2026-03-01T09:00:00.000Z',
      completedAt: '2026-03-01T10:00:00.000Z',
      activeDurationMs: 3600000,
      totalDurationMs: 3600000,
      totalVolumeKg: 2000,
      totalReps: 20,
      completedSetsCount: 2,
      revision: 1,
      exercises: [
        {
          exerciseId: benchPress.id,
          exerciseName: benchPress.name,
          totalVolumeKg: 1300,
          totalReps: 15,
          sets: [
            {
              id: 'set-1',
              type: SetType.NORMAL,
              setNumber: 1,
              weight: 80,
              reps: 10,
              completed: true,
              completedAt: '2026-03-01T09:15:00.000Z',
            },
            {
              id: 'set-2',
              type: SetType.NORMAL,
              setNumber: 2,
              weight: 100,
              reps: 5,
              completed: true,
              completedAt: '2026-03-01T09:20:00.000Z',
            },
          ],
        },
      ],
    };

    await snapshotRepo.save(mockSnapshot);

    const history = await service.getExerciseHistory(benchPress.id);
    expect(history.totalSessions).toBe(1);
    expect(history.bestWeight).toBe(100);
    // Epley 1RM for 100kg x 5 reps = 100 * (1 + 5/30) = 116.7kg
    expect(history.bestEstimated1RM).toBeCloseTo(116.7, 1);
    // Best volume set: 80kg x 10 = 800 vs 100kg x 5 = 500 => 800
    expect(history.bestVolumeSet?.volume).toBe(800);
    expect(history.recentSessions.length).toBe(1);
  });
});
