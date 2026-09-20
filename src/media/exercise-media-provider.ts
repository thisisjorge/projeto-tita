import type { Exercise } from '../domain/entities/exercise.js';

export interface ExerciseMediaAttribution {
  readonly author: string;
  readonly license: string; // e.g. 'CC BY-SA 4.0', 'MIT', 'Public Domain'
  readonly sourceUrl: string;
  readonly notice?: string;
}

export type MediaFallbackTier = 'frames' | 'thumbnail' | 'icon' | 'instructions';

export interface ResolvedExerciseMedia {
  readonly tier: MediaFallbackTier;
  readonly frames?: readonly string[];
  readonly thumbnail?: string;
  readonly iconSvg?: string;
  readonly instructions: readonly string[];
  readonly attribution?: ExerciseMediaAttribution;
}

/**
 * Interface for exercise media providers.
 * Decouples domain entities from external asset sources.
 */
export interface ExerciseMediaProvider {
  readonly providerId: string;
  isAvailable(exercise: Exercise): boolean;
  getThumbnail(exercise: Exercise): string | null;
  getFrames(exercise: Exercise): readonly string[] | null;
  getAttribution(exercise: Exercise): ExerciseMediaAttribution | null;
}
