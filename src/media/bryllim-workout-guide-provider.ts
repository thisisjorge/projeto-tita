import type { Exercise } from '../domain/entities/exercise.js';
import { EXERCISE_MEDIA_SLUGS } from '../data/catalog-generated.js';
import type { ExerciseMediaProvider, ExerciseMediaAttribution } from './exercise-media-provider.js';

export class BryllimWorkoutGuideMediaProvider implements ExerciseMediaProvider {
  readonly providerId = 'bryllim-workout-guide';
  private resolveSlug(exercise: Exercise): string | null {
    // Identity prevents custom aliases from selecting unrelated illustrations.
    return exercise.source === 'system' ? EXERCISE_MEDIA_SLUGS[exercise.id] || null : null;
  }
  isAvailable(exercise: Exercise): boolean {
    return this.resolveSlug(exercise) !== null;
  }
  getThumbnail(exercise: Exercise): string | null {
    return this.getFrames(exercise)?.[0] ?? null;
  }
  getFrames(exercise: Exercise): readonly string[] | null {
    const slug = this.resolveSlug(exercise);
    return slug ? [1, 2, 3].map((frame) => `/media/exercises/${slug}/frame-${frame}.svg`) : null;
  }
  getAttribution(exercise: Exercise): ExerciseMediaAttribution | null {
    if (!this.isAvailable(exercise)) return null;
    return {
      author: 'Bryl Lim / Everkinetic',
      license: 'CC BY-SA 4.0',
      sourceUrl:
        'https://github.com/bryllim/workout-guide/tree/aac599224bb9780305239607ef98540b7e0ce389',
      notice:
        'Frames licenciados; GIF derivado pelo Projeto Titã. Proveniência em /media/ATTRIBUTION.md.',
    };
  }
  getGif(exercise: Exercise): string | null {
    const slug = this.resolveSlug(exercise);
    return slug ? `/media/exercises/${slug}/animation.gif` : null;
  }
}
