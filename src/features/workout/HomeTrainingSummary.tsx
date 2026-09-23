import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HistoryService } from '../../services/history-service.js';
import type { WorkoutSnapshot } from '../../domain/entities/workout-snapshot.js';
import type { WeeklyReview } from '../../domain/analytics/types.js';
import { Button, DumbbellIcon, StatusBanner } from '../../ui/components/index.js';
import './home.css';

/** Read-only summary of saved sessions; mounted only outside the workout logger. */
export function HomeTrainingSummary({
  onStart,
  startDisabled,
  error,
  onDismissError,
}: {
  onStart: () => void;
  startDisabled: boolean;
  error: string | null;
  onDismissError: () => void;
}) {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<{ latest?: WorkoutSnapshot; week: WeeklyReview } | null>(
    null,
  );
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    let mounted = true;
    const history = new HistoryService();
    Promise.all([history.getHistory({ pageSize: 1 }), history.getWeeklyReview()])
      .then(([recent, week]) => {
        if (mounted) setSummary({ latest: recent.pagination.items[0], week });
      })
      .catch(() => {
        if (mounted) setLoadFailed(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="tita-home" data-testid="no-active-workout-view">
      {error && <StatusBanner type="error" message={error} onDismiss={onDismissError} />}
      <section className="tita-home__start">
        <span className="tita-home__label">SEU PRÓXIMO TREINO</span>
        <h2>Pronto para treinar?</h2>
        <p>Escolha sua rotina ou comece uma sessão livre. Uma série de cada vez.</p>
        <div className="tita-home__actions">
          <Button
            size="lg"
            onClick={onStart}
            disabled={startDisabled}
            data-testid="start-workout-button"
            className="tita-home__quick-start"
            leftIcon={<DumbbellIcon size={20} />}
          >
            Iniciar Treino Rápido
          </Button>
          <Button
            className="tita-home__plan"
            size="lg"
            variant="secondary"
            onClick={() => navigate('/routines')}
          >
            Ver Minhas Rotinas
          </Button>
        </div>
        <small>Seus registros ficam salvos neste aparelho, mesmo offline.</small>
      </section>
      {loadFailed ? (
        <StatusBanner type="error" message="Não foi possível carregar o resumo dos treinos." />
      ) : summary ? (
        <div className="tita-home__summary">
          <section className="tita-home__week">
            <span className="tita-home__label">ESTA SEMANA</span>
            <h3>
              {summary.week.totalWorkouts}{' '}
              {summary.week.totalWorkouts === 1 ? 'treino registrado' : 'treinos registrados'}
            </h3>
            <p>{summary.week.weekLabel}</p>
            <dl>
              <div>
                <dt>Séries de trabalho</dt>
                <dd>{summary.week.totalWorkingSets}</dd>
              </div>
              <div>
                <dt>Volume</dt>
                <dd>
                  {summary.week.totalVolumeKg.toLocaleString('pt-BR')} <small>kg</small>
                </dd>
              </div>
              <div>
                <dt>Tempo de treino</dt>
                <dd>
                  {Math.round(summary.week.totalDurationMs / 60000)} <small>min</small>
                </dd>
              </div>
            </dl>
            <Button variant="ghost" onClick={() => navigate('/progress')}>
              Ver progresso
            </Button>
          </section>
          <section className="tita-home__latest">
            <span className="tita-home__label">ÚLTIMO TREINO</span>
            {summary.latest ? (
              <>
                <h3>{summary.latest.title}</h3>
                <p>
                  {new Date(summary.latest.completedAt).toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
                <dl>
                  <div>
                    <dt>Séries concluídas</dt>
                    <dd>{summary.latest.completedSetsCount}</dd>
                  </div>
                  <div>
                    <dt>Volume</dt>
                    <dd>
                      {summary.latest.totalVolumeKg.toLocaleString('pt-BR')} <small>kg</small>
                    </dd>
                  </div>
                </dl>
                <Button variant="secondary" onClick={() => navigate('/history')}>
                  Ver histórico
                </Button>
              </>
            ) : (
              <>
                <h3>Sua primeira marca vem agora.</h3>
                <p>Ao concluir uma sessão, seu resumo aparece aqui.</p>
                <Button variant="secondary" onClick={() => navigate('/onboarding')}>
                  Escolher uma ficha inicial
                </Button>
              </>
            )}
          </section>
        </div>
      ) : (
        <p role="status">Carregando seus treinos…</p>
      )}
    </div>
  );
}
