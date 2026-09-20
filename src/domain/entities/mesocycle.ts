import type { BaseEntity, EntityId } from '../common/types.js';
import type { WeekPhase } from '../enums/week-phase.js';

/**
 * Mesocycle represents an optional multi-week block within a periodized Program.
 */
export interface Mesocycle extends BaseEntity {
  /** Parent program identifier */
  readonly programId: EntityId;
  /** Block name (e.g. 'Hipertrofia - Bloco 1', 'Intensificação') */
  readonly name: string;
  /** Ordering index within the program */
  readonly order: number;
  /** Primary focus phase */
  readonly phase?: WeekPhase;
  /** Starting week number (inclusive, 1-based) */
  readonly startWeek: number;
  /** Ending week number (inclusive, 1-based) */
  readonly endWeek: number;
  /** Main physical or technical objective */
  readonly objective?: string;
  /** Block guidelines */
  readonly notes?: string;
}
