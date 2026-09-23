import React, { useState } from 'react';
import { builtinExerciseName } from '../../data/builtin-display.js';
import type { WorkoutSnapshot } from '../../domain/entities/workout-snapshot.js';
import { Button, Dialog } from '../../ui/components/index.js';

export interface WorkoutSessionDetailDialogProps {
  readonly snapshot: WorkoutSnapshot | null;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onDelete?: (snapshotId: string) => Promise<void>;
}

export const WorkoutSessionDetailDialog: React.FC<WorkoutSessionDetailDialogProps> = ({
  snapshot,
  isOpen,
  onClose,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!snapshot) return null;

  const durationMin = Math.round(snapshot.activeDurationMs / 60000);
  const completedDateStr = new Date(snapshot.completedAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      await onDelete(snapshot.id);
      setConfirmDelete(false);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={snapshot.title}
      description={`Finalizado em ${completedDateStr}`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
        {/* KPI Metrics Chips */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 'var(--tita-space-2)',
          }}
        >
          <div
            style={{
              padding: 'var(--tita-space-3)',
              backgroundColor: 'var(--tita-surface-raised, rgba(255,255,255,0.05))',
              borderRadius: 'var(--tita-radius-md)',
              border: '1px solid var(--tita-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Duração Ativa
            </div>
            <div
              style={{
                fontSize: 'var(--tita-text-lg)',
                fontWeight: 'var(--tita-weight-bold)',
                color: 'var(--tita-text)',
              }}
            >
              {durationMin > 0 ? `${durationMin} min` : '< 1 min'}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--tita-space-3)',
              backgroundColor: 'var(--tita-surface-raised, rgba(255,255,255,0.05))',
              borderRadius: 'var(--tita-radius-md)',
              border: '1px solid var(--tita-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Volume Total
            </div>
            <div
              style={{
                fontSize: 'var(--tita-text-lg)',
                fontWeight: 'var(--tita-weight-bold)',
                color: 'var(--tita-primary)',
              }}
            >
              {snapshot.totalVolumeKg} kg
            </div>
          </div>

          <div
            style={{
              padding: 'var(--tita-space-3)',
              backgroundColor: 'var(--tita-surface-raised, rgba(255,255,255,0.05))',
              borderRadius: 'var(--tita-radius-md)',
              border: '1px solid var(--tita-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Séries Válidas
            </div>
            <div
              style={{
                fontSize: 'var(--tita-text-lg)',
                fontWeight: 'var(--tita-weight-bold)',
                color: 'var(--tita-text)',
              }}
            >
              {snapshot.completedSetsCount}
            </div>
          </div>

          <div
            style={{
              padding: 'var(--tita-space-3)',
              backgroundColor: 'var(--tita-surface-raised, rgba(255,255,255,0.05))',
              borderRadius: 'var(--tita-radius-md)',
              border: '1px solid var(--tita-border)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Repetições
            </div>
            <div
              style={{
                fontSize: 'var(--tita-text-lg)',
                fontWeight: 'var(--tita-weight-bold)',
                color: 'var(--tita-text)',
              }}
            >
              {snapshot.totalReps}
            </div>
          </div>
        </div>

        {/* Session Notes */}
        {snapshot.notes && (
          <div
            style={{
              padding: 'var(--tita-space-3)',
              backgroundColor: 'var(--tita-surface-raised, rgba(255,255,255,0.03))',
              borderRadius: 'var(--tita-radius-md)',
              borderLeft: '3px solid var(--tita-primary)',
              fontSize: 'var(--tita-text-sm)',
            }}
          >
            <div
              style={{
                fontWeight: 'bold',
                color: 'var(--tita-text-muted)',
                marginBottom: '4px',
                fontSize: 'var(--tita-text-xs)',
              }}
            >
              Observações do Treino:
            </div>
            <div>{snapshot.notes}</div>
          </div>
        )}

        {/* Exercises Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
          <h4
            style={{
              fontSize: 'var(--tita-text-base)',
              fontWeight: 'var(--tita-weight-bold)',
              margin: 0,
            }}
          >
            Exercícios Realizados ({snapshot.exercises.length})
          </h4>

          {snapshot.exercises.map((ex, exIdx) => (
            <div
              key={`${ex.exerciseId}-${exIdx}`}
              style={{
                padding: 'var(--tita-space-3)',
                border: '1px solid var(--tita-border)',
                borderRadius: 'var(--tita-radius-md)',
                backgroundColor: 'var(--tita-surface)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--tita-space-2)',
                }}
              >
                <strong style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text)' }}>
                  {builtinExerciseName(ex.exerciseId, ex.exerciseName)}
                </strong>
                <span style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
                  Vol: {ex.totalVolumeKg} kg • Reps: {ex.totalReps}
                </span>
              </div>

              {/* Sets Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {ex.sets.map((set, sIdx) => {
                  const setVol = (set.weight ?? 0) * (set.reps ?? 0);
                  return (
                    <div
                      key={set.id || sIdx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 8px',
                        backgroundColor:
                          sIdx % 2 === 0
                            ? 'var(--tita-surface-raised, rgba(255,255,255,0.03))'
                            : 'transparent',
                        borderRadius: 'var(--tita-radius-sm)',
                        fontSize: 'var(--tita-text-xs)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--tita-space-2)',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 'bold',
                            color: 'var(--tita-text-muted)',
                            width: '20px',
                          }}
                        >
                          #{sIdx + 1}
                        </span>
                        {set.type !== 'NORMAL' && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: 'rgba(99, 102, 241, 0.2)',
                              color: 'var(--tita-primary)',
                            }}
                          >
                            {set.type}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 'var(--tita-space-4)' }}>
                        <span>
                          <strong>{set.weight ?? 0}</strong> kg
                        </span>
                        <span>
                          <strong>{set.reps ?? 0}</strong> reps
                        </span>
                        <span
                          style={{
                            color: 'var(--tita-text-muted)',
                            minWidth: '60px',
                            textAlign: 'right',
                          }}
                        >
                          {setVol} kg
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Delete Confirmation / Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'var(--tita-space-2)',
            paddingTop: 'var(--tita-space-3)',
            borderTop: '1px solid var(--tita-border)',
          }}
        >
          {confirmDelete ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--tita-space-2)',
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-danger, #ef4444)' }}
              >
                Confirmar exclusão deste registro histórico?
              </span>
              <div style={{ display: 'flex', gap: 'var(--tita-space-2)' }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleDelete}
                  loading={isDeleting}
                  data-testid="confirm-delete-snapshot-btn"
                >
                  Sim, Excluir
                </Button>
              </div>
            </div>
          ) : (
            <>
              {onDelete ? (
                <Button
                  size="sm"
                  variant="ghost"
                  style={{ color: 'var(--tita-danger, #ef4444)' }}
                  onClick={() => setConfirmDelete(true)}
                  data-testid="delete-snapshot-btn"
                >
                  🗑️ Excluir Sessão
                </Button>
              ) : (
                <div />
              )}
              <Button variant="primary" onClick={onClose}>
                Fechar
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};
