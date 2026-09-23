import type { Exercise } from '../domain/entities/exercise.js';
import type {
  ExerciseMediaProvider,
  ResolvedExerciseMedia,
  ExerciseMediaAttribution,
} from './exercise-media-provider.js';
import { BryllimWorkoutGuideMediaProvider } from './bryllim-workout-guide-provider.js';
import { LocalIconMediaProvider } from './fallback-media-provider.js';

export class CompositeExerciseMediaProvider {
  private readonly primaryProvider: ExerciseMediaProvider;
  private readonly fallbackProvider: LocalIconMediaProvider;

  constructor(
    primaryProvider: ExerciseMediaProvider = new BryllimWorkoutGuideMediaProvider(),
    fallbackProvider: LocalIconMediaProvider = new LocalIconMediaProvider(),
  ) {
    this.primaryProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider;
  }

  /**
   * Resolves the highest quality media available for the exercise following the fallback chain:
   * 1. frames (multi-frame animation)
   * 2. thumbnail (static image)
   * 3. icon (local vector SVG)
   * 4. text instructions (always available)
   */
  resolveMedia(exercise: Exercise): ResolvedExerciseMedia {
    const instructions = exercise.instructions;

    // 1. Try multi-frame animation from primary provider
    if (this.primaryProvider.isAvailable(exercise)) {
      const gif = this.primaryProvider.getGif?.(exercise);
      if (gif)
        return {
          tier: 'gif',
          gif,
          frames: this.primaryProvider.getFrames(exercise) ?? undefined,
          thumbnail: this.primaryProvider.getThumbnail(exercise) ?? undefined,
          instructions,
          attribution: this.primaryProvider.getAttribution(exercise) ?? undefined,
        };
      const frames = this.primaryProvider.getFrames(exercise);
      if (frames && frames.length > 0) {
        return {
          tier: 'frames',
          frames,
          thumbnail: this.primaryProvider.getThumbnail(exercise) ?? frames[0],
          instructions,
          attribution: this.primaryProvider.getAttribution(exercise) ?? undefined,
        };
      }

      // 2. Try single thumbnail image from primary provider
      const thumbnail = this.primaryProvider.getThumbnail(exercise);
      if (thumbnail) {
        return {
          tier: 'thumbnail',
          thumbnail,
          instructions,
          attribution: this.primaryProvider.getAttribution(exercise) ?? undefined,
        };
      }
    }

    // 3. Fallback to local vector SVG icon
    const iconSvg = this.fallbackProvider.getIconSvg(exercise);
    if (iconSvg) {
      return {
        tier: 'icon',
        iconSvg,
        instructions,
        attribution: this.fallbackProvider.getAttribution() ?? undefined,
      };
    }

    // 4. Pure text instructions
    return {
      tier: 'instructions',
      instructions,
    };
  }

  getPrimaryProvider(): ExerciseMediaProvider {
    return this.primaryProvider;
  }

  getFallbackProvider(): LocalIconMediaProvider {
    return this.fallbackProvider;
  }

  getAttribution(exercise: Exercise): ExerciseMediaAttribution | null {
    if (this.primaryProvider.isAvailable(exercise)) {
      return this.primaryProvider.getAttribution(exercise);
    }
    return this.fallbackProvider.getAttribution();
  }
}
