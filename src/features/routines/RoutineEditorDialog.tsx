import React, { useState, useEffect, useMemo } from 'react';
import type { Routine, RoutineExercise } from '../../domain/entities/routine.js';
import type { Exercise } from '../../domain/entities/exercise.js';
import { SetType } from '../../domain/enums/set-type.js';
import { ProgressionStrategyType } from '../../domain/enums/progression-strategy-type.js';
import { RoutineService } from '../../services/routine-service.js';
import { ExerciseLibraryService } from '../../services/exercise-library-service.js';
import { Dialog, Button, Field, Card } from '../../ui/components/index.js';

interface RoutineEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  routineToEdit?: Routine | null;
  onSaved: () => void;
  routineService: RoutineService;
}

interface EditableSet {
  type: SetType;
  targetLoad?: number;
  targetReps?: number;
  restSeconds?: number;
  notes?: string;
}

interface EditableSlot {
  id: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscle?: string;
  restSeconds: number;
  notes?: string;
  progressionStrategy?: ProgressionStrategyType;
  sets: EditableSet[];
}

const STRATEGY_OPTIONS: { value: ProgressionStrategyType; label: string; desc: string }[] = [
  {
    value: ProgressionStrategyType.DOUBLE_PROGRESSION,
    label: 'Dupla Progressão (Reps → Carga)',
    desc: 'Aumenta repetições até o topo da faixa; ao bater o teto em todas as séries, sobe a carga.',
  },
  {
    value: ProgressionStrategyType.LINEAR_PROGRESSION,
    label: 'Progressão Linear (Carga por Sessão)',
    desc: 'Adiciona um incremento fixo de carga a cada treino completo com sucesso.',
  },
  {
    value: ProgressionStrategyType.DYNAMIC_DOUBLE_PROGRESSION,
    label: 'Dupla Progressão Dinâmica (Set por Set)',
    desc: 'Cada série progride de forma independente ao atingir o teto de repetições.',
  },
  {
    value: ProgressionStrategyType.REP_GOAL,
    label: 'Meta de Repetições Totais (Rep Goal)',
    desc: 'Sobe a carga ao atingir a soma global estipulada de repetições em todas as séries.',
  },
  {
    value: ProgressionStrategyType.PERCENTAGE_BASED,
    label: 'Percentual de 1RM (% Baseado em Carga Máxima)',
    desc: 'Calcula cargas relativas a partir da estimativa de 1RM do praticante.',
  },
  {
    value: ProgressionStrategyType.RPE_RIR_BASED,
    label: 'Autorregulação RPE / RIR (Esforço Percebido)',
    desc: 'Sugere ajustes de carga conforme a percepção de esforço e repetições de reserva.',
  },
  {
    value: ProgressionStrategyType.TOP_SET_BACKOFF,
    label: 'Top Set + Back-off',
    desc: 'Uma série pesada de intensidade máxima seguida de séries de suporte com carga reduzida.',
  },
  {
    value: ProgressionStrategyType.MANUAL,
    label: 'Manual (Sem Sugestões Automáticas)',
    desc: 'O praticante define todas as cargas sem sugestões automáticas do sistema.',
  },
  {
    value: ProgressionStrategyType.CUSTOM,
    label: 'Personalizada',
    desc: 'Regra específica do programa do praticante.',
  },
];

export const RoutineEditorDialog: React.FC<RoutineEditorDialogProps> = ({
  isOpen,
  onClose,
  routineToEdit,
  onSaved,
  routineService,
}) => {
  const libraryService = useMemo(() => new ExerciseLibraryService(), []);

  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [defaultProgressionStrategy, setDefaultProgressionStrategy] =
    useState<ProgressionStrategyType>(ProgressionStrategyType.DOUBLE_PROGRESSION);
  const [slots, setSlots] = useState<EditableSlot[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load exercises for picker
  useEffect(() => {
    if (isOpen) {
      libraryService.initialize().then(() => {
        libraryService.getExercises().then(setAvailableExercises);
      });
    }
  }, [isOpen, libraryService]);

  // Reset or populate fields
  useEffect(() => {
    if (!isOpen) return;

    if (routineToEdit) {
      setName(routineToEdit.name);
      setNotes(routineToEdit.notes || '');
      setDefaultProgressionStrategy(
        routineToEdit.defaultProgressionStrategy ?? ProgressionStrategyType.DOUBLE_PROGRESSION,
      );

      // Map routine exercises to editable slots
      const mappedSlots: EditableSlot[] = routineToEdit.exercises.map((slot) => {
        const foundEx = availableExercises.find((e) => e.id === slot.exerciseId);
        return {
          id: slot.id,
          exerciseId: slot.exerciseId,
          exerciseName: foundEx?.name || `Exercício (${slot.exerciseId})`,
          primaryMuscle: foundEx?.primaryMuscle,
          restSeconds: slot.restSeconds ?? 90,
          notes: slot.notes,
          progressionStrategy: slot.progressionStrategy ?? routineToEdit.defaultProgressionStrategy,
          sets: slot.sets.map((s) => ({
            type: s.type,
            targetLoad: s.targetLoad,
            targetReps: s.targetReps ?? s.minReps ?? 10,
            restSeconds: s.restSeconds ?? slot.restSeconds ?? 90,
            notes: s.notes,
          })),
        };
      });

      setSlots(mappedSlots);
    } else {
      setName('');
      setNotes('');
      setDefaultProgressionStrategy(ProgressionStrategyType.DOUBLE_PROGRESSION);
      setSlots([]);
    }

    setErrorMessage(null);
  }, [isOpen, routineToEdit, availableExercises]);

  // Exercise Picker selection
  const handleSelectExercise = (ex: Exercise) => {
    const newSlot: EditableSlot = {
      id: `temp_${Date.now()}_${Math.random()}`,
      exerciseId: ex.id,
      exerciseName: ex.name,
      primaryMuscle: ex.primaryMuscle,
      restSeconds: ex.defaultRestSeconds ?? 90,
      sets: [
        {
          type: SetType.NORMAL,
          targetReps: 10,
          restSeconds: ex.defaultRestSeconds ?? 90,
        },
        {
          type: SetType.NORMAL,
          targetReps: 10,
          restSeconds: ex.defaultRestSeconds ?? 90,
        },
        {
          type: SetType.NORMAL,
          targetReps: 10,
          restSeconds: ex.defaultRestSeconds ?? 90,
        },
      ],
    };

    setSlots((prev) => [...prev, newSlot]);
    setIsExercisePickerOpen(false);
    setExerciseSearchTerm('');
  };

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveSlot = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === slots.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    setSlots((prev) => {
      const copy = [...prev];
      const temp = copy[index]!;
      copy[index] = copy[targetIndex]!;
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleAddSetToSlot = (slotIndex: number) => {
    setSlots((prev) => {
      const copy = [...prev];
      const slot = copy[slotIndex]!;
      const lastSet = slot.sets[slot.sets.length - 1];
      const newSet: EditableSet = {
        type: lastSet ? lastSet.type : SetType.NORMAL,
        targetLoad: lastSet?.targetLoad,
        targetReps: lastSet?.targetReps ?? 10,
        restSeconds: lastSet?.restSeconds ?? slot.restSeconds,
      };

      copy[slotIndex] = {
        ...slot,
        sets: [...slot.sets, newSet],
      };
      return copy;
    });
  };

  const handleRemoveSetFromSlot = (slotIndex: number, setIndex: number) => {
    setSlots((prev) => {
      const copy = [...prev];
      const slot = copy[slotIndex]!;
      if (slot.sets.length <= 1) return prev; // Keep at least one set

      copy[slotIndex] = {
        ...slot,
        sets: slot.sets.filter((_, i) => i !== setIndex),
      };
      return copy;
    });
  };

  const handleUpdateSet = (slotIndex: number, setIndex: number, updates: Partial<EditableSet>) => {
    setSlots((prev) => {
      const copy = [...prev];
      const slot = copy[slotIndex]!;
      const updatedSets = [...slot.sets];
      updatedSets[setIndex] = {
        ...updatedSets[setIndex]!,
        ...updates,
      };
      copy[slotIndex] = {
        ...slot,
        sets: updatedSets,
      };
      return copy;
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setErrorMessage('Por favor, informe o nome da rotina.');
      return;
    }

    if (slots.length === 0) {
      setErrorMessage('Adicione ao menos um exercício à rotina.');
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      const exerciseInputs = slots.map((s) => ({
        exerciseId: s.exerciseId,
        restSeconds: s.restSeconds,
        notes: s.notes,
        progressionStrategy: s.progressionStrategy ?? defaultProgressionStrategy,
        sets: s.sets.map((st) => ({
          type: st.type,
          targetLoad: st.targetLoad,
          targetReps: st.targetReps,
          restSeconds: st.restSeconds,
          notes: st.notes,
        })),
      }));

      if (routineToEdit) {
        await routineService.updateRoutine(routineToEdit.id, {
          name: name.trim(),
          notes: notes.trim(),
          defaultProgressionStrategy,
          exercises: exerciseInputs,
        });
      } else {
        await routineService.createRoutine({
          name: name.trim(),
          notes: notes.trim(),
          defaultProgressionStrategy,
          exercises: exerciseInputs,
        });
      }

      onSaved();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erro ao salvar rotina.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog
        isOpen={isOpen && !isExercisePickerOpen}
        onClose={onClose}
        title={routineToEdit ? 'Editar Rotina' : 'Nova Rotina de Treino'}
        footer={
          <div style={{ display: 'flex', gap: 'var(--tita-space-2)' }}>
            <Button variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              data-testid="save-routine-btn"
            >
              {isSaving ? 'Salvando...' : 'Salvar Rotina'}
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                padding: 'var(--tita-space-2) var(--tita-space-3)',
                borderRadius: 'var(--tita-radius-sm)',
                fontSize: 'var(--tita-text-sm)',
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Routine Name */}
          <Field
            label="Nome da Rotina:"
            placeholder="Ex: Upper A — Força & Peitoral"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Notes */}
          <Field
            label="Observações / Instruções (opcional):"
            placeholder="Ex: Aquecer manguitos, descanso de 2min nos primeiros exercícios."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Default Progression Strategy Selector (Guardrail 3) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-1)' }}>
            <label
              htmlFor="routine-progression-strategy"
              style={{
                fontSize: 'var(--tita-text-xs)',
                fontWeight: 'var(--tita-weight-bold)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                color: 'var(--tita-text-muted)',
              }}
            >
              Estratégia de Sobrecarga Progressiva:
            </label>
            <select
              id="routine-progression-strategy"
              data-testid="routine-progression-strategy-select"
              value={defaultProgressionStrategy}
              onChange={(e) =>
                setDefaultProgressionStrategy(e.target.value as ProgressionStrategyType)
              }
              style={{
                minHeight: '44px',
                backgroundColor: 'var(--tita-surface-2)',
                color: 'var(--tita-text)',
                border: '1px solid var(--tita-border)',
                borderRadius: 'var(--tita-radius-sm)',
                padding: '0 var(--tita-space-3)',
                fontSize: 'var(--tita-text-sm)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {STRATEGY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '11px', color: 'var(--tita-text-muted)', marginTop: '2px' }}>
              {STRATEGY_OPTIONS.find((o) => o.value === defaultProgressionStrategy)?.desc}
            </span>
          </div>

          {/* Exercise Slots Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3
              style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'var(--tita-weight-bold)' }}
            >
              Exercícios Planejados ({slots.length})
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsExercisePickerOpen(true)}
              data-testid="add-exercise-to-routine-btn"
            >
              + Adicionar Exercício
            </Button>
          </div>

          {slots.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 'var(--tita-space-6)',
                backgroundColor: 'var(--tita-surface-2)',
                borderRadius: 'var(--tita-radius-md)',
                color: 'var(--tita-text-muted)',
                fontSize: 'var(--tita-text-sm)',
              }}
            >
              Nenhum exercício adicionado. Clique em &quot;+ Adicionar Exercício&quot; acima para
              selecionar do catálogo.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
              {slots.map((slot, sIdx) => (
                <Card key={slot.id || sIdx}>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-2)' }}
                  >
                    {/* Slot Header */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: 'var(--tita-text-base)',
                            marginRight: '8px',
                          }}
                        >
                          {sIdx + 1}. {slot.exerciseName}
                        </span>
                        {slot.primaryMuscle && (
                          <span
                            style={{
                              fontSize: '11px',
                              backgroundColor: 'var(--tita-surface-2)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              color: 'var(--tita-text-muted)',
                            }}
                          >
                            {slot.primaryMuscle}
                          </span>
                        )}
                      </div>

                      {/* Reorder and Delete */}
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleMoveSlot(sIdx, 'up')}
                          disabled={sIdx === 0}
                          title="Mover para cima"
                          style={{
                            background: 'none',
                            border: '1px solid var(--tita-border)',
                            borderRadius: '4px',
                            color: sIdx === 0 ? 'var(--tita-border)' : 'var(--tita-text)',
                            cursor: sIdx === 0 ? 'default' : 'pointer',
                            padding: '2px 6px',
                            fontSize: '12px',
                          }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSlot(sIdx, 'down')}
                          disabled={sIdx === slots.length - 1}
                          title="Mover para baixo"
                          style={{
                            background: 'none',
                            border: '1px solid var(--tita-border)',
                            borderRadius: '4px',
                            color:
                              sIdx === slots.length - 1 ? 'var(--tita-border)' : 'var(--tita-text)',
                            cursor: sIdx === slots.length - 1 ? 'default' : 'pointer',
                            padding: '2px 6px',
                            fontSize: '12px',
                          }}
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSlot(sIdx)}
                          title="Remover exercício"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontSize: '16px',
                            marginLeft: '4px',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Sets List */}
                    <div
                      style={{
                        marginTop: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '40px 100px 70px 70px 30px',
                          gap: '6px',
                          fontSize: '11px',
                          color: 'var(--tita-text-muted)',
                          fontWeight: 'bold',
                        }}
                      >
                        <span>SÉRIE</span>
                        <span>TIPO</span>
                        <span>CARGA</span>
                        <span>REPS</span>
                        <span></span>
                      </div>

                      {slot.sets.map((st, setIdx) => (
                        <div
                          key={setIdx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '40px 100px 70px 70px 30px',
                            gap: '6px',
                            alignItems: 'center',
                          }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{setIdx + 1}</span>

                          {/* Set Type */}
                          <select
                            value={st.type}
                            aria-label={`Tipo da série ${setIdx + 1}`}
                            onChange={(e) =>
                              handleUpdateSet(sIdx, setIdx, { type: e.target.value as SetType })
                            }
                            style={{
                              height: '28px',
                              backgroundColor: 'var(--tita-surface-2)',
                              color: 'var(--tita-text)',
                              border: '1px solid var(--tita-border)',
                              borderRadius: '4px',
                              fontSize: '11px',
                            }}
                          >
                            <option value={SetType.NORMAL}>Normal</option>
                            <option value={SetType.WARMUP}>Aquecimento</option>
                            <option value={SetType.TOP_SET}>Top Set</option>
                            <option value={SetType.BACKOFF}>Backoff</option>
                            <option value={SetType.DROP_SET}>Drop Set</option>
                          </select>

                          {/* Target Load */}
                          <input
                            type="number"
                            placeholder="kg"
                            value={st.targetLoad ?? ''}
                            onChange={(e) =>
                              handleUpdateSet(sIdx, setIdx, {
                                targetLoad: e.target.value ? Number(e.target.value) : undefined,
                              })
                            }
                            style={{
                              height: '28px',
                              backgroundColor: 'var(--tita-surface-2)',
                              color: 'var(--tita-text)',
                              border: '1px solid var(--tita-border)',
                              borderRadius: '4px',
                              padding: '0 4px',
                              fontSize: '12px',
                              textAlign: 'center',
                            }}
                          />

                          {/* Target Reps */}
                          <input
                            type="number"
                            placeholder="reps"
                            value={st.targetReps ?? ''}
                            onChange={(e) =>
                              handleUpdateSet(sIdx, setIdx, {
                                targetReps: e.target.value ? Number(e.target.value) : 10,
                              })
                            }
                            style={{
                              height: '28px',
                              backgroundColor: 'var(--tita-surface-2)',
                              color: 'var(--tita-text)',
                              border: '1px solid var(--tita-border)',
                              borderRadius: '4px',
                              padding: '0 4px',
                              fontSize: '12px',
                              textAlign: 'center',
                            }}
                          />

                          {/* Remove Set */}
                          {slot.sets.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveSetFromSlot(sIdx, setIdx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--tita-text-muted)',
                                cursor: 'pointer',
                                fontSize: '14px',
                              }}
                            >
                              ✕
                            </button>
                          ) : (
                            <span />
                          )}
                        </div>
                      ))}

                      <div style={{ marginTop: '4px' }}>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddSetToSlot(sIdx)}
                          style={{ fontSize: '11px', padding: '2px 8px' }}
                        >
                          + Adicionar Série
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* Exercise Picker Subdialog */}
      <Dialog
        isOpen={isExercisePickerOpen}
        onClose={() => setIsExercisePickerOpen(false)}
        title="Selecionar Exercício"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
          <Field
            label="Buscar exercício"
            hideLabel
            placeholder="Buscar por nome (ex: Supino, Barra, Puxada)..."
            value={exerciseSearchTerm}
            onChange={(e) => setExerciseSearchTerm(e.target.value)}
          />

          <div
            style={{
              maxHeight: '350px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            {availableExercises
              .filter(
                (ex) =>
                  !exerciseSearchTerm.trim() ||
                  ex.name.toLowerCase().includes(exerciseSearchTerm.toLowerCase()) ||
                  ex.aliases.some((a) =>
                    a.toLowerCase().includes(exerciseSearchTerm.toLowerCase()),
                  ),
              )
              .slice(0, 20)
              .map((ex) => (
                <div
                  key={ex.id}
                  onClick={() => handleSelectExercise(ex)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: 'var(--tita-radius-sm)',
                    backgroundColor: 'var(--tita-surface)',
                    border: '1px solid var(--tita-border)',
                    cursor: 'pointer',
                  }}
                  data-testid={`picker-exercise-${ex.id}`}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: 'var(--tita-text-sm)' }}>
                      {ex.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--tita-text-muted)' }}>
                      {ex.primaryMuscle} • {ex.equipment}
                    </div>
                  </div>
                  <Button size="sm" variant="secondary">
                    Selecionar
                  </Button>
                </div>
              ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 'var(--tita-space-2)',
            }}
          >
            <Button variant="secondary" onClick={() => setIsExercisePickerOpen(false)}>
              Voltar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
};
