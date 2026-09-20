import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { RoutineService } from '../../src/services/routine-service.js';
import { TemplateService } from '../../src/services/template-service.js';
import { ActiveWorkoutService } from '../../src/services/active-workout-service.js';
import { SEED_EXERCISES } from '../../src/data/seed-exercises.js';
import { IdbExerciseRepository } from '../../src/repositories/indexeddb/idb-exercise-repository.js';
import { SetType } from '../../src/domain/enums/set-type.js';

describe('Routine Management IndexedDB Integration (Task 7.1, 7.2)', () => {
  let db: IndexedDBTitaDatabase;
  let routineService: RoutineService;
  let templateService: TemplateService;
  let workoutService: ActiveWorkoutService;
  let exerciseRepo: IdbExerciseRepository;

  beforeEach(async () => {
    db = new IndexedDBTitaDatabase({
      dbName: `test-routine-int-${Date.now()}-${Math.random()}`,
    });
    await db.open();

    // Seed basic exercises
    exerciseRepo = new IdbExerciseRepository(db);
    await exerciseRepo.saveMany(SEED_EXERCISES);

    routineService = new RoutineService(db);
    templateService = new TemplateService(db);
    workoutService = new ActiveWorkoutService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('clones template, edits routine, starts active workout, archives routine without breaking history', async () => {
    // 1. Clone Full Body template
    const { program, routines } = await templateService.cloneTemplateToUserProgram(
      'template-full-body-3x',
      'Meu Treino Full Body',
    );

    expect(program.id).toBeDefined();
    expect(routines).toHaveLength(3);

    const routineA = routines[0]!;

    // 2. Fetch routines via RoutineService
    const allRoutines = await routineService.getRoutines();
    expect(allRoutines.length).toBe(3);

    // 3. Edit routine: add extra exercise slot
    const updatedRoutine = await routineService.updateRoutine(routineA.id, {
      name: 'Full Body A (Modificado)',
      exercises: [
        ...routineA.exercises.map((ex) => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          sets: ex.sets.map((s) => ({
            type: s.type,
            targetReps: s.targetReps ?? 10,
            targetLoad: s.targetLoad,
          })),
        })),
        {
          exerciseId: '00000000-0000-4000-8000-000000000005', // Flexão de Braços
          restSeconds: 60,
          sets: [{ type: SetType.NORMAL, targetReps: 15 }],
        },
      ],
    });

    expect(updatedRoutine.name).toBe('Full Body A (Modificado)');
    expect(updatedRoutine.exercises.length).toBe(routineA.exercises.length + 1);

    // 4. Start active workout using the updated routine
    const startResult = await workoutService.startWorkout({
      sourceRoutineId: updatedRoutine.id,
      title: updatedRoutine.name,
    });
    expect(startResult.type).toBe('started');
    if (startResult.type !== 'started') throw new Error('Workout failed to start');
    let activeWorkout = startResult.workout;

    expect(activeWorkout.id).toBeDefined();
    expect(activeWorkout.sourceRoutineId).toBe(updatedRoutine.id);

    // Add first exercise from routine to the active workout
    activeWorkout = await workoutService.addExercise(activeWorkout.id, {
      exerciseId: updatedRoutine.exercises[0]!.exerciseId,
      exerciseName: 'Supino Reto com Barra',
      initialSetsCount: 3,
    });
    expect(activeWorkout.exercises).toHaveLength(1);

    // 5. Complete a set and finalize workout
    const slot = activeWorkout.exercises[0]!;
    const targetSet = slot.sets[0]!;
    activeWorkout = await workoutService.updateSet(activeWorkout.id, slot.id, targetSet.id, {
      weight: 80,
      reps: 8,
      completed: true,
    });

    const snapshot = await workoutService.finalizeWorkout(activeWorkout.id);

    expect(snapshot.id).toMatch(/^snapshot_/);
    expect(snapshot.sourceRoutineId).toBe(updatedRoutine.id);
    expect(snapshot.completedSetsCount).toBe(1);

    // 6. Archive the routine (soft delete)
    const archived = await routineService.archiveRoutine(updatedRoutine.id);
    expect(archived.deletedAt).toBeDefined();

    // Active routines list excludes archived routine
    const activeRoutinesAfterArchive = await routineService.getRoutines({ includeArchived: false });
    expect(activeRoutinesAfterArchive.find((r) => r.id === updatedRoutine.id)).toBeUndefined();

    // Past snapshot still safely references the routine ID
    expect(snapshot.sourceRoutineId).toBe(updatedRoutine.id);

    // 7. Restore routine
    const restored = await routineService.restoreRoutine(updatedRoutine.id);
    expect(restored.deletedAt).toBeUndefined();

    const activeRoutinesAfterRestore = await routineService.getRoutines({ includeArchived: false });
    expect(activeRoutinesAfterRestore.find((r) => r.id === updatedRoutine.id)).toBeDefined();
  });
});
