import type { BaseEntity, EntityId } from '../common/types.js';
import type { ExerciseRole } from '../enums/exercise-role.js';

/** Reference to an external or bundled media asset */
export interface MediaReference {
  readonly provider: string;
  readonly type: 'svg_frames' | 'image' | 'video' | 'animation';
  readonly uri: string;
  readonly attribution?: string;
}

/**
 * Exercise entity representing a movement in the exercise library.
 * System exercises are immutable; user-created custom exercises are mutable.
 */
export interface Exercise extends BaseEntity {
  /** Display name of the exercise (e.g. 'Supino reto com barra') */
  readonly name: string;
  /** Alternate names / search terms */
  readonly aliases: readonly string[];
  /** Primary target muscle group */
  readonly primaryMuscle: string;
  /** Secondary involved muscle groups */
  readonly secondaryMuscles: readonly string[];
  /** Equipment requirement */
  readonly equipment: string;
  /** Category (e.g. 'Strength', 'Hypertrophy', 'Cardio') */
  readonly category: string;
  /** Step-by-step execution cues / instructions */
  readonly instructions: readonly string[];
  /** Optional media references (illustrations, frames) */
  readonly mediaRefs?: readonly MediaReference[];
  /** Provenance: system library or custom user exercise */
  readonly source: 'system' | 'custom';
  /** Abstract movement roles for substitutions */
  readonly roles: readonly ExerciseRole[];
  /** Default recommended rest period in seconds */
  readonly defaultRestSeconds?: number;
  /** Smallest standard load increment in kg */
  readonly increment?: number;
  /** License for instructions/content */
  readonly license?: string;
  /** Content author or attribution note */
  readonly attribution?: string;
}
