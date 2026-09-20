import type { BaseEntity, EntityId } from '../common/types.js';
import type { WeekPhase } from '../enums/week-phase.js';

/**
 * ProgramWeek represents a microcycle (usually 7 days) within a training Program.
 */
export interface ProgramWeek extends BaseEntity {
  /** Parent program identifier */
  readonly programId: EntityId;
  /** Optional parent mesocycle identifier */
  readonly mesocycleId?: EntityId;
  /** 1-based sequential week number in the program */
  readonly weekNumber: number;
  /** Periodization phase tag (e.g. DELOAD, ACCUMULATION) */
  readonly weekPhase?: WeekPhase;
  /** Optional custom title (e.g. 'Semana de Introdução', 'Pico de Força') */
  readonly name?: string;
  /** Ordered list of routine IDs assigned to this week */
  readonly routineIds: readonly EntityId[];
  /** Relative volume multiplier (e.g. 0.7 for deload, 1.0 for standard) */
  readonly volumeFactor?: number;
  /** Recommended target RIR for compounds across the week */
  readonly targetRir?: number;
  /** Week-specific instructions or guidance */
  readonly notes?: string;
}
