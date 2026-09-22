import React, { useState, useEffect, useMemo } from 'react';
import type { Exercise } from '../../domain/entities/exercise.js';
import { CompositeExerciseMediaProvider } from '../../media/composite-media-provider.js';
import type { ResolvedExerciseMedia } from '../../media/exercise-media-provider.js';

interface ExerciseMediaDisplayProps {
  exercise: Exercise;
  provider?: CompositeExerciseMediaProvider;
}

export const ExerciseMediaDisplay: React.FC<ExerciseMediaDisplayProps> = ({
  exercise,
  provider,
}) => {
  const mediaProvider = useMemo(() => provider ?? new CompositeExerciseMediaProvider(), [provider]);
  const [resolvedMedia, setResolvedMedia] = useState<ResolvedExerciseMedia>(() =>
    mediaProvider.resolveMedia(exercise),
  );
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stopAnimation = () => {
      if (preference.matches) setIsPlaying(false);
    };
    preference.addEventListener('change', stopAnimation);
    return () => preference.removeEventListener('change', stopAnimation);
  }, []);

  // Update media resolution if exercise changes. Keep the provider stable so frame updates
  // do not recreate it and reset the animation back to frame zero on every render.
  useEffect(() => {
    setResolvedMedia(mediaProvider.resolveMedia(exercise));
    setActiveFrameIndex(0);
    setHasImageError(false);
  }, [exercise, mediaProvider]);

  // Frame animation timer if frames tier is active
  useEffect(() => {
    if (resolvedMedia.tier !== 'frames' || !resolvedMedia.frames || !isPlaying || hasImageError) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveFrameIndex((prev) => (prev + 1) % (resolvedMedia.frames?.length || 1));
    }, 750);

    return () => clearInterval(interval);
  }, [resolvedMedia, isPlaying, hasImageError]);

  const handleImageError = () => {
    setHasImageError(true);
  };

  // If image errored or tier is icon/instructions, render vector SVG
  if (hasImageError || resolvedMedia.tier === 'icon' || resolvedMedia.tier === 'instructions') {
    const fallbackSvg = mediaProvider.getFallbackProvider().getIconSvg(exercise);
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--tita-space-4)',
          backgroundColor: 'var(--tita-surface-2)',
          borderRadius: 'var(--tita-radius-md)',
          border: '1px solid var(--tita-border)',
          minHeight: '180px',
        }}
        data-testid="exercise-media-fallback"
      >
        <div
          style={{ width: '64px', height: '64px', color: 'var(--tita-accent)' }}
          dangerouslySetInnerHTML={{ __html: fallbackSvg }}
        />
        <span
          style={{
            fontSize: 'var(--tita-text-xs)',
            color: 'var(--tita-text-muted)',
            marginTop: 'var(--tita-space-2)',
          }}
        >
          {exercise.primaryMuscle} • {exercise.equipment}
        </span>
      </div>
    );
  }

  // Multi-frame animation display
  if (resolvedMedia.tier === 'frames' && resolvedMedia.frames) {
    const currentFrameUrl = resolvedMedia.frames[activeFrameIndex];
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'var(--tita-surface-2)',
          borderRadius: 'var(--tita-radius-md)',
          border: '1px solid var(--tita-border)',
          overflow: 'hidden',
        }}
        data-testid="exercise-media-frames"
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxHeight: '240px',
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: 'var(--tita-surface-2)',
          }}
        >
          <img
            className="tita-exercise-illustration"
            src={currentFrameUrl}
            alt={`${exercise.name} - quadro ${activeFrameIndex + 1}`}
            onError={handleImageError}
            style={{
              maxHeight: '240px',
              maxWidth: '100%',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? 'Pausar animação' : 'Reproduzir animação'}
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--tita-radius-sm)',
              padding: '4px 8px',
              minHeight: '44px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {isPlaying ? '⏸ Pausar' : '▶ Animar'}
          </button>
        </div>

        {/* Frame indicator dots */}
        <div style={{ display: 'flex', gap: '6px', padding: 'var(--tita-space-2)' }}>
          {resolvedMedia.frames.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  idx === activeFrameIndex ? 'var(--tita-accent)' : 'var(--tita-border)',
                transition: 'background-color 0.2s ease',
              }}
            />
          ))}
        </div>

        {resolvedMedia.attribution && (
          <div
            style={{
              padding: 'var(--tita-space-1) var(--tita-space-2)',
              fontSize: '11px',
              color: 'var(--tita-text-muted)',
              textAlign: 'center',
              borderTop: '1px solid var(--tita-border)',
              width: '100%',
            }}
          >
            {resolvedMedia.attribution.author} ({resolvedMedia.attribution.license})
          </div>
        )}
      </div>
    );
  }

  // Single thumbnail display
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'var(--tita-surface-2)',
        borderRadius: 'var(--tita-radius-md)',
        border: '1px solid var(--tita-border)',
        overflow: 'hidden',
      }}
      data-testid="exercise-media-thumbnail"
    >
      <img
        className="tita-exercise-illustration"
        src={resolvedMedia.thumbnail}
        alt={exercise.name}
        onError={handleImageError}
        style={{
          maxHeight: '220px',
          width: 'auto',
          objectFit: 'contain',
        }}
      />
      {resolvedMedia.attribution && (
        <div
          style={{
            padding: 'var(--tita-space-1)',
            fontSize: '11px',
            color: 'var(--tita-text-muted)',
          }}
        >
          {resolvedMedia.attribution.author} ({resolvedMedia.attribution.license})
        </div>
      )}
    </div>
  );
};
