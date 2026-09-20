import type { WorkoutSnapshot, SnapshotExercise } from '../domain/entities/workout-snapshot.js';
import type { ExerciseSet } from '../domain/entities/exercise-set.js';
import { SetType } from '../domain/enums/set-type.js';

export interface BenchmarkExerciseDef {
  readonly id: string;
  readonly name: string;
  readonly baseWeight: number;
  readonly progressionRateKg: number;
}

export const BENCHMARK_EXERCISES: readonly BenchmarkExerciseDef[] = [
  { id: 'bench-press', name: 'Supino Reto com Barra', baseWeight: 60, progressionRateKg: 0.5 },
  { id: 'barbell-squat', name: 'Agachamento Livre', baseWeight: 80, progressionRateKg: 0.75 },
  { id: 'deadlift', name: 'Levantamento Terra', baseWeight: 100, progressionRateKg: 1.0 },
  {
    id: 'overhead-press',
    name: 'Desenvolvimento Militar',
    baseWeight: 40,
    progressionRateKg: 0.35,
  },
  { id: 'barbell-row', name: 'Remada Curvada com Barra', baseWeight: 55, progressionRateKg: 0.45 },
  { id: 'pull-up', name: 'Barra Fixa', baseWeight: 0, progressionRateKg: 0.2 },
];

/**
 * Generates a realistic, deterministic, sanitized dataset of workout snapshots
 * spanning a specified number of weeks/sessions for performance benchmarking (Phase 13 / M-08).
 *
 * @param count Number of workout snapshots to generate (default: 150 sessions ~ 50 weeks)
 */
export function generateBenchmarkSnapshots(count = 150): readonly WorkoutSnapshot[] {
  const snapshots: WorkoutSnapshot[] = [];

  // Start 50 weeks in the past from a fixed reference date for pure determinism
  const baseDate = new Date('2025-01-01T10:00:00.000Z');

  for (let i = 0; i < count; i++) {
    // 3 workouts per week on average (approx 2.33 days interval)
    const sessionDate = new Date(baseDate.getTime() + i * 2.33 * 24 * 60 * 60 * 1000);
    const completedDate = new Date(sessionDate.getTime() + 60 * 60 * 1000); // 60 min workout

    const sessionExercises: SnapshotExercise[] = [];
    let workoutVolumeKg = 0;
    let workoutTotalReps = 0;
    let workoutCompletedSets = 0;

    // Cycle through 3 splits: Push, Pull, Legs (3 exercises per workout)
    const splitIndex = i % 3;
    let selectedDefs: readonly BenchmarkExerciseDef[];

    if (splitIndex === 0) {
      selectedDefs = [BENCHMARK_EXERCISES[0], BENCHMARK_EXERCISES[3], BENCHMARK_EXERCISES[4]];
    } else if (splitIndex === 1) {
      selectedDefs = [BENCHMARK_EXERCISES[2], BENCHMARK_EXERCISES[4], BENCHMARK_EXERCISES[5]];
    } else {
      selectedDefs = [BENCHMARK_EXERCISES[1], BENCHMARK_EXERCISES[0], BENCHMARK_EXERCISES[3]];
    }

    selectedDefs.forEach((def, exIdx) => {
      // Calculate realistic progressive overload weight
      const progressionStep = Math.floor(i / 3);
      const currentWeight =
        Math.round((def.baseWeight + progressionStep * def.progressionRateKg) * 10) / 10;

      const sets: ExerciseSet[] = [];
      let exerciseVolumeKg = 0;
      let exerciseReps = 0;

      // 4 sets per exercise (1 warmup + 3 working)
      for (let s = 1; s <= 4; s++) {
        const isWarmup = s === 1;
        const setWeight = isWarmup ? Math.max(20, Math.round(currentWeight * 0.6)) : currentWeight;
        const reps = isWarmup ? 12 : 8 + (s % 3); // 8-10 reps

        const setObj: ExerciseSet = {
          id: `bench-set-${i}-${exIdx}-${s}`,
          setNumber: s,
          type: isWarmup ? SetType.WARMUP : SetType.NORMAL,
          weight: setWeight,
          reps,
          completed: true,
          completedAt: new Date(
            sessionDate.getTime() + (exIdx * 15 + s * 3) * 60 * 1000,
          ).toISOString(),
          rpe: isWarmup ? 6 : 8 + s * 0.5,
          rir: isWarmup ? 4 : 2,
        };

        sets.push(setObj);
        exerciseVolumeKg += setWeight * reps;
        exerciseReps += reps;
        workoutCompletedSets++;
      }

      sessionExercises.push({
        exerciseId: def.id,
        exerciseName: def.name,
        sets,
        totalVolumeKg: exerciseVolumeKg,
        totalReps: exerciseReps,
      });

      workoutVolumeKg += exerciseVolumeKg;
      workoutTotalReps += exerciseReps;
    });

    const snapshot: WorkoutSnapshot = {
      id: `benchmark-snapshot-${i + 1}`,
      schemaVersion: 1,
      sourceWorkoutId: `benchmark-workout-${i + 1}`,
      title: `Treino #${i + 1} (${splitIndex === 0 ? 'Push' : splitIndex === 1 ? 'Pull' : 'Legs'})`,
      startedAt: sessionDate.toISOString(),
      completedAt: completedDate.toISOString(),
      activeDurationMs: 50 * 60 * 1000, // 50 mins active
      totalDurationMs: 60 * 60 * 1000, // 60 mins total
      exercises: sessionExercises,
      totalVolumeKg: workoutVolumeKg,
      totalReps: workoutTotalReps,
      completedSetsCount: workoutCompletedSets,
      revision: 1,
    };

    snapshots.push(snapshot);
  }

  return snapshots;
}
