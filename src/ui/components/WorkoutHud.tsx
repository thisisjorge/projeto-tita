import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from './Button.js';
import { TimerIcon, PlusIcon } from './icons.js';

export interface WorkoutHudProps {
  remainingSeconds?: number;
  timerStatus?: 'RUNNING' | 'PAUSED' | 'IDLE';
  completedSetsCount: number;
  totalSetsCount: number;
  onTimerAdd30?: () => void;
  onFinalize: () => void;
  onPauseResume?: () => void;
  isPaused?: boolean;
  activeExerciseName?: string;
  totalVolumeKg?: number;
  workoutDurationMinutes?: number;
  onMinimize?: () => void;
}

export const MobileWorkoutHud: React.FC<WorkoutHudProps> = ({
  remainingSeconds = 0,
  timerStatus = 'IDLE',
  completedSetsCount,
  totalSetsCount,
  onTimerAdd30,
  onFinalize,
  onPauseResume,
  isPaused = false,
  onMinimize,
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const isTimerActive = timerStatus === 'RUNNING';
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className="tita-mobile-hud"
      style={{
        position: 'fixed',
        bottom: 'var(--tita-nav-height-mobile)',
        left: 0,
        right: 0,
        zIndex: 25,
        backgroundColor: 'var(--tita-surface)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--tita-border)',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.5)',
        padding: '6px 10px',
        paddingBottom: 'calc(6px + env(safe-area-inset-bottom, 0px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '6px',
      }}
      data-testid="mobile-workout-hud"
    >
      {/* Overflow Action Sheet / Popover when menu is open */}
      {isMenuOpen && (
        <>
          <div
            onClick={() => setIsMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 26,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
            }}
            aria-hidden="true"
          />
          <div
            role="menu"
            aria-label="Opções secundárias de treino"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              right: '10px',
              zIndex: 27,
              backgroundColor: 'var(--tita-surface-2)',
              border: '1px solid var(--tita-border)',
              borderRadius: 'var(--tita-radius-md)',
              padding: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              minWidth: '160px',
            }}
          >
            {onPauseResume && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onPauseResume();
                }}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--tita-radius-sm)',
                  color: 'var(--tita-text)',
                  fontSize: 'var(--tita-text-sm)',
                  fontWeight: 'var(--tita-weight-medium)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '44px',
                }}
              >
                <span>{isPaused ? 'Retomar Treino' : 'Pausar Treino'}</span>
                <span style={{ fontSize: '12px', color: 'var(--tita-text-muted)' }}>
                  {isPaused ? '▶' : '⏸'}
                </span>
              </button>
            )}
            {onMinimize && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setIsMenuOpen(false);
                  onMinimize();
                }}
                style={{
                  padding: '10px 14px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--tita-radius-sm)',
                  color: 'var(--tita-text-muted)',
                  fontSize: 'var(--tita-text-sm)',
                  fontWeight: 'var(--tita-weight-medium)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '44px',
                }}
              >
                <span>Navegar pelo App</span>
                <span style={{ fontSize: '12px' }}>↗</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Left Group: Rest Timer & +30s Bump */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: isTimerActive ? 'rgba(16, 185, 129, 0.14)' : 'var(--tita-surface-2)',
            border: `1px solid ${isTimerActive ? 'var(--tita-accent)' : 'var(--tita-border)'}`,
            padding: '4px 8px',
            borderRadius: 'var(--tita-radius-sm)',
            minHeight: '36px',
          }}
          aria-label={`Temporizador de descanso: ${formatTime(remainingSeconds)}`}
        >
          <TimerIcon
            size={14}
            color={isTimerActive ? 'var(--tita-accent)' : 'var(--tita-text-muted)'}
          />
          <span
            className="tita-num"
            style={{
              fontSize: 'var(--tita-text-sm)',
              fontWeight: 'var(--tita-weight-bold)',
              color: isTimerActive ? 'var(--tita-accent)' : 'var(--tita-text)',
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1,
            }}
          >
            {formatTime(remainingSeconds)}
          </span>
        </div>

        {onTimerAdd30 && (
          <button
            type="button"
            onClick={onTimerAdd30}
            title="Adicionar 30s ao descanso"
            aria-label="Adicionar 30 segundos ao descanso"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              backgroundColor: 'var(--tita-surface-2)',
              border: '1px solid var(--tita-border)',
              borderRadius: 'var(--tita-radius-sm)',
              color: 'var(--tita-text)',
              padding: '4px 6px',
              fontSize: '11px',
              fontWeight: 'var(--tita-weight-bold)',
              cursor: 'pointer',
              minHeight: '44px',
              minWidth: '40px',
            }}
          >
            <PlusIcon size={11} />
            <span>30s</span>
          </button>
        )}
      </div>

      {/* Center Group: Sets Completed Counter */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 2px',
          flexShrink: 0,
        }}
        aria-label={`Séries concluídas: ${completedSetsCount} de ${totalSetsCount}`}
      >
        <span
          style={{
            fontSize: '9px',
            color: 'var(--tita-text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
        >
          Séries
        </span>
        <span
          className="tita-num"
          style={{
            fontSize: 'var(--tita-text-xs)',
            fontWeight: 'var(--tita-weight-bold)',
            color: 'var(--tita-accent)',
            fontVariantNumeric: 'tabular-nums',
            marginTop: '2px',
            lineHeight: 1,
          }}
        >
          {completedSetsCount}/{totalSetsCount}
        </span>
      </div>

      {/* Right Group: Secondary Actions Menu & Finalize */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        {(onMinimize || onPauseResume) && (
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Mais opções de treino"
            aria-expanded={isMenuOpen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 8px',
              backgroundColor: isMenuOpen ? 'var(--tita-surface-3)' : 'var(--tita-surface-2)',
              border: '1px solid var(--tita-border)',
              borderRadius: 'var(--tita-radius-sm)',
              color: 'var(--tita-text-muted)',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              minHeight: '44px',
              minWidth: '40px',
            }}
            data-testid="mobile-hud-more-menu"
          >
            ⋯
          </button>
        )}

        <button
          type="button"
          onClick={onFinalize}
          style={{
            padding: '6px 12px',
            backgroundColor: 'var(--tita-primary)',
            color: 'var(--tita-primary-contrast)',
            border: 'none',
            borderRadius: 'var(--tita-radius-sm)',
            fontSize: 'var(--tita-text-xs)',
            fontWeight: 'var(--tita-weight-bold)',
            cursor: 'pointer',
            minHeight: '44px',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
          }}
          data-testid="mobile-hud-finalize-btn"
        >
          Finalizar
        </button>
      </div>
    </div>
  );
};

export const DesktopWorkoutHud: React.FC<WorkoutHudProps> = ({
  completedSetsCount,
  totalSetsCount,
  onFinalize,
  onPauseResume,
  isPaused = false,
  totalVolumeKg = 0,
}) => (
  <section
    className="tita-desktop-session"
    data-testid="desktop-workout-hud"
    aria-label="Resumo da sessão ativa"
  >
    <span className="tita-home__label">SESSÃO LOCAL</span>
    <h3>{isPaused ? 'Treino pausado' : 'Treino em andamento'}</h3>
    <p>
      Consulte as séries e ajuste os registros quando necessário. As alterações são salvas neste
      aparelho.
    </p>
    <dl>
      <div>
        <dt>Séries concluídas</dt>
        <dd>
          {completedSetsCount} / {totalSetsCount}
        </dd>
      </div>
      <div>
        <dt>Volume registrado</dt>
        <dd>{totalVolumeKg.toLocaleString('pt-BR')} kg</dd>
      </div>
    </dl>
    <Link to="/routines">Planejar rotinas →</Link>
    <Link to="/progress">Consultar progresso →</Link>
    <Button variant="secondary" onClick={onFinalize}>
      Finalizar sessão
    </Button>
    {onPauseResume && (
      <Button variant="ghost" onClick={onPauseResume}>
        {isPaused ? 'Retomar Treino' : 'Pausar Treino'}
      </Button>
    )}
  </section>
);
