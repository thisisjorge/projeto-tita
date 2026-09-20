import React, { useState, useEffect } from 'react';
import type { Exercise } from '../../domain/entities/exercise.js';
import type { ExerciseHistorySummary } from '../../services/exercise-library-service.js';
import { ExerciseLibraryService } from '../../services/exercise-library-service.js';
import { Dialog, Button } from '../../ui/components/index.js';
import { ExerciseMediaDisplay } from './ExerciseMediaDisplay.js';
import { HelpAction } from '../intelligence/HelpAction.js';
import { libraryHelpContext } from '../../intelligence/help.js';

interface ExerciseDetailDialogProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  service: ExerciseLibraryService;
  onSelectExercise?: (exercise: Exercise) => void;
  onExerciseUpdated?: () => void;
  onOpenEdit?: (exercise: Exercise) => void;
}

export const ExerciseDetailDialog: React.FC<ExerciseDetailDialogProps> = ({
  exercise,
  isOpen,
  onClose,
  service,
  onSelectExercise,
  onExerciseUpdated,
  onOpenEdit,
}) => {
  const [history, setHistory] = useState<ExerciseHistorySummary | null>(null);
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [isFav, setIsFav] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(exercise);

  useEffect(() => {
    setCurrentExercise(exercise);
  }, [exercise]);

  useEffect(() => {
    if (!currentExercise || !isOpen) return;

    let isMounted = true;

    service.isFavorite(currentExercise.id).then((fav) => {
      if (isMounted) setIsFav(fav);
    });

    service.getExerciseHistory(currentExercise.id).then((hist) => {
      if (isMounted) setHistory(hist);
    });

    service.getAlternatives(currentExercise).then((alts) => {
      if (isMounted) setAlternatives(alts);
    });

    return () => {
      isMounted = false;
    };
  }, [currentExercise, isOpen, service]);

  if (!currentExercise) return null;

  const handleToggleFavorite = async () => {
    const updated = await service.toggleFavorite(currentExercise.id);
    setIsFav(updated);
    onExerciseUpdated?.();
  };

  const handleDeleteCustom = async () => {
    if (window.confirm(`Tem certeza que deseja excluir o exercício "${currentExercise.name}"?`)) {
      try {
        await service.deleteCustomExercise(currentExercise.id);
        onExerciseUpdated?.();
        onClose();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Erro ao excluir exercício');
      }
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={currentExercise.name}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
            alignItems: 'center',
          }}
        >
          <div>
            {currentExercise.source === 'custom' && (
              <div style={{ display: 'flex', gap: 'var(--tita-space-2)' }}>
                {onOpenEdit && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onOpenEdit(currentExercise);
                    }}
                  >
                    Editar
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={handleDeleteCustom}>
                  Excluir
                </Button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--tita-space-2)' }}>
            {onSelectExercise && (
              <Button
                variant="primary"
                onClick={() => {
                  onSelectExercise(currentExercise);
                  onClose();
                }}
              >
                Adicionar ao Treino
              </Button>
            )}
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
        {/* Badges and Favorite */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--tita-space-2)',
          }}
        >
          <div style={{ display: 'flex', gap: 'var(--tita-space-1)', flexWrap: 'wrap' }}>
            <span
              style={{
                backgroundColor: 'var(--tita-accent)',
                color: 'var(--tita-bg)',
                padding: '3px 8px',
                borderRadius: 'var(--tita-radius-sm)',
                fontSize: 'var(--tita-text-xs)',
                fontWeight: 'var(--tita-weight-bold)',
              }}
            >
              {currentExercise.primaryMuscle}
            </span>
            <span
              style={{
                backgroundColor: 'var(--tita-surface-2)',
                color: 'var(--tita-text)',
                padding: '3px 8px',
                borderRadius: 'var(--tita-radius-sm)',
                fontSize: 'var(--tita-text-xs)',
                border: '1px solid var(--tita-border)',
              }}
            >
              {currentExercise.equipment}
            </span>
            <span
              style={{
                backgroundColor: 'var(--tita-surface-2)',
                color: 'var(--tita-text-muted)',
                padding: '3px 8px',
                borderRadius: 'var(--tita-radius-sm)',
                fontSize: 'var(--tita-text-xs)',
                border: '1px solid var(--tita-border)',
              }}
            >
              {currentExercise.category}
            </span>
            {currentExercise.source === 'custom' && (
              <span
                style={{
                  backgroundColor: '#8b5cf6',
                  color: '#fff',
                  padding: '3px 8px',
                  borderRadius: 'var(--tita-radius-sm)',
                  fontSize: 'var(--tita-text-xs)',
                  fontWeight: 'bold',
                }}
              >
                Personalizado
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant={isFav ? 'primary' : 'secondary'}
            onClick={handleToggleFavorite}
            aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            data-testid="detail-favorite-btn"
          >
            {isFav ? '★ Favorito' : '☆ Favoritar'}
          </Button>
        </div>

        {/* Media demonstration */}
        <div>
          <ExerciseMediaDisplay exercise={currentExercise} />
        </div>

        <HelpAction
          key={currentExercise.id}
          screen="library"
          exercise={currentExercise}
          embedded
          getContext={() => libraryHelpContext(currentExercise)}
        />
        {/* Technical Instructions */}
        <div>
          <h4
            style={{
              fontSize: 'var(--tita-text-sm)',
              fontWeight: 'var(--tita-weight-bold)',
              marginBottom: 'var(--tita-space-2)',
              color: 'var(--tita-text)',
            }}
          >
            Instruções de Execução:
          </h4>
          <ol
            style={{
              paddingLeft: 'var(--tita-space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--tita-space-1)',
              fontSize: 'var(--tita-text-sm)',
              color: 'var(--tita-text-muted)',
            }}
          >
            {currentExercise.instructions.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>

        {/* Personal History & Metrics */}
        <div
          style={{
            backgroundColor: 'var(--tita-surface-2)',
            borderRadius: 'var(--tita-radius-md)',
            padding: 'var(--tita-space-3)',
            border: '1px solid var(--tita-border)',
          }}
        >
          <h4
            style={{
              fontSize: 'var(--tita-text-sm)',
              fontWeight: 'var(--tita-weight-bold)',
              marginBottom: 'var(--tita-space-2)',
              color: 'var(--tita-text)',
            }}
          >
            Histórico Pessoal & Métricas:
          </h4>

          {history && history.totalSessions > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-2)' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 'var(--tita-space-2)',
                }}
              >
                <div
                  style={{
                    padding: '8px',
                    backgroundColor: 'var(--tita-surface)',
                    borderRadius: 'var(--tita-radius-sm)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--tita-text-muted)' }}>
                    Carga Máxima
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {history.bestWeight} kg
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px',
                    backgroundColor: 'var(--tita-surface)',
                    borderRadius: 'var(--tita-radius-sm)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--tita-text-muted)' }}>
                    1RM Estimado (e1RM)
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {history.bestEstimated1RM} kg
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px',
                    backgroundColor: 'var(--tita-surface)',
                    borderRadius: 'var(--tita-radius-sm)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--tita-text-muted)' }}>
                    Melhor Volume
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {history.bestVolumeSet?.volume} kg
                  </div>
                </div>
                <div
                  style={{
                    padding: '8px',
                    backgroundColor: 'var(--tita-surface)',
                    borderRadius: 'var(--tita-radius-sm)',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--tita-text-muted)' }}>
                    Sessões Registradas
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {history.totalSessions}
                  </div>
                </div>
              </div>

              {history.recentSessions.length > 0 && (
                <div style={{ marginTop: 'var(--tita-space-2)' }}>
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: 'var(--tita-text-muted)',
                      marginBottom: '4px',
                    }}
                  >
                    Sessões Recentes:
                  </div>
                  {history.recentSessions.map((sess, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '4px 0',
                        borderBottom: '1px solid var(--tita-border)',
                      }}
                    >
                      <span>{new Date(sess.date).toLocaleDateString('pt-BR')}</span>
                      <span>
                        {sess.completedSets.map((s) => `${s.weight}kg × ${s.reps}`).join(' • ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              Nenhum registro histórico concluído para este exercício. Complete séries em um treino
              para registrar métricas e PRs.
            </p>
          )}
        </div>

        {/* Alternative / Substitute Exercises */}
        {alternatives.length > 0 && (
          <div>
            <h4
              style={{
                fontSize: 'var(--tita-text-sm)',
                fontWeight: 'var(--tita-weight-bold)',
                marginBottom: 'var(--tita-space-2)',
                color: 'var(--tita-text)',
              }}
            >
              Variações & Alternativas Recomendadas:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-2)' }}>
              {alternatives.map((alt) => (
                <div
                  key={alt.id}
                  onClick={() => setCurrentExercise(alt)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 'var(--tita-space-2) var(--tita-space-3)',
                    backgroundColor: 'var(--tita-surface-2)',
                    borderRadius: 'var(--tita-radius-sm)',
                    border: '1px solid var(--tita-border)',
                    cursor: 'pointer',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 'var(--tita-text-sm)',
                        fontWeight: 'var(--tita-weight-bold)',
                      }}
                    >
                      {alt.name}
                    </div>
                    <div
                      style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}
                    >
                      {alt.primaryMuscle} • {alt.equipment}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    Ver
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
