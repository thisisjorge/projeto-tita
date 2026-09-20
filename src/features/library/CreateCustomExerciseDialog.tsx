import React, { useState, useEffect } from 'react';
import type { Exercise } from '../../domain/entities/exercise.js';
import { ExerciseLibraryService } from '../../services/exercise-library-service.js';
import { Dialog, Button, Field } from '../../ui/components/index.js';

interface CreateCustomExerciseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: ExerciseLibraryService;
  onSuccess: (exercise: Exercise) => void;
  exerciseToEdit?: Exercise | null;
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

export const CreateCustomExerciseDialog: React.FC<CreateCustomExerciseDialogProps> = ({
  isOpen,
  onClose,
  service,
  onSuccess,
  exerciseToEdit,
}) => {
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
    if (exerciseToEdit) {
      setName(exerciseToEdit.name);
      setPrimaryMuscle(exerciseToEdit.primaryMuscle);
      setEquipment(exerciseToEdit.equipment);
      setCategory(exerciseToEdit.category);
      setInstructionsText(exerciseToEdit.instructions.join('\n'));
      setDefaultRestSeconds(exerciseToEdit.defaultRestSeconds ?? 90);
      setIncrement(exerciseToEdit.increment ?? 2.0);
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
  }, [exerciseToEdit, isOpen]);

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
      if (exerciseToEdit) {
        const updated = await service.updateCustomExercise(exerciseToEdit.id, {
          name,
          primaryMuscle,
          equipment,
          category,
          instructions: instructions.length > 0 ? instructions : ['Execução personalizada.'],
          defaultRestSeconds,
          increment,
        });
        onSuccess(updated);
        onClose();
      } else {
        const created = await service.createCustomExercise({
          name,
          primaryMuscle,
          equipment,
          category,
          instructions: instructions.length > 0 ? instructions : ['Execução personalizada.'],
          defaultRestSeconds,
          increment,
        });
        onSuccess(created);
        onClose();
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar exercício.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={exerciseToEdit ? 'Editar Exercício' : 'Criar Exercício Personalizado'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting
              ? 'Salvando...'
              : exerciseToEdit
                ? 'Salvar Alterações'
                : 'Criar Exercício'}
          </Button>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}
      >
        {errorMsg && (
          <div
            style={{
              padding: 'var(--tita-space-2) var(--tita-space-3)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderRadius: 'var(--tita-radius-sm)',
              fontSize: 'var(--tita-text-sm)',
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

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--tita-space-3)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-1)' }}>
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
              style={{
                height: 'var(--tita-touch-min)',
                backgroundColor: 'var(--tita-surface-2)',
                color: 'var(--tita-text)',
                border: '1px solid var(--tita-border)',
                borderRadius: 'var(--tita-radius-sm)',
                padding: '0 var(--tita-space-2)',
                fontSize: 'var(--tita-text-base)',
              }}
            >
              {MUSCLE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-1)' }}>
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
              style={{
                height: 'var(--tita-touch-min)',
                backgroundColor: 'var(--tita-surface-2)',
                color: 'var(--tita-text)',
                border: '1px solid var(--tita-border)',
                borderRadius: 'var(--tita-radius-sm)',
                padding: '0 var(--tita-space-2)',
                fontSize: 'var(--tita-text-base)',
              }}
            >
              {EQUIPMENT_OPTIONS.map((eq) => (
                <option key={eq} value={eq}>
                  {eq}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--tita-space-3)' }}
        >
          <Field
            label="Descanso Padrão (segundos)"
            type="number"
            value={defaultRestSeconds}
            onChange={(e) => setDefaultRestSeconds(Math.max(10, parseInt(e.target.value) || 90))}
          />
          <Field
            label="Incremento Mínimo (kg)"
            type="number"
            step="0.5"
            value={increment}
            onChange={(e) => setIncrement(Math.max(0.5, parseFloat(e.target.value) || 2.0))}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-1)' }}>
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
