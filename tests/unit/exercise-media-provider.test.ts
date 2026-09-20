import { describe, it, expect } from 'vitest';
import { BryllimWorkoutGuideMediaProvider } from '../../src/media/bryllim-workout-guide-provider.js';
import { LocalIconMediaProvider } from '../../src/media/fallback-media-provider.js';
import { CompositeExerciseMediaProvider } from '../../src/media/composite-media-provider.js';
import { SEED_EXERCISES } from '../../src/data/seed-exercises.js';
import type { Exercise } from '../../src/domain/entities/exercise.js';
import { ExerciseRole } from '../../src/domain/enums/exercise-role.js';

describe('Exercise Media Providers (Task 6.2)', () => {
  const benchPress = SEED_EXERCISES.find((e) => e.name === 'Supino Reto com Barra')!;
  const customExercise: Exercise = {
    id: 'custom-1',
    schemaVersion: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name: 'Exercício Desconhecido Custom',
    aliases: [],
    primaryMuscle: 'Peito',
    secondaryMuscles: [],
    equipment: 'Outro',
    category: 'Hipertrofia',
    instructions: ['Instrução custom.'],
    source: 'custom',
    roles: [ExerciseRole.HORIZONTAL_PRESS],
  };

  describe('BryllimWorkoutGuideMediaProvider', () => {
    const provider = new BryllimWorkoutGuideMediaProvider();

    it('identifies availability for mapped canonical exercises', () => {
      expect(provider.isAvailable(benchPress)).toBe(true);
      expect(provider.getThumbnail(benchPress)).toContain('bench-press.svg');

      const frames = provider.getFrames(benchPress);
      expect(frames).toHaveLength(2);
      expect(frames![0]).toContain('frame-1.svg');
      expect(frames![1]).toContain('frame-2.svg');
    });

    it('returns attribution with CC BY-SA 4.0 license', () => {
      const attribution = provider.getAttribution(benchPress);
      expect(attribution).not.toBeNull();
      expect(attribution?.license).toBe('CC BY-SA 4.0');
      expect(attribution?.author).toBe('Bryllim');
      expect(attribution?.sourceUrl).toContain('workout-guide');
    });

    it('returns false/null for custom or unmapped exercises', () => {
      expect(provider.isAvailable(customExercise)).toBe(false);
      expect(provider.getThumbnail(customExercise)).toBeNull();
      expect(provider.getFrames(customExercise)).toBeNull();
      expect(provider.getAttribution(customExercise)).toBeNull();
    });
  });

  describe('LocalIconMediaProvider', () => {
    const provider = new LocalIconMediaProvider();

    it('is always available offline for any exercise', () => {
      expect(provider.isAvailable()).toBe(true);
      expect(provider.getThumbnail(benchPress)).toContain('data:image/svg+xml');
      expect(provider.getThumbnail(customExercise)).toContain('data:image/svg+xml');
    });

    it('returns specific vector SVG for known muscle groups and default for unknown', () => {
      const chestSvg = provider.getIconSvg(benchPress);
      expect(chestSvg).toContain('<svg');

      const unknownMuscleEx: Exercise = {
        ...customExercise,
        primaryMuscle: 'Músculo Inexistente',
      };
      const defaultSvg = provider.getIconSvg(unknownMuscleEx);
      expect(defaultSvg).toContain('<svg');
    });
  });

  describe('CompositeExerciseMediaProvider Fallback Chain', () => {
    const composite = new CompositeExerciseMediaProvider();

    it('resolves tier: frames for mapped canonical exercise', () => {
      const media = composite.resolveMedia(benchPress);
      expect(media.tier).toBe('frames');
      expect(media.frames).toHaveLength(2);
      expect(media.thumbnail).toBeDefined();
      expect(media.instructions).toEqual(benchPress.instructions);
      expect(media.attribution?.license).toBe('CC BY-SA 4.0');
    });

    it('gracefully falls back to tier: icon for custom exercise when primary is unavailable', () => {
      const media = composite.resolveMedia(customExercise);
      expect(media.tier).toBe('icon');
      expect(media.iconSvg).toBeDefined();
      expect(media.instructions).toEqual(customExercise.instructions);
      expect(media.attribution?.license).toBe('MIT');
    });

    it('handles simulated offline state by falling back to local icon', () => {
      const offlineProvider = {
        providerId: 'mock-offline',
        isAvailable: () => false,
        getThumbnail: () => null,
        getFrames: () => null,
        getAttribution: () => null,
      };

      const offlineComposite = new CompositeExerciseMediaProvider(
        offlineProvider,
        new LocalIconMediaProvider(),
      );

      const media = offlineComposite.resolveMedia(benchPress);
      expect(media.tier).toBe('icon');
      expect(media.iconSvg).toBeDefined();
      expect(media.instructions).toEqual(benchPress.instructions);
    });
  });
});
