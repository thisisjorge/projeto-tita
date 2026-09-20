import type { EntityId, ISODateTimeString } from '../common/types.js';
import type { ExerciseSet } from './exercise-set.js';
import type { ExerciseSubstitution } from '../workout/substitution.js';

/** Frozen exercise performance in a completed workout snapshot */
export interface SnapshotExercise {
  readonly exerciseId: EntityId;
  readonly exerciseName: string;
  readonly sets: readonly ExerciseSet[];
  readonly totalVolumeKg: number;
  readonly totalReps: number;
}

/**
 * WorkoutSnapshot represents an immutable historical record of a completed workout.
 * Once created, it is never mutated in-place; corrections create a new revision.
 */
export interface WorkoutSnapshot {
  readonly substitutions?: readonly ExerciseSubstitution[];
  /** Stable snapshot identifier */
  readonly id: EntityId;
  /** Schema version for data evolution */
  readonly schemaVersion: number;
  /** Identifier of the originating active workout session */
  readonly sourceWorkoutId: EntityId;
  /** Identifier of the template routine (if instantiated from one) */
  readonly sourceRoutineId?: EntityId;
  /** Workout title at finalization time */
  readonly title: string;
  /** UTC session start timestamp */
  readonly startedAt: ISODateTimeString;
  /** UTC completion timestamp */
  readonly completedAt: ISODateTimeString;
  /** Total active duration in milliseconds (excluding pauses) */
  readonly activeDurationMs: number;
  /** Total wall-clock elapsed duration in milliseconds */
  readonly totalDurationMs: number;
  /** Snapshot of all exercises performed */
  readonly exercises: readonly SnapshotExercise[];
  /** Aggregate training volume (sum of load * reps for working sets) */
  readonly totalVolumeKg: number;
  /** Total completed repetitions across all sets */
  readonly totalReps: number;
  /** Total number of completed working sets */
  readonly completedSetsCount: number;
  /** Lifter session notes */
  readonly notes?: string;
  /** Snapshot revision count (starts at 1; incremented upon explicit correction) */
  readonly revision: number;
}
