import type { EntityId, ISODateTimeString } from '../common/types.js';
import type { TimerStatus } from '../enums/timer-status.js';

/**
 * Deadline-based rest timer.
 * Calculated against absolute timestamps (deadlineAt - now) rather than memory ticks,
 * ensuring seamless recovery across page reload, backgrounding, and device sleeps.
 */
export interface RestTimer {
  /** Stable timer identifier */
  readonly id: EntityId;
  /** Active workout session owning this timer */
  readonly workoutId?: EntityId;
  /** Target rest duration in seconds */
  readonly durationSeconds: number;
  /** UTC timestamp when the timer was started */
  readonly startedAt: ISODateTimeString;
  /** Absolute UTC deadline when rest concludes */
  readonly deadlineAt: ISODateTimeString;
  /** Current lifecycle status */
  readonly status: TimerStatus;
  /** Timestamp when paused (if currently paused) */
  readonly pausedAt?: ISODateTimeString;
  /** Remaining duration in milliseconds preserved at pause time */
  readonly remainingMsWhenPaused?: number;
}
