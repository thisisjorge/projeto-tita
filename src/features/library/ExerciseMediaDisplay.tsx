import React, { useState, useEffect, useMemo } from 'react';
import type { Exercise } from '../../domain/entities/exercise.js';
import { CompositeExerciseMediaProvider } from '../../media/composite-media-provider.js';
import { PlayIcon, PauseIcon } from '../../ui/components/icons.js';

interface ExerciseMediaDisplayProps {
  exercise: Exercise;
  provider?: CompositeExerciseMediaProvider;
}

export const ExerciseMediaDisplay: React.FC<ExerciseMediaDisplayProps> = ({
  exercise,
  provider,
}) => {
  const mediaProvider = useMemo(() => provider ?? new CompositeExerciseMediaProvider(), [provider]);
  const media = useMemo(() => mediaProvider.resolveMedia(exercise), [exercise, mediaProvider]);
  const [failed, setFailed] = useState<string[]>([]);
  const [playing, setPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => {
      if (preference.matches) setPlaying(false);
    };
    preference.addEventListener('change', stop);
    return () => preference.removeEventListener('change', stop);
  }, []);
  const sources = [playing ? media.gif : undefined, media.thumbnail, ...(media.frames ?? [])];
  const source = sources.find((url): url is string => !!url && !failed.includes(url));
  const animated = !!source && source === media.gif;
  return (
    <div
      className="tita-exercise-media"
      data-testid={
        source
          ? animated
            ? 'exercise-media-gif'
            : 'exercise-media-thumbnail'
          : 'exercise-media-fallback'
      }
    >
      {source ? (
        <img
          className="tita-exercise-illustration"
          src={source}
          alt={`${exercise.name}${animated ? ' · movimento' : ' · posição de referência'}`}
          onError={() => setFailed((previous) => [...previous, source])}
        />
      ) : (
        <div
          className="tita-exercise-media__fallback"
          aria-hidden="true"
          dangerouslySetInnerHTML={{
            __html: mediaProvider.getFallbackProvider().getIconSvg(exercise),
          }}
        />
      )}
      {media.gif && !failed.includes(media.gif) && source && (
        <button
          type="button"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? 'Pausar animação' : 'Reproduzir animação'}
        >
          {playing ? <PauseIcon aria-hidden="true" /> : <PlayIcon aria-hidden="true" />}
          {playing ? 'Pausar' : 'Reproduzir movimento'}
        </button>
      )}
      {media.attribution && (
        <small>
          <a href={media.attribution.sourceUrl} target="_blank" rel="noreferrer">
            {media.attribution.author}
          </a>{' '}
          · {media.attribution.license}
        </small>
      )}
    </div>
  );
};
