import React from 'react';
import { builtinExerciseName } from '../../data/builtin-display.js';
import type { PlateauReport } from '../../domain/analytics/types.js';

export interface PlateauAlertsCardProps {
  readonly reports: readonly PlateauReport[];
}

export const PlateauAlertsCard: React.FC<PlateauAlertsCardProps> = ({ reports }) => {
  if (reports.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-2)' }}>
        <div
          style={{
            padding: 'var(--tita-space-3) var(--tita-space-4)',
            backgroundColor: 'var(--tita-success-bg, rgba(16, 185, 129, 0.1))',
            border: '1px solid var(--tita-accent, #10b981)',
            borderRadius: 'var(--tita-radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--tita-space-3)',
            color: 'var(--tita-text)',
            fontSize: 'var(--tita-text-sm)',
          }}
          data-testid="no-plateaus-banner"
        >
          <span style={{ fontSize: '20px' }}>🟢</span>
          <div>
            <strong>Progressão Saudável</strong>
            <div style={{ color: 'var(--tita-text-muted)', fontSize: 'var(--tita-text-xs)' }}>
              Nenhum platô ou anomalia identificado nas sessões analisadas até o momento.
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: 'var(--tita-text-xs)',
            color: 'var(--tita-text-subtle)',
            fontStyle: 'italic',
          }}
        >
          Nota explicativa: Heurística puramente descritiva baseada no histórico de treino, sem
          finalidade médica ou diagnóstica.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
      {/* Disclaimer Banner Required by Canonical Decisions */}
      <div
        style={{
          padding: 'var(--tita-space-2) var(--tita-space-3)',
          backgroundColor: 'var(--tita-surface-2)',
          borderRadius: 'var(--tita-radius-sm)',
          borderLeft: '3px solid var(--tita-warning, #f59e0b)',
          fontSize: 'var(--tita-text-xs)',
          color: 'var(--tita-text-muted)',
        }}
      >
        ⚠️ <strong>Nota explicativa:</strong> As sinalizações abaixo são heurísticas descritivas
        baseadas no histórico recente de repetições e cargas, sem finalidade médica ou diagnóstica.
      </div>

      {reports.map((report) => {
        let badgeColor = 'var(--tita-warning, #f59e0b)';
        let badgeBg = 'rgba(245, 158, 11, 0.15)';

        if (report.type === 'VOLUME_ANOMALY') {
          badgeColor = '#38bdf8'; // sky
          badgeBg = 'rgba(56, 189, 248, 0.15)';
        } else if (report.type === 'EXTENDED_ABSENCE') {
          badgeColor = '#a855f7'; // purple
          badgeBg = 'rgba(168, 85, 247, 0.15)';
        }

        return (
          <div
            key={`${report.exerciseId}-${report.type}`}
            style={{
              padding: 'var(--tita-space-3) var(--tita-space-4)',
              backgroundColor: 'var(--tita-surface-2)',
              borderRadius: 'var(--tita-radius-md)',
              border: '1px solid var(--tita-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--tita-space-2)',
            }}
            data-testid="plateau-report-item"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--tita-space-2)',
              }}
            >
              <span
                style={{
                  fontSize: 'var(--tita-text-base)',
                  fontWeight: 'var(--tita-weight-bold)',
                  color: 'var(--tita-text)',
                }}
              >
                {builtinExerciseName(report.exerciseId, report.exerciseName)}
              </span>

              <span
                style={{
                  fontSize: 'var(--tita-text-xs)',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: 'var(--tita-radius-full)',
                  backgroundColor: badgeBg,
                  color: badgeColor,
                  border: `1px solid ${badgeColor}`,
                }}
              >
                {report.typeLabel}
              </span>
            </div>

            <div style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text)' }}>
              {report.reason}
            </div>

            <div
              style={{
                fontSize: 'var(--tita-text-xs)',
                color: 'var(--tita-accent)',
                backgroundColor: 'rgba(16, 185, 129, 0.08)',
                padding: 'var(--tita-space-2)',
                borderRadius: 'var(--tita-radius-sm)',
              }}
            >
              💡 <strong>Sugestão prática:</strong> {report.recommendation}
            </div>
          </div>
        );
      })}
    </div>
  );
};
