import type { EntityId } from '../common/types.js';
import { SetType } from '../enums/set-type.js';

/**
 * Template for a planned set within a Routine or Exercise slot.
 * Preserves stable identity across edits and program cycles.
 */
export interface SetTemplate {
  /** Stable set identifier */
  readonly id: EntityId;
  /** Set type (Normal, Warmup, Top Set, etc.) */
  readonly type: SetType;
  /** Planned target load (kg) */
  readonly targetLoad?: number;
  /** Fixed target reps (if applicable) */
  readonly targetReps?: number;
  /** Lower bound of target rep range */
  readonly minReps?: number;
  /** Upper bound of target rep range */
  readonly maxReps?: number;
  /** Planned target RPE (6.0 - 10.0) */
  readonly targetRpe?: number;
  /** Planned target RIR (0 - 5) */
  readonly targetRir?: number;
  /** Planned duration in seconds (for timed/isometric sets) */
  readonly targetDurationSeconds?: number;
  /** Planned rest target in seconds */
  readonly restSeconds?: number;
  /** Execution notes or technique cues */
  readonly notes?: string;
}
