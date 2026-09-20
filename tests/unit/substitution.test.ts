import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SEED_EXERCISES } from '../../src/data/seed-exercises.js';
import { rankSubstitutions } from '../../src/domain/workout/substitution.js';
import { ActiveWorkoutService } from '../../src/services/active-workout-service.js';
import { ExerciseLibraryService } from '../../src/services/exercise-library-service.js';
import { createTestDatabase } from '../helpers/test-db.js';
import { exportBackup } from '../../src/backup/backup-exporter.js';
import { GroupType } from '../../src/domain/enums/group-type.js';

const bench = SEED_EXERCISES[0]!;
const dumbbell = SEED_EXERCISES[1]!;
describe('local substitution ranking', () => {
  it('is deterministic, excludes current/deleted/session entries and unrelated muscles', () => {
    const options = { reason: 'alternative' as const, excludedIds: [dumbbell.id] };
    const catalog = [...SEED_EXERCISES, { ...bench, id: 'deleted', deletedAt: '2026-01-01' }];
    const ranked = rankSubstitutions(bench, catalog, options);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked).toEqual(rankSubstitutions(bench, catalog, options));
    expect(ranked.map((r) => r.exerciseId)).not.toContain(bench.id);
    expect(ranked.map((r) => r.exerciseId)).not.toContain(dumbbell.id);
    expect(ranked.map((r) => r.exerciseId)).not.toContain('deleted');
    for (const r of ranked)
      expect(SEED_EXERCISES.find((e) => e.id === r.exerciseId)?.primaryMuscle).toBe(
        bench.primaryMuscle,
      );
  });
  it.each(['occupied', 'unavailable'] as const)(
    '%s excludes original equipment and respects available equipment',
    (reason) => {
      const ranked = rankSubstitutions(bench, SEED_EXERCISES, {
        reason,
        availableEquipment: ['Halteres'],
      });
      expect(ranked.length).toBeGreaterThan(0);
      ranked.forEach((r) =>
        expect(SEED_EXERCISES.find((e) => e.id === r.exerciseId)?.equipment).toBe('Halteres'),
      );
    },
  );
  it('warns about a different movement and uses existing favorites as a small preference', () => {
    const partial = { ...bench, id: 'partial', roles: [] };
    expect(rankSubstitutions(bench, [partial], { reason: 'alternative' })[0]).toMatchObject({
      equivalence: 'partial',
      reasons: expect.arrayContaining(['Padrão diferente: muda o estímulo da rotina']),
    });
    const regular = rankSubstitutions(bench, [dumbbell], { reason: 'alternative' })[0]!;
    const favorite = rankSubstitutions(bench, [dumbbell], {
      reason: 'alternative',
      favoriteIds: [dumbbell.id],
    })[0]!;
    expect(favorite.localScore).toBeGreaterThan(regular.localScore);
  });
});

describe('atomic substitution and snapshot preservation', () => {
  let db: ReturnType<typeof createTestDatabase>;
  let service: ActiveWorkoutService;
  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
    service = new ActiveWorkoutService(db);
    await new ExerciseLibraryService(db).initialize();
  });
  afterEach(() => db.close());
  async function start() {
    const result = await service.startWorkout();
    if (result.type !== 'started') throw new Error('start');
    const workout = await service.addExercise(result.workout.id, {
      exerciseId: bench.id,
      exerciseName: bench.name,
      initialSetsCount: 3,
    });
    const slot = workout.exercises[0]!;
    await service.updateSet(workout.id, slot.id, slot.sets[0]!.id, {
      weight: 100,
      reps: 8,
      completed: true,
      notes: 'Preservar',
      rir: 2,
    });
    await service.updateSet(workout.id, slot.id, slot.sets[1]!.id, { weight: 100, reps: 8 });
    return { workout, slot };
  }
  it('retains completed sets byte-for-byte, leaves unknown load blank and persists through reload/finalize/backup', async () => {
    const { workout, slot } = await start();
    const before = await service.getActiveWorkout();
    const swapped = await service.substituteExercise(workout.id, slot.id, dumbbell.id, 'occupied');
    expect(swapped.exercises[0]!.sets).toEqual([before!.exercises[0]!.sets[0]]);
    expect(swapped.exercises[1]!.sets).toHaveLength(2);
    expect(swapped.exercises[1]!.sets[0]).toMatchObject({ completed: false, reps: 8 });
    expect(swapped.exercises[1]!.sets[0]!.weight).toBeUndefined();
    expect(swapped.exercises[1]!.sets[0]!.notes).toBeUndefined();
    expect(await new ActiveWorkoutService(db).getActiveWorkout()).toEqual(swapped);
    const snapshot = await service.finalizeWorkout(workout.id);
    expect(snapshot.totalVolumeKg).toBe(800);
    expect(snapshot.exercises[0]!.exerciseId).toBe(bench.id);
    expect(snapshot.substitutions?.[0]).toMatchObject({
      fromExerciseId: bench.id,
      toExerciseId: dumbbell.id,
      completedSetsBeforeSwap: 1,
    });
    expect((await exportBackup(db)).json).toContain('completedSetsBeforeSwap');
    expect(await service.finalizeWorkout(workout.id)).toEqual(snapshot);
    await expect(
      service.substituteExercise(
        workout.id,
        swapped.exercises[1]!.id,
        SEED_EXERCISES[2]!.id,
        'alternative',
      ),
    ).rejects.toThrow();
  });
  it('uses only substitute history load, retains sensible target reps and replaces grouping membership', async () => {
    const first = await service.startWorkout();
    if (first.type !== 'started') throw new Error();
    const past = await service.addExercise(first.workout.id, {
      exerciseId: dumbbell.id,
      exerciseName: dumbbell.name,
      initialSetsCount: 1,
    });
    await service.updateSet(past.id, past.exercises[0]!.id, past.exercises[0]!.sets[0]!.id, {
      completed: true,
      weight: 22,
      reps: 12,
    });
    await service.finalizeWorkout(past.id);
    const { workout, slot } = await start();
    const expanded = await service.addExercise(workout.id, {
      exerciseId: SEED_EXERCISES[10]!.id,
      exerciseName: 'Outro',
    });
    await service.createExerciseGroup(
      workout.id,
      [slot.id, expanded.exercises[1]!.id],
      GroupType.SUPERSET,
    );
    const swapped = await service.substituteExercise(
      workout.id,
      slot.id,
      dumbbell.id,
      'alternative',
    );
    expect(swapped.exercises[1]!.sets[0]).toMatchObject({ weight: 22, reps: 8 });
    expect(swapped.groups?.[0]?.exerciseSlotIds).toContain(swapped.exercises[1]!.id);
    expect(swapped.groups?.[0]?.exerciseSlotIds).not.toContain(slot.id);
  });
  it('rejects duplicate exercises and a second application from a stale chooser', async () => {
    const { workout, slot } = await start();
    await expect(
      service.substituteExercise(workout.id, slot.id, bench.id, 'alternative'),
    ).rejects.toThrow();
    const updated = await service.substituteExercise(
      workout.id,
      slot.id,
      dumbbell.id,
      'alternative',
    );
    await expect(
      service.substituteExercise(workout.id, slot.id, SEED_EXERCISES[2]!.id, 'alternative'),
    ).rejects.toThrow('séries futuras');
    expect(await service.getActiveWorkout()).toEqual(updated);
  });
});
