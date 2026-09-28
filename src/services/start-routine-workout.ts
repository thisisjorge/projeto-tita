import type { Routine } from '../domain/entities/routine.js';
import { generateId } from '../domain/common/id.js';
import type { ActiveWorkoutService } from './active-workout-service.js';
import type { ExerciseLibraryService } from './exercise-library-service.js';

export async function startRoutineWorkout(
  routine: Routine,
  workoutService: ActiveWorkoutService,
  libraryService: ExerciseLibraryService,
) {
  const exercises = await Promise.all(
    routine.exercises.map(async (slot, index) => {
      const [previous, exercise] = await Promise.all([
        workoutService.getPreviousExerciseSets(slot.exerciseId),
        libraryService.getExerciseById(slot.exerciseId),
      ]);
      return {
        id: generateId('slot'),
        exerciseId: slot.exerciseId,
        exerciseName: exercise?.name ?? `Exercício ${index + 1}`,
        order: index + 1,
        targetRestSeconds: slot.restSeconds ?? 90,
        progressionStrategy: slot.progressionStrategy ?? routine.defaultProgressionStrategy,
        sets: slot.sets.map((set, setIndex) => {
          const previousSet = previous?.[setIndex] ?? previous?.[0];
          return {
            id: generateId('set'),
            setNumber: setIndex + 1,
            type: set.type,
            weight: set.targetLoad ?? previousSet?.weight,
            reps: set.targetReps ?? previousSet?.reps ?? set.minReps ?? 10,
            minReps: set.minReps,
            maxReps: set.maxReps,
            targetRir: set.targetRir,
            restTargetSeconds: set.restSeconds ?? slot.restSeconds ?? 90,
            completed: false,
          };
        }),
      };
    }),
  );
  return workoutService.startWorkout({
    title: routine.name,
    sourceRoutineId: routine.id,
    exercises,
  });
}
