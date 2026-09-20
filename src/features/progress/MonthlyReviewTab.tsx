import React, { useState, useEffect } from 'react';
import type { MonthlyReview } from '../../domain/analytics/types.js';
import { HistoryService } from '../../services/history-service.js';
import { Card, EmptyState } from '../../ui/components/index.js';
import { MuscleDistributionChart } from './MuscleDistributionChart.js';
import { PeriodComparisonCard } from './PeriodComparisonCard.js';
import { PlateauAlertsCard } from './PlateauAlertsCard.js';

export interface MonthlyReviewTabProps {
  readonly historyService: HistoryService;
}

export const MonthlyReviewTab: React.FC<MonthlyReviewTabProps> = ({ historyService }) => {
  const [availableMonths, setAvailableMonths] = useState<
    readonly { monthKey: string; monthLabel: string }[]
  >([]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [monthlyReview, setMonthlyReview] = useState<MonthlyReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load available months
  useEffect(() => {
    let isMounted = true;
    historyService
      .getAvailableReviewMonths()
      .then((months) => {
        if (!isMounted) return;
        setAvailableMonths(months);
        if (months.length > 0) {
          setSelectedMonthKey((prev) => (prev ? prev : months[0].monthKey));
        } else {
          setIsLoading(false);
        }
      })
      .catch((err) => console.error('Failed to load available review months', err));

    return () => {
      isMounted = false;
    };
  }, [historyService]);

  // Load selected monthly review
  useEffect(() => {
    if (!selectedMonthKey) {
      if (availableMonths.length === 0) setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    historyService
      .getMonthlyReview(selectedMonthKey)
      .then((review) => {
        if (isMounted) {
          setMonthlyReview(review);
        }
      })
      .catch((err) => console.error('Failed to load monthly review', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [historyService, selectedMonthKey, availableMonths.length]);

  if (isLoading) {
    return (
      <div
        style={{
          padding: 'var(--tita-space-8)',
          textAlign: 'center',
          color: 'var(--tita-text-muted)',
        }}
      >
        Carregando revisão mensal...
      </div>
    );
  }

  if (!monthlyReview || availableMonths.length === 0) {
    return (
      <EmptyState
        title="Sem dados de treinos para a Revisão Mensal"
        description="Conclua suas sessões ao longo do mês para visualizar relatórios de consistência, distribuição muscular e possíveis platôs."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
      {/* Month Selector Bar */}
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
            htmlFor="monthly-review-select"
            style={{
              fontSize: 'var(--tita-text-xs)',
              fontWeight: 'bold',
              color: 'var(--tita-text-muted)',
              textTransform: 'uppercase',
            }}
          >
            Selecione o Mês
          </label>
          <select
            id="monthly-review-select"
            aria-label="Selecione o mês para revisão"
            value={selectedMonthKey ?? ''}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
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
            data-testid="monthly-review-select"
          >
            {availableMonths.map((m) => (
              <option key={m.monthKey} value={m.monthKey}>
                {m.monthLabel}
              </option>
            ))}
          </select>
        </div>

        <div style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text-muted)' }}>
          {monthlyReview.totalSessions} {monthlyReview.totalSessions === 1 ? 'sessão' : 'sessões'}{' '}
          no mês
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
        <Card title="Sessões" subtitle="Treinos no mês">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-text)',
            }}
            data-testid="monthly-total-sessions"
          >
            {monthlyReview.totalSessions}
          </div>
        </Card>

        <Card title="Frequência Média" subtitle="Treinos por semana">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-primary)',
            }}
            data-testid="monthly-frequency"
          >
            {monthlyReview.weeklyFrequency} / sem
          </div>
        </Card>

        <Card title="Volume Total" subtitle="Carga acumulada no mês">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-accent)',
            }}
            data-testid="monthly-total-volume"
          >
            {monthlyReview.totalVolumeKg} kg
          </div>
        </Card>

        <Card title="Séries de Trabalho" subtitle="Séries válidas">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-text)',
            }}
          >
            {monthlyReview.totalWorkingSets}
          </div>
        </Card>

        <Card title="Recordes (PRs)" subtitle="Marcas no mês">
          <div
            style={{
              fontSize: 'var(--tita-text-2xl)',
              fontWeight: 'bold',
              color: 'var(--tita-warning)',
            }}
          >
            🏆 {monthlyReview.totalPRs}
          </div>
        </Card>
      </div>

      {/* Consistency Card */}
      <Card
        title="Índice de Consistência Mensal"
        subtitle="Continuidade semanal dos treinamentos ao longo do mês"
      >
        <div
          style={{
            marginTop: 'var(--tita-space-3)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 'var(--tita-space-3)',
          }}
        >
          <div
            style={{
              padding: 'var(--tita-space-3)',
              backgroundColor: 'var(--tita-surface-2)',
              borderRadius: 'var(--tita-radius-sm)',
              border: '1px solid var(--tita-border)',
            }}
          >
            <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Semanas Ativas
            </div>
            <div
              style={{
                fontSize: 'var(--tita-text-xl)',
                fontWeight: 'bold',
                color: 'var(--tita-text)',
              }}
            >
              {monthlyReview.consistency.activeWeeksCount} de{' '}
              {monthlyReview.consistency.totalWeeksInMonth} semanas
            </div>
          </div>

          <div
            style={{
              padding: 'var(--tita-space-3)',
              backgroundColor: 'var(--tita-surface-2)',
              borderRadius: 'var(--tita-radius-sm)',
              border: '1px solid var(--tita-border)',
            }}
          >
            <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Taxa de Consistência
            </div>
            <div
              style={{
                fontSize: 'var(--tita-text-xl)',
                fontWeight: 'bold',
                color:
                  monthlyReview.consistency.consistencyPercentage >= 75
                    ? 'var(--tita-accent)'
                    : 'var(--tita-warning, #f59e0b)',
              }}
              data-testid="monthly-consistency-score"
            >
              {monthlyReview.consistency.consistencyPercentage}%
            </div>
          </div>

          <div
            style={{
              padding: 'var(--tita-space-3)',
              backgroundColor: 'var(--tita-surface-2)',
              borderRadius: 'var(--tita-radius-sm)',
              border: '1px solid var(--tita-border)',
            }}
          >
            <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Média por Semana Ativa
            </div>
            <div
              style={{
                fontSize: 'var(--tita-text-xl)',
                fontWeight: 'bold',
                color: 'var(--tita-primary)',
              }}
            >
              {monthlyReview.consistency.averageSessionsPerActiveWeek} treinos
            </div>
          </div>
        </div>
      </Card>

      {/* Comparison with Previous Month */}
      <PeriodComparisonCard
        comparison={monthlyReview.comparisonWithPreviousMonth}
        periodType="mês"
      />

      {/* Muscle Volume Distribution Card */}
      <Card
        title="Distribuição Muscular no Mês"
        subtitle="Volume acumulado e séries por grupamento muscular"
      >
        <div style={{ marginTop: 'var(--tita-space-3)' }}>
          <MuscleDistributionChart distribution={monthlyReview.muscleDistribution} />
        </div>
      </Card>

      {/* Largest Changes Section */}
      {monthlyReview.largestChanges.length > 0 && (
        <Card
          title="Maiores Variações de Desempenho"
          subtitle="Exercícios com maiores alterações de e1RM comparados ao mês anterior"
        >
          <div
            style={{
              marginTop: 'var(--tita-space-2)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--tita-space-2)',
            }}
          >
            {monthlyReview.largestChanges.map((change) => {
              const isGain = change.deltaPercent >= 0;
              return (
                <div
                  key={`${change.exerciseId}-${change.metric}`}
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
                    {change.exerciseName}
                  </span>

                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-3)' }}
                  >
                    <span
                      style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}
                    >
                      {change.previousValue} kg → <strong>{change.currentValue} kg</strong>
                    </span>
                    <span
                      style={{
                        fontSize: 'var(--tita-text-xs)',
                        fontWeight: 'bold',
                        color: isGain ? 'var(--tita-accent)' : 'var(--tita-warning, #f59e0b)',
                      }}
                    >
                      {isGain ? `+${change.deltaPercent}%` : `${change.deltaPercent}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Possible Plateaus & Anomaly Detection Card */}
      <Card
        title="Possíveis Platôs & Alertas de Treino"
        subtitle="Heurísticas descritivas para identificar estagnação ou anomalias"
      >
        <div style={{ marginTop: 'var(--tita-space-3)' }}>
          <PlateauAlertsCard reports={monthlyReview.possiblePlateaus} />
        </div>
      </Card>
    </div>
  );
};
