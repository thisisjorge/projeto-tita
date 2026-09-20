import type { BaseEntity, EntityId } from '../common/types.js';
import type { ProgressionStrategyType } from '../enums/progression-strategy-type.js';
import type { Mesocycle } from './mesocycle.js';
import type { ProgramWeek } from './program-week.js';

/**
 * Program entity representing an overall training plan or periodized mesocycle stack.
 * Users own their program copies; built-in templates clone into user-owned Programs.
 */
export interface Program extends BaseEntity {
  /** Program name (e.g. 'PPL 12 Semanas', 'Upper / Lower 4 Dias') */
  readonly name: string;
  /** Detailed description or coaching intent */
  readonly description?: string;
  /** Reference identifier if instantiated from a system template */
  readonly templateRef?: string;
  /** Primary progression strategy applied across the program */
  readonly progressionStrategy: ProgressionStrategyType;
  /** Total duration in weeks */
  readonly durationWeeks: number;
  /** Planned training days per week */
  readonly daysPerWeek: number;
  /** Optional mesocycle block definitions */
  readonly mesocycles?: readonly Mesocycle[];
  /** Ordered list of training weeks */
  readonly weeks: readonly ProgramWeek[];
  /** Whether this program is currently active for the lifter */
  readonly active: boolean;
}
