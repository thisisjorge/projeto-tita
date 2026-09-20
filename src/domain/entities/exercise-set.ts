import type { EntityId, ISODateTimeString } from '../common/types.js';
import type { SetType } from '../enums/set-type.js';

/**
 * ExerciseSet represents an individual set performed (or planned) during an ActiveWorkout.
 * Designed with progressive disclosure: basic fields are simple; advanced fields are optional.
 *
 * NOTE: 0 is a valid value for weight (bodyweight), reps (failed rep attempt),
 * painLevel (pain-free), and rir (0 RIR = failure). Never treat 0 as absent.
 */
export interface ExerciseSet {
  /** Stable set identifier */
  readonly id: EntityId;
  /** 1-based sequential set number within the exercise */
  readonly setNumber: number;
  /** Category of the set (NORMAL, WARMUP, TOP_SET, etc.) */
  readonly type: SetType;

  // --- Basic Logging Fields ---
  /**
   * Load in kilograms.
   * 0 indicates pure bodyweight or unweighted movement.
   * Undefined indicates not yet recorded.
   */
  readonly weight?: number;
  /**
   * Number of completed repetitions.
   * 0 indicates an attempt where 0 reps were successfully completed.
   * Undefined indicates not yet recorded.
   */
  readonly reps?: number;
  /** Whether the set has been completed by the lifter */
  readonly completed: boolean;
  /** Exact UTC timestamp when completion was registered */
  readonly completedAt?: ISODateTimeString;

  // --- Advanced / Progressive Disclosure Fields (Optional) ---
  /** Duration in seconds (for timed, isometric, or cardio work) */
  readonly durationSeconds?: number;
  /** Distance in meters (for endurance or sled work) */
  readonly distanceMeters?: number;
  /** Rating of Perceived Exertion (typically 6.0 to 10.0 in 0.5 steps) */
  readonly rpe?: number;
  /** Reps In Reserve (typically 0 to 5) */
  readonly rir?: number;
  /** Eccentric-Isometric-Concentric-Pause tempo notation (e.g. '3-1-1-0') */
  readonly tempo?: string;
  /** Target rest duration in seconds triggered upon completion */
  readonly restTargetSeconds?: number;
  /** Actual rest taken in seconds before this set was initiated */
  readonly restActualSeconds?: number;
  /** Subjective joint discomfort/pain rating (0 = pain-free, 5 = severe) */
  readonly painLevel?: number;
  /** Subjective set feedback or lifter notes */
  readonly notes?: string;
  /** Associated superset or circuit group identifier */
  readonly groupId?: EntityId;
}
