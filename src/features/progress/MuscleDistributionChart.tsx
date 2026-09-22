import React from 'react';
import type { MuscleVolumeDistribution } from '../../domain/analytics/types.js';

export interface MuscleDistributionChartProps {
  readonly distribution: readonly MuscleVolumeDistribution[];
}

const MUSCLE_COLORS: Record<string, string> = {
  Peito: '#3b82f6', // blue
  Costas: '#10b981', // green
  Ombros: '#8b5cf6', // purple
  Quadríceps: '#f59e0b', // amber
  Isquiotibiais: '#ec4899', // pink
  Glúteos: '#f97316', // orange
  Bíceps: '#06b6d4', // cyan
  Tríceps: '#6366f1', // indigo
  Abdômen: '#14b8a6', // teal
  Panturrilhas: '#eab308', // yellow
  Antebraço: '#a855f7', // purple-light
  Geral: '#64748b', // slate
};

export const MuscleDistributionChart: React.FC<MuscleDistributionChartProps> = ({
  distribution,
}) => {
  if (distribution.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--tita-space-4)',
          textAlign: 'center',
          color: 'var(--tita-text-muted)',
          fontSize: 'var(--tita-text-sm)',
          border: '1px dashed var(--tita-border)',
          borderRadius: 'var(--tita-radius-md)',
        }}
      >
        Nenhum dado de séries musculares registrado para este período.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
      {/* Top stacked horizontal bar preview */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '14px',
          borderRadius: 'var(--tita-radius-full)',
          overflow: 'hidden',
          backgroundColor: 'var(--tita-surface-2)',
          border: '1px solid var(--tita-border)',
        }}
        role="progressbar"
        aria-label="Distribuição muscular por séries"
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {distribution.map((item) => {
          const color = MUSCLE_COLORS[item.muscle] || '#64748b';
          return (
            <div
              key={item.muscle}
              title={`${item.muscle}: ${item.sets} séries (${item.percentage}%)`}
              style={{
                width: `${item.percentage}%`,
                height: '100%',
                backgroundColor: color,
              }}
            />
          );
        })}
      </div>

      {/* Breakdown list */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--tita-space-2)',
        }}
      >
        {distribution.map((item) => {
          const color = MUSCLE_COLORS[item.muscle] || '#64748b';
          return (
            <div
              key={item.muscle}
              style={{
                padding: 'var(--tita-space-2) var(--tita-space-3)',
                backgroundColor: 'var(--tita-surface-2)',
                borderRadius: 'var(--tita-radius-sm)',
                border: '1px solid var(--tita-border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      display: 'inline-block',
                    }}
                  />
                  <span
                    style={{
                      fontSize: 'var(--tita-text-sm)',
                      fontWeight: 'var(--tita-weight-semibold)',
                      color: 'var(--tita-text)',
                    }}
                  >
                    {item.muscle}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 'var(--tita-text-xs)',
                    fontWeight: 'bold',
                    color: 'var(--tita-text-secondary)',
                  }}
                >
                  {item.percentage}%
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 'var(--tita-text-xs)',
                  color: 'var(--tita-text-muted)',
                }}
              >
                <span>{item.sets} séries</span>
                <span>{item.volumeKg} kg</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
