import React from 'react';
import type { PeriodComparison } from '../../domain/analytics/types.js';

export interface PeriodComparisonCardProps {
  readonly comparison: PeriodComparison | null;
  readonly periodType: 'semana' | 'mês';
}

export const PeriodComparisonCard: React.FC<PeriodComparisonCardProps> = ({
  comparison,
  periodType,
}) => {
  const periodLabel = periodType === 'semana' ? 'semana anterior' : 'mês anterior';

  if (!comparison || comparison.previousCount === 0) {
    return (
      <div
        style={{
          padding: 'var(--tita-space-3)',
          backgroundColor: 'var(--tita-surface-2)',
          borderRadius: 'var(--tita-radius-md)',
          border: '1px solid var(--tita-border)',
          fontSize: 'var(--tita-text-sm)',
          color: 'var(--tita-text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--tita-space-2)',
        }}
      >
        <span>ℹ️</span>
        <span>Sem dados suficientes no {periodLabel} para calcular comparações relativas.</span>
      </div>
    );
  }

  const volumeUp = comparison.volumeDeltaPercent >= 0;
  const setsUp = comparison.setsDelta >= 0;
  const countUp = comparison.countDelta >= 0;

  return (
    <div
      style={{
        padding: 'var(--tita-space-3) var(--tita-space-4)',
        backgroundColor: 'var(--tita-surface-2)',
        borderRadius: 'var(--tita-radius-md)',
        border: '1px solid var(--tita-border)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--tita-space-2)',
      }}
      data-testid="period-comparison-card"
    >
      <div
        style={{
          fontSize: 'var(--tita-text-xs)',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          color: 'var(--tita-text-muted)',
          letterSpacing: '0.05em',
        }}
      >
        Comparativo vs {periodLabel}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 'var(--tita-space-2)',
        }}
      >
        {/* Treinos Delta */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
            Treinos
          </span>
          <span
            style={{
              fontSize: 'var(--tita-text-base)',
              fontWeight: 'bold',
              color: countUp ? 'var(--tita-accent)' : 'var(--tita-text)',
            }}
          >
            {countUp ? `+${comparison.countDelta}` : comparison.countDelta}{' '}
            <span style={{ fontSize: '11px', fontWeight: 'normal' }}>
              ({comparison.previousCount} antes)
            </span>
          </span>
        </div>

        {/* Volume Delta */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
            Volume Total
          </span>
          <span
            style={{
              fontSize: 'var(--tita-text-base)',
              fontWeight: 'bold',
              color: volumeUp ? 'var(--tita-accent)' : 'var(--tita-warning, #f59e0b)',
            }}
          >
            {volumeUp ? `+${comparison.volumeDeltaPercent}%` : `${comparison.volumeDeltaPercent}%`}
          </span>
        </div>

        {/* Séries Delta */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
            Séries
          </span>
          <span
            style={{
              fontSize: 'var(--tita-text-base)',
              fontWeight: 'bold',
              color: setsUp ? 'var(--tita-accent)' : 'var(--tita-text)',
            }}
          >
            {setsUp ? `+${comparison.setsDelta}` : comparison.setsDelta}
          </span>
        </div>

        {/* Duração Delta */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
            Tempo de Treino
          </span>
          <span
            style={{
              fontSize: 'var(--tita-text-base)',
              fontWeight: 'bold',
              color:
                comparison.durationDeltaPercent >= 0
                  ? 'var(--tita-accent)'
                  : 'var(--tita-text-muted)',
            }}
          >
            {comparison.durationDeltaPercent >= 0
              ? `+${comparison.durationDeltaPercent}%`
              : `${comparison.durationDeltaPercent}%`}
          </span>
        </div>
      </div>
    </div>
  );
};
