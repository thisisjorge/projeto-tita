import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Routine, RoutineExercise } from '../../domain/entities/routine.js';
import type { Exercise } from '../../domain/entities/exercise.js';
import { SetType } from '../../domain/enums/set-type.js';
import { ProgressionStrategyType } from '../../domain/enums/progression-strategy-type.js';
import { RoutineService } from '../../services/routine-service.js';
import { ExerciseLibraryService } from '../../services/exercise-library-service.js';
import { exerciseSearchScore } from '../../services/exercise-search.js';
import { WEEKDAYS, WEEKDAY_SHORT, isOptionalRoutine, type Weekday } from '../../domain/weekday.js';
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
  minReps?: number;
  maxReps?: number;
  targetRir?: number;
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
  const [weekday, setWeekday] = useState<Weekday | ''>('');
  const [optional, setOptional] = useState(false);
  const [notes, setNotes] = useState('');
  const [defaultProgressionStrategy, setDefaultProgressionStrategy] =
    useState<ProgressionStrategyType>(ProgressionStrategyType.DOUBLE_PROGRESSION);
  const [slots, setSlots] = useState<EditableSlot[]>([]);
  const [availableExercises, setAvailableExercises] = useState<Exercise[]>([]);
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState(false);
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const initializedRoutine = useRef<Routine | null | undefined>(undefined);

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
    if (!isOpen) {
      initializedRoutine.current = undefined;
      return;
    }
    const identity = routineToEdit ?? null;
    if (initializedRoutine.current === identity) return;
    initializedRoutine.current = identity;

    if (routineToEdit) {
      setName(routineToEdit.name);
      setWeekday(routineToEdit.weekday ?? '');
      setOptional(isOptionalRoutine(routineToEdit));
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
            minReps: s.minReps,
            maxReps: s.maxReps,
            targetRir: s.targetRir,
            restSeconds: s.restSeconds ?? slot.restSeconds ?? 90,
            notes: s.notes,
          })),
        };
      });

      setSlots(mappedSlots);
    } else {
      setName('');
      setWeekday('');
      setOptional(false);
      setNotes('');
      setDefaultProgressionStrategy(ProgressionStrategyType.DOUBLE_PROGRESSION);
      setSlots([]);
    }

    setErrorMessage(null);
  }, [isOpen, routineToEdit, availableExercises]);

  // Catalog arrival only enriches labels; it must never reset edits already typed.
  useEffect(() => {
    setSlots((current) =>
      current.map((slot) => {
        const exercise = availableExercises.find((item) => item.id === slot.exerciseId);
        return exercise
          ? { ...slot, exerciseName: exercise.name, primaryMuscle: exercise.primaryMuscle }
          : slot;
      }),
    );
  }, [availableExercises]);

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
        minReps: lastSet?.minReps,
        maxReps: lastSet?.maxReps,
        targetRir: lastSet?.targetRir,
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
        id: s.id,
        exerciseId: s.exerciseId,
        restSeconds: s.restSeconds,
        notes: s.notes,
        progressionStrategy: s.progressionStrategy ?? defaultProgressionStrategy,
        sets: s.sets.map((st) => ({
          type: st.type,
          targetLoad: st.targetLoad,
          targetReps: st.targetReps,
          minReps: st.minReps,
          maxReps: st.maxReps,
          targetRir: st.targetRir,
          restSeconds: st.restSeconds,
          notes: st.notes,
        })),
      }));

      if (routineToEdit) {
        await routineService.updateRoutine(routineToEdit.id, {
          name: name.trim(),
          weekday: weekday || null,
          optional,
          notes: notes.trim(),
          defaultProgressionStrategy,
          exercises: exerciseInputs,
        });
      } else {
        await routineService.createRoutine({
          name: name.trim(),
          weekday: weekday || undefined,
          optional,
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

  const returnToPickerTrigger = useRef(false);

  return (
    <>
      <Dialog
        isOpen={isOpen && !isExercisePickerOpen}
        className="tita-routine-editor"
        initialFocusSelector={
          returnToPickerTrigger.current ? '[data-testid="add-exercise-to-routine-btn"]' : undefined
        }
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
            placeholder="Ex.: Superior A — Força e peitoral"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <label
            style={{
              display: 'grid',
              gap: 'var(--tita-space-1)',
              fontSize: 'var(--tita-text-sm)',
              color: 'var(--tita-text-secondary)',
            }}
          >
            Dia da semana
            <select
              value={weekday}
              onChange={(event) => {
                const day = event.target.value as Weekday | '';
                setWeekday(day);
                if (day === 'SÁBADO' || day === 'DOMINGO') setOptional(true);
              }}
              data-testid="routine-weekday-select"
              style={{
                minHeight: 44,
                background: 'var(--tita-surface-2)',
                color: 'var(--tita-text)',
                border: '1px solid var(--tita-border)',
                borderRadius: 'var(--tita-radius-sm)',
                padding: '0 var(--tita-space-3)',
              }}
            >
              <option value="">Sem dia fixo</option>
              {WEEKDAYS.map((day) => (
                <option key={day} value={day}>
                  {WEEKDAY_SHORT[day]} · {day}
                </option>
              ))}
            </select>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--tita-space-2)',
              fontSize: 'var(--tita-text-sm)',
              color: 'var(--tita-text-secondary)',
            }}
          >
            <input
              type="checkbox"
              checked={optional}
              onChange={(event) => setOptional(event.target.checked)}
              data-testid="routine-optional-checkbox"
              style={{ width: 44, height: 44, flex: '0 0 44px', accentColor: 'var(--tita-accent)' }}
            />
            Rotina opcional (fora da meta semanal)
          </label>

          {/* Notes */}
          <Field
            label="Observações / Instruções (opcional):"
            placeholder="Ex: Aquecer manguitos, descanso de 2min nos primeiros exercícios."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Default Progression Strategy Selector (Guardrail 3) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--tita-space-2)',
              padding: 'var(--tita-space-4)',
              background: 'var(--tita-surface-2)',
              border: '1px solid var(--tita-border)',
              borderRadius: 'var(--tita-radius-md)',
            }}
          >
            <strong
              style={{
                color: 'var(--tita-text)',
                fontFamily: 'var(--tita-font-display)',
                fontSize: 'var(--tita-text-base)',
              }}
            >
              Progressão
            </strong>
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
            {defaultProgressionStrategy === ProgressionStrategyType.DOUBLE_PROGRESSION && (
              <p
                style={{
                  margin: 0,
                  fontSize: 'var(--tita-text-xs)',
                  lineHeight: 1.5,
                  color: 'var(--tita-text-secondary)',
                }}
              >
                Exemplo 4 × 5–8: com 70 kg, 8/8/7/6 indica manter. Quando todas as séries chegarem a
                8 com RIR adequado, considere o menor aumento disponível. Com 72,5 kg, volte à base
                da faixa. Uma queda isolada pede observação; quedas repetidas podem pedir redução.
                Toda mudança de carga exige sua confirmação.
              </p>
            )}
          </div>

          {/* Exercise Slots Section */}
          <div
            className="tita-routine-editor__section-heading"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <h3
              style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'var(--tita-weight-bold)' }}
            >
              Exercícios Planejados ({slots.length})
            </h3>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                returnToPickerTrigger.current = true;
                setIsExercisePickerOpen(true);
              }}
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
                      className="tita-routine-editor__slot-heading"
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
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 'var(--tita-space-2)',
                        marginTop: 'var(--tita-space-3)',
                      }}
                    >
                      {(['minReps', 'maxReps', 'targetRir'] as const).map((field) => (
                        <label
                          key={field}
                          style={{
                            display: 'grid',
                            gap: 4,
                            fontSize: 'var(--tita-text-xs)',
                            color: 'var(--tita-text-muted)',
                          }}
                        >
                          {field === 'minReps'
                            ? 'Reps mín.'
                            : field === 'maxReps'
                              ? 'Reps máx.'
                              : 'RIR alvo'}
                          <input
                            type="number"
                            min="0"
                            max={field === 'targetRir' ? 5 : 50}
                            value={slot.sets[0]?.[field] ?? ''}
                            onChange={(event) => {
                              const value =
                                event.target.value === '' ? undefined : Number(event.target.value);
                              setSlots((previous) =>
                                previous.map((item, index) =>
                                  index === sIdx
                                    ? {
                                        ...item,
                                        sets: item.sets.map((set) => ({ ...set, [field]: value })),
                                      }
                                    : item,
                                ),
                              );
                            }}
                            style={{
                              width: 76,
                              height: 32,
                              background: 'var(--tita-surface-2)',
                              color: 'var(--tita-text)',
                              border: '1px solid var(--tita-border)',
                              borderRadius: 4,
                              padding: '0 6px',
                            }}
                          />
                        </label>
                      ))}
                    </div>
                    <div
                      style={{
                        marginTop: '4px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div
                        className="tita-routine-editor__set-labels"
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
                          className="tita-routine-editor__set"
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
                          <label className="tita-routine-editor__load">
                            Carga (kg)
                            <input
                              type="number"
                              inputMode="decimal"
                              aria-label={`Carga da série ${setIdx + 1} de ${slot.exerciseName}`}
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
                          </label>

                          {/* Target Reps */}
                          <label className="tita-routine-editor__reps">
                            Reps
                            <input
                              type="number"
                              inputMode="numeric"
                              aria-label={`Repetições da série ${setIdx + 1} de ${slot.exerciseName}`}
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
                          </label>

                          {/* Remove Set */}
                          {slot.sets.length > 1 ? (
                            <button
                              type="button"
                              aria-label={`Remover série ${setIdx + 1} de ${slot.exerciseName}`}
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
                  !exerciseSearchTerm.trim() || exerciseSearchScore(ex, exerciseSearchTerm) >= 0,
              )
              .sort((a, b) =>
                exerciseSearchTerm.trim()
                  ? exerciseSearchScore(b, exerciseSearchTerm) -
                    exerciseSearchScore(a, exerciseSearchTerm)
                  : 0,
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
