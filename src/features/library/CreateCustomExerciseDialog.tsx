import React, { useState, useEffect, useMemo } from 'react';
import type { Exercise } from '../../domain/entities/exercise.js';
import { ExerciseLibraryService } from '../../services/exercise-library-service.js';
import { Dialog, Button, Field } from '../../ui/components/index.js';

interface CreateCustomExerciseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service?: ExerciseLibraryService;
  onSuccess?: (exercise: Exercise) => void;
  exerciseToEdit?: Exercise | null;
  exercise?: Exercise | null;
  onSaved?: () => void | Promise<void>;
}

const MUSCLE_OPTIONS = [
  'Peito',
  'Costas',
  'Ombros',
  'Quadríceps',
  'Posteriores',
  'Glúteos',
  'Bíceps',
  'Tríceps',
  'Panturrilhas',
  'Abdômen',
];

const EQUIPMENT_OPTIONS = [
  'Barra',
  'Halteres',
  'Polia',
  'Máquina',
  'Peso Corporal',
  'Kettlebell',
  'Elástico',
  'Outro',
];

const twoColumnGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  alignItems: 'stretch',
  gap: 'var(--tita-space-3)',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
};

const selectFieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tita-space-1)',
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  height: 'var(--tita-touch-min)',
  backgroundColor: 'var(--tita-surface-2)',
  color: 'var(--tita-text)',
  border: '1px solid var(--tita-border)',
  borderRadius: 'var(--tita-radius-sm)',
  padding: '0 var(--tita-space-3)',
  fontSize: 'var(--tita-text-base)',
};

export const CreateCustomExerciseDialog: React.FC<CreateCustomExerciseDialogProps> = ({
  isOpen,
  onClose,
  service,
  onSuccess,
  exerciseToEdit,
  exercise,
  onSaved,
}) => {
  const resolvedService = useMemo(() => service ?? new ExerciseLibraryService(), [service]);
  const editingExercise = exerciseToEdit ?? exercise ?? null;
  const [name, setName] = useState('');
  const [primaryMuscle, setPrimaryMuscle] = useState('Peito');
  const [equipment, setEquipment] = useState('Barra');
  const [category, setCategory] = useState('Hipertrofia');
  const [instructionsText, setInstructionsText] = useState('');
  const [defaultRestSeconds, setDefaultRestSeconds] = useState(90);
  const [increment, setIncrement] = useState(2.0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingExercise) {
      setName(editingExercise.name);
      setPrimaryMuscle(editingExercise.primaryMuscle);
      setEquipment(editingExercise.equipment);
      setCategory(editingExercise.category);
      setInstructionsText(editingExercise.instructions.join('\n'));
      setDefaultRestSeconds(editingExercise.defaultRestSeconds ?? 90);
      setIncrement(editingExercise.increment ?? 2.0);
    } else {
      setName('');
      setPrimaryMuscle('Peito');
      setEquipment('Barra');
      setCategory('Hipertrofia');
      setInstructionsText('');
      setDefaultRestSeconds(90);
      setIncrement(2.0);
    }
    setErrorMsg(null);
  }, [editingExercise, isOpen]);

  const finishSave = async (savedExercise: Exercise) => {
    onSuccess?.(savedExercise);
    await onSaved?.();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('O nome do exercício é obrigatório.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const instructions = instructionsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      if (editingExercise) {
        const updated = await resolvedService.updateCustomExercise(editingExercise.id, {
          name,
          primaryMuscle,
          equipment,
          category,
          instructions: instructions.length > 0 ? instructions : ['Execução personalizada.'],
          defaultRestSeconds,
          increment,
        });
        await finishSave(updated);
      } else {
        const created = await resolvedService.createCustomExercise({
          name,
          primaryMuscle,
          equipment,
          category,
          instructions: instructions.length > 0 ? instructions : ['Execução personalizada.'],
          defaultRestSeconds,
          increment,
        });
        await finishSave(created);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar exercício.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      className="tita-custom-exercise-dialog"
      isOpen={isOpen}
      onClose={onClose}
      title={editingExercise ? 'Editar Exercício' : 'Criar Exercício Personalizado'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting
              ? 'Salvando...'
              : editingExercise
                ? 'Salvar Alterações'
                : 'Criar Exercício'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--tita-space-4)',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
        }}
      >
        {errorMsg && (
          <div
            style={{
              padding: 'var(--tita-space-2) var(--tita-space-3)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--tita-error)',
              borderRadius: 'var(--tita-radius-sm)',
              fontSize: 'var(--tita-text-sm)',
              overflowWrap: 'anywhere',
            }}
          >
            {errorMsg}
          </div>
        )}

        <Field
          label="Nome do Exercício *"
          placeholder="Ex: Supino Spoto com Halteres"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="tita-custom-exercise-grid" style={twoColumnGridStyle}>
          <div style={selectFieldStyle}>
            <label
              htmlFor="muscle-select"
              style={{
                fontSize: 'var(--tita-text-sm)',
                fontWeight: 'var(--tita-weight-medium)',
                color: 'var(--tita-text)',
              }}
            >
              Músculo Principal *
            </label>
            <select
              id="muscle-select"
              value={primaryMuscle}
              onChange={(e) => setPrimaryMuscle(e.target.value)}
              style={selectStyle}
            >
              {MUSCLE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div style={selectFieldStyle}>
            <label
              htmlFor="equipment-select"
              style={{
                fontSize: 'var(--tita-text-sm)',
                fontWeight: 'var(--tita-weight-medium)',
                color: 'var(--tita-text)',
              }}
            >
              Equipamento *
            </label>
            <select
              id="equipment-select"
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              style={selectStyle}
            >
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tita-custom-exercise-grid" style={twoColumnGridStyle}>
          <Field
            label="Descanso Padrão (segundos)"
            type="number"
            inputMode="numeric"
            min={10}
            value={defaultRestSeconds}
            onChange={(e) => setDefaultRestSeconds(Math.max(10, parseInt(e.target.value) || 90))}
          />
          <Field
            label="Incremento Mínimo (kg)"
            type="number"
            inputMode="decimal"
            min={0.5}
            step="0.5"
            value={increment}
            onChange={(e) => setIncrement(Math.max(0.5, parseFloat(e.target.value) || 2.0))}
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--tita-space-1)',
            minWidth: 0,
          }}
        >
          <label
            htmlFor="instructions-textarea"
            style={{
              fontSize: 'var(--tita-text-sm)',
              fontWeight: 'var(--tita-weight-medium)',
              color: 'var(--tita-text)',
            }}
          >
            Instruções e Dicas Técnicas (uma por linha):
          </label>
          <textarea
            id="instructions-textarea"
            rows={3}
            value={instructionsText}
            onChange={(e) => setInstructionsText(e.target.value)}
            placeholder="1. Posição inicial dos pés&#10;2. Pegada e alinhamento&#10;3. Cadência de descida"
            style={{
              width: '100%',
              maxWidth: '100%',
              minWidth: 0,
              boxSizing: 'border-box',
              backgroundColor: 'var(--tita-surface-2)',
              color: 'var(--tita-text)',
              border: '1px solid var(--tita-border)',
              borderRadius: 'var(--tita-radius-sm)',
              padding: 'var(--tita-space-2)',
              fontSize: 'var(--tita-text-sm)',
              fontFamily: 'inherit',
              resize: 'vertical',
            }}
          />
        </div>
      </form>
    </Dialog>
  );
};
