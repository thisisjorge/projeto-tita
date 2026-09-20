import type { BaseEntity, EntityId } from '../common/types.js';
import type { GroupType } from '../enums/group-type.js';
import type { ProgressionStrategyType } from '../enums/progression-strategy-type.js';
import type { SetTemplate } from './set-template.js';

/**
 * Exercise entry planned within a Routine.
 */
export interface RoutineExercise {
  /** Stable identifier for this exercise slot */
  readonly id: EntityId;
  /** Reference to target Exercise entity */
  readonly exerciseId: EntityId;
  /** Sequence index for ordering */
  readonly order: number;
  /** Planned sets */
  readonly sets: readonly SetTemplate[];
  /** Optional override for rest seconds between sets */
  readonly restSeconds?: number;
  /** Optional slot-specific cues or notes */
  readonly notes?: string;
  /** Optional specific progression strategy for this exercise */
  readonly progressionStrategy?: ProgressionStrategyType;
}

/**
 * Grouped exercises (e.g. Superset, Tri-set, Circuit) within a routine.
 */
export interface RoutineGroup {
  /** Stable group identifier */
  readonly id: EntityId;
  /** Type of grouped work */
  readonly type: GroupType;
  /** RoutineExercise IDs belonging to this group */
  readonly exerciseSlotIds: readonly EntityId[];
  /** Rest in seconds after completing the entire group */
  readonly restAfterSeconds?: number;
}

/**
 * Routine entity representing a planned workout template.
 * Archiving or modifying a Routine does NOT corrupt past WorkoutSnapshots.
 */
export interface Routine extends BaseEntity {
  /** Name of the routine (e.g. 'Costas + Bíceps', 'Upper A') */
  readonly name: string;
  /** Optional descriptive notes or guidelines */
  readonly notes?: string;
  /** Optional link to a parent Program */
  readonly programId?: EntityId;
  /** Ordered list of exercise slots */
  readonly exercises: readonly RoutineExercise[];
  /** Optional superset/circuit groupings */
  readonly groups?: readonly RoutineGroup[];
  /** Default progression strategy applied to exercises in this routine */
  readonly defaultProgressionStrategy?: ProgressionStrategyType;
}
