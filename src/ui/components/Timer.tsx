import React, { useEffect, useState, useRef } from 'react';
import { Button } from './Button.js';

export interface TimerProps {
  remainingSeconds: number;
  isRunning: boolean;
  onToggle?: () => void;
  onTogglePlayPause?: () => void;
  onAddSeconds?: (seconds: number) => void;
  onSkip?: () => void;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({
  remainingSeconds,
  isRunning,
  onToggle,
  onTogglePlayPause,
  onAddSeconds = () => {},
  onSkip = () => {},
  className = '',
}) => {
  const handleToggle = onToggle ?? onTogglePlayPause ?? (() => {});
  const minutes = Math.floor(Math.max(0, remainingSeconds) / 60);
  const seconds = Math.max(0, remainingSeconds) % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isFinished = remainingSeconds <= 0;

  // Screen reader milestone announcements (polite, avoids spamming every second)
  const [announcement, setAnnouncement] = useState('');
  const prevRunningRef = useRef(isRunning);
  const announcedMilestones = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Reset announced milestones on timer restart / large jump
    if (remainingSeconds > 35) {
      announcedMilestones.current.clear();
    }

    // State change: started or paused
    if (prevRunningRef.current !== isRunning) {
      if (isRunning) {
        setAnnouncement(`Descanso iniciado: ${formattedTime}`);
      } else if (!isFinished) {
        setAnnouncement(`Descanso pausado em ${formattedTime}`);
      }
      prevRunningRef.current = isRunning;
    }

    // Key milestone announcements
    if (isRunning) {
      if (remainingSeconds === 30 && !announcedMilestones.current.has(30)) {
        announcedMilestones.current.add(30);
        setAnnouncement('30 segundos restantes de descanso');
      } else if (remainingSeconds === 10 && !announcedMilestones.current.has(10)) {
        announcedMilestones.current.add(10);
        setAnnouncement('10 segundos restantes de descanso');
      } else if (isFinished && !announcedMilestones.current.has(0)) {
        announcedMilestones.current.add(0);
        setAnnouncement('Tempo de descanso concluído!');
      }
    }
  }, [remainingSeconds, isRunning, isFinished, formattedTime]);

  return (
    <div
      role="timer"
      aria-label={`Temporizador de descanso: ${formattedTime}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--tita-space-3)',
        padding: 'var(--tita-space-4)',
        backgroundColor: 'var(--tita-surface-2)',
        border: '1px solid var(--tita-border)',
        borderRadius: 'var(--tita-radius-md)',
        width: '100%',
        maxWidth: '360px',
      }}
      className={`tita-timer ${className}`.trim()}
      data-testid="rest-timer-display"
    >
      {/* Polite live region for assistive technologies */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" data-testid="timer-announcer">
        {announcement}
      </div>

      <div
        style={{
          fontSize: 'var(--tita-text-xs)',
          color: 'var(--tita-text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Descanso Entre Séries
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--tita-font-mono)',
            fontSize: '44px',
            fontWeight: 'var(--tita-weight-bold)',
            color: isFinished ? 'var(--tita-success)' : 'var(--tita-text)',
            lineHeight: 1,
          }}
        >
          {formattedTime}
        </div>

        {/* Textual status badge so color is never the sole communicator */}
        {isFinished ? (
          <span
            style={{
              fontSize: 'var(--tita-text-xs)',
              color: 'var(--tita-success)',
              fontWeight: 'var(--tita-weight-bold)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ✓ Tempo Concluído
          </span>
        ) : isRunning ? (
          <span
            style={{
              fontSize: 'var(--tita-text-xs)',
              color: 'var(--tita-primary)',
              fontWeight: 'var(--tita-weight-medium)',
            }}
          >
            ● Em andamento
          </span>
        ) : (
          <span
            style={{
              fontSize: 'var(--tita-text-xs)',
              color: 'var(--tita-text-muted)',
              fontWeight: 'var(--tita-weight-medium)',
            }}
          >
            ❚❚ Pausado
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--tita-space-2)',
          width: '100%',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAddSeconds(30)}
          aria-label="Adicionar 30 segundos ao descanso"
        >
          +30s
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onAddSeconds(60)}
          aria-label="Adicionar 1 minuto ao descanso"
        >
          +1m
        </Button>
        <Button
          variant={isRunning ? 'secondary' : 'primary'}
          size="sm"
          onClick={handleToggle}
          aria-label={
            isRunning ? 'Pausar temporizador de descanso' : 'Iniciar temporizador de descanso'
          }
        >
          {isRunning ? 'Pausar' : 'Iniciar'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onSkip} aria-label="Pular tempo de descanso">
          Pular
        </Button>
      </div>
    </div>
  );
};
