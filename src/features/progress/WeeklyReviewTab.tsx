import React, { useState, useEffect } from 'react';
import { TrophyIcon } from '../../ui/components/icons.js';
import { IntelligenceAction } from '../intelligence/IntelligenceAction.js';
import { weeklySummary } from '../../intelligence/summaries.js';
import type { WeeklyReview } from '../../domain/analytics/types.js';
import { HistoryService } from '../../services/history-service.js';
import { Card, EmptyState } from '../../ui/components/index.js';
import { MuscleDistributionChart } from './MuscleDistributionChart.js';
import { PeriodComparisonCard } from './PeriodComparisonCard.js';

export interface WeeklyReviewTabProps {
  readonly historyService: HistoryService;
}

export const WeeklyReviewTab: React.FC<WeeklyReviewTabProps> = ({ historyService }) => {
  const [availableWeeks, setAvailableWeeks] = useState<
    readonly { weekKey: string; weekLabel: string; startDate: string; endDate: string }[]
  >([]);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
  const [weeklyReview, setWeeklyReview] = useState<WeeklyReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load available weeks
  useEffect(() => {
    let isMounted = true;
    historyService
      .getAvailableReviewWeeks()
      .then((weeks) => {
        if (!isMounted) return;
        setAvailableWeeks(weeks);
        if (weeks.length > 0) {
          setSelectedWeekKey((prev) => (prev ? prev : weeks[0].weekKey));
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => console.error('Failed to load available review weeks', err));

    return () => {
      isMounted = false;
    };
  }, [historyService]);

  // Load selected weekly review
  useEffect(() => {
    if (!selectedWeekKey) {
      if (availableWeeks.length === 0) setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    historyService
      .getWeeklyReview(selectedWeekKey)
      .then((review) => {
        if (isMounted) {
          setWeeklyReview(review);
        }
      })
      .catch((err) => console.error('Failed to load weekly review', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [historyService, selectedWeekKey, availableWeeks.length]);

  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--tita-space-8)',
          textAlign: 'center',
          color: 'var(--tita-text-muted)',
        }}
      >
        Carregando revisão semanal...
      </div>
    );
  }

  if (!weeklyReview || availableWeeks.length === 0) {
    return (
      <EmptyState
        title="Sem dados de treinos para a Revisão Semanal"
        description="Conclua seus primeiros treinos para gerar revisões semanais automáticas com distribuição muscular e comparativos de evolução."
      />
    );
  }

  const durationMin = Math.round(weeklyReview.totalDurationMs / 60000);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
      <IntelligenceAction
        key={weeklyReview.weekKey}
        label="Gerar análise inteligente"
        getSummary={async () =>
          weeklySummary(weeklyReview, await historyService.getPlateauReports(weeklyReview.endDate))
        }
      />
      {/* Week Selector Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--tita-surface)',
          padding: 'var(--tita-space-3)',
          borderRadius: 'var(--tita-radius-md)',
          border: '1px solid var(--tita-border)',
          flexWrap: 'wrap',
          gap: 'var(--tita-space-2)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <label
            htmlFor="weekly-review-select"
            style={{
              fontSize: 'var(--tita-text-xs)',
              fontWeight: 'bold',
              color: 'var(--tita-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Selecione a Semana
          </label>
          <select
            id="weekly-review-select"
            aria-label="Selecione a semana para revisão"
            value={selectedWeekKey ?? ''}
            onChange={(e) => setSelectedWeekKey(e.target.value)}
            style={{
              minHeight: 'var(--tita-touch-min)',
              padding: '0 var(--tita-space-3)',
              borderRadius: 'var(--tita-radius-sm)',
              border: '1px solid var(--tita-border)',
              backgroundColor: 'var(--tita-surface-2)',
              color: 'var(--tita-text)',
              fontSize: 'var(--tita-text-sm)',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
            data-testid="weekly-review-select"
          >
            {availableWeeks.map((w) => (
              <option key={w.weekKey} value={w.weekKey}>
                {w.weekLabel}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text-muted)' }}>
          {weeklyReview.totalWorkouts} {weeklyReview.totalWorkouts === 1 ? 'treino' : 'treinos'}{' '}
          registrados
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 'var(--tita-space-3)',
        }}
      >
        <Card title="Treinos" subtitle="Sessões na semana">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-text)',
            }}
            data-testid="weekly-total-workouts"
          >
            {weeklyReview.totalWorkouts}
          </div>
        </Card>

        <Card title="Volume Total" subtitle="Carga acumulada">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-primary)',
            }}
            data-testid="weekly-total-volume"
          >
            {weeklyReview.totalVolumeKg} kg
          </div>
        </Card>

        <Card title="Séries Válidas" subtitle="Séries de trabalho">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-accent)',
            }}
            data-testid="weekly-total-sets"
          >
            {weeklyReview.totalWorkingSets}
          </div>
        </Card>

        <Card title="Tempo Ativo" subtitle="Duração dos treinos">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-text)',
            }}
          >
            {durationMin > 0 ? `${durationMin} min` : '< 1 min'}
          </div>
        </Card>

        <Card title="Recordes (PRs)" subtitle="Conquistados na semana">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-warning)',
            }}
            data-testid="weekly-total-prs"
          >
            <TrophyIcon aria-hidden="true" /> {weeklyReview.totalPRs}
          </div>
        </Card>
      </div>

      {/* Comparison with Previous Week */}
      <PeriodComparisonCard
        comparison={weeklyReview.comparisonWithPreviousWeek}
        periodType="semana"
      />

      {/* Muscle Volume Distribution Card */}
      <Card
        title="Distribuição Muscular na Semana"
        subtitle="Volume e séries por grupamento muscular trabalhado"
      >
        <div style={{ marginTop: 'var(--tita-space-3)' }}>
          <MuscleDistributionChart distribution={weeklyReview.muscleDistribution} />
        </div>
      </Card>

      {/* Exercise Progressions Section */}
      {weeklyReview.exerciseProgressions.length > 0 && (
        <Card
          title="Progressão de Força na Semana"
          subtitle="Evolução de e1RM comparada aos desempenhos anteriores"
        >
          <div
            style={{
              marginTop: 'var(--tita-space-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--tita-space-2)',
            }}
          >
            {weeklyReview.exerciseProgressions.map((prog) => {
              const isGain = prog.deltaKg >= 0;
              return (
                <div
                  key={prog.exerciseId}
                  style={{
                    padding: 'var(--tita-space-2) var(--tita-space-3)',
                    backgroundColor: 'var(--tita-surface-2)',
                    borderRadius: 'var(--tita-radius-sm)',
                    border: '1px solid var(--tita-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontSize: 'var(--tita-text-sm)',
                      fontWeight: 'bold',
                      color: 'var(--tita-text)',
                    }}
                  >
                    {prog.exerciseName}
                  </span>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-3)' }}
                  >
                    <span
                      style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}
                    >
                      {prog.previousE1RM} kg → <strong>{prog.currentE1RM} kg</strong>
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--tita-text-xs)',
                        fontWeight: 'bold',
                        color: isGain ? 'var(--tita-accent)' : 'var(--tita-text-muted)',
                      }}
                    >
                      {isGain
                        ? `+${prog.deltaKg} kg (+${prog.deltaPercent}%)`
                        : `${prog.deltaKg} kg`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* PRs Achieved Section */}
      {weeklyReview.prsAchieved.length > 0 && (
        <Card
          title="Recordes Pessoais Conquistados"
          subtitle="Marcas superadas durante os treinos desta semana"
        >
          <div
            style={{
              marginTop: 'var(--tita-space-2)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--tita-space-2)',
            }}
          >
            {weeklyReview.prsAchieved.map((pr, idx) => (
              <div
                key={`${pr.exerciseId}-${pr.category}-${idx}`}
                style={{
                  padding: 'var(--tita-space-2) var(--tita-space-3)',
                  backgroundColor: 'rgba(234, 179, 8, 0.08)',
                  border: '1px solid rgba(234, 179, 8, 0.3)',
                  borderRadius: 'var(--tita-radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--tita-space-2)',
                }}
              >
                <TrophyIcon aria-hidden="true" />
                <div>
                  <div
                    style={{
                      fontSize: 'var(--tita-text-sm)',
                      fontWeight: 'bold',
                      color: 'var(--tita-text)',
                    }}
                  >
                    {pr.exerciseName}
                  </div>
                  <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-warning)' }}>
                    {pr.categoryLabel}:{' '}
                    <strong>
                      {pr.value} {pr.unit}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
