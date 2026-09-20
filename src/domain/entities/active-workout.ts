import type { BaseEntity, EntityId, ISODateTimeString } from '../common/types.js';
import type { WorkoutStatus } from '../enums/workout-status.js';
import type { ProgressionStrategyType } from '../enums/progression-strategy-type.js';
import type { RoutineGroup } from './routine.js';
import type { ExerciseSet } from './exercise-set.js';
import type { ExerciseSubstitution } from '../workout/substitution.js';

/** Interval during which an active workout was paused */
export interface PauseInterval {
  readonly pausedAt: ISODateTimeString;
  readonly resumedAt?: ISODateTimeString;
}

/** Exercise slot within an active workout session */
export interface ActiveWorkoutExercise {
  readonly id: EntityId;
  readonly exerciseId: EntityId;
  readonly exerciseName: string;
  readonly order: number;
  readonly sets: readonly ExerciseSet[];
  readonly targetRestSeconds?: number;
  readonly notes?: string;
  readonly progressionStrategy?: ProgressionStrategyType;
}

/**
 * ActiveWorkout represents a session currently underway.
 * Invariant: At most one workout session may be active ('IN_PROGRESS' or 'PAUSED') at a time.
 */
export interface ActiveWorkout extends BaseEntity {
  readonly substitutions?: readonly ExerciseSubstitution[];
  /** Display title for the workout session */
  readonly title: string;
  /** Routine ID from which this workout was instantiated (optional) */
  readonly sourceRoutineId?: EntityId;
  /** Current execution status */
  readonly status: WorkoutStatus;
  /** UTC timestamp when the session began */
  readonly startedAt: ISODateTimeString;
  /** Optional UTC timestamp when the session was finalized or cancelled */
  readonly endedAt?: ISODateTimeString;
  /** Recorded pause intervals for accurate active duration calculation */
  readonly pauseIntervals: readonly PauseInterval[];
  /** Exercises and logged sets */
  readonly exercises: readonly ActiveWorkoutExercise[];
  /** Optional superset/circuit groupings in active session */
  readonly groups?: readonly RoutineGroup[];
  /** Identifier of the currently active rest timer, if any */
  readonly activeTimerId?: EntityId;
  /** Session-level notes */
  readonly notes?: string;
}
