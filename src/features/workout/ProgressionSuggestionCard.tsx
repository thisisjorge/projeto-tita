import React, { useState } from 'react';
import type {
  ProgressionSuggestion,
  ProgressionSetSuggestion,
} from '../../domain/progression/types.js';
import { Button } from '../../ui/components/index.js';
import { BoltIcon, ChartIcon } from '../../ui/components/icons.js';
import { PROGRESSION_LABELS, progressionText } from '../../ui/progression-labels.js';
import { IntelligenceAction } from '../intelligence/IntelligenceAction.js';
import { progressionSummary } from '../../intelligence/summaries.js';

export interface ProgressionSuggestionCardProps {
  suggestion: ProgressionSuggestion;
  onApply: (
    suggestion: ProgressionSuggestion,
    customSets?: readonly ProgressionSetSuggestion[],
  ) => void;
  onIgnore: (suggestionId: string) => void;
}

export const ProgressionSuggestionCard: React.FC<ProgressionSuggestionCardProps> = ({
  suggestion,
  onApply,
  onIgnore,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedSets, setEditedSets] = useState<ProgressionSetSuggestion[]>([
    ...suggestion.suggestedSets,
  ]);

  const handleApply = () => {
    if (isEditing) {
      onApply(suggestion, editedSets);
    } else {
      onApply(suggestion);
    }
  };

  return (
    <div
      style={{
        margin: 'var(--tita-space-2) 0',
        padding: 'var(--tita-space-3)',
        borderRadius: 'var(--tita-radius-md)',
        backgroundColor: 'var(--tita-surface-2)',
        border: '1px solid var(--tita-accent)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--tita-space-2)',
      }}
      data-testid={`progression-card-${suggestion.exerciseId}`}
    >
      {/* Header with Title and Strategy Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 'var(--tita-space-1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
          <BoltIcon aria-hidden="true" />
          <span
            style={{
              fontWeight: 'var(--tita-weight-bold)',
              fontSize: 'var(--tita-text-sm)',
              color: 'var(--tita-text)',
            }}
          >
            {PROGRESSION_LABELS[suggestion.strategyType] ?? progressionText(suggestion.title)}
          </span>
        </div>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: 'var(--tita-accent)',
            color: 'var(--tita-primary-contrast)',
            textTransform: 'uppercase',
          }}
        >
          {suggestion.title.includes('Subir') || suggestion.title.includes('Aumentar')
            ? 'Aumentar carga'
            : 'Meta sugerida'}
        </span>
      </div>

      {/* Summary recommendation */}
      <div
        style={{
          fontSize: 'var(--tita-text-sm)',
          fontWeight: 'var(--tita-weight-semibold)',
          color: 'var(--tita-text)',
        }}
      >
        {progressionText(suggestion.summary)}
      </div>

      {/* Historical Evidence Pill */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 10px',
          backgroundColor: 'var(--tita-surface)',
          borderRadius: 'var(--tita-radius-sm)',
          fontSize: 'var(--tita-text-xs)',
          color: 'var(--tita-text-muted)',
          border: '1px solid var(--tita-border)',
        }}
      >
        <ChartIcon aria-hidden="true" style={{ flexShrink: 0 }} />
        <span>
          <strong>Evidência:</strong> {progressionText(suggestion.evidence)}
        </span>
      </div>

      <IntelligenceAction
        key={suggestion.id}
        label="Por que esta sugestão?"
        getSummary={() => progressionSummary(suggestion)}
      />
      {/* Edit Mode Inline Adjuster */}
      {isEditing && (
        <div
          style={{
            marginTop: 'var(--tita-space-2)',
            padding: 'var(--tita-space-2)',
            backgroundColor: 'var(--tita-surface)',
            borderRadius: 'var(--tita-radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <span style={{ fontSize: '11px', color: 'var(--tita-text-muted)', fontWeight: 'bold' }}>
            Ajustar metas sugeridas antes de aplicar:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {editedSets.map((s, idx) => (
              <div
                key={s.setNumber}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'var(--tita-surface-2)',
                  padding: '4px 8px',
                  borderRadius: 'var(--tita-radius-sm)',
                  fontSize: '12px',
                }}
              >
                <span>#{s.setNumber}:</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={s.weight}
                  onChange={(e) => {
                    const newW = Number(e.target.value) || 0;
                    setEditedSets((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, weight: newW } : item)),
                    );
                  }}
                  style={{
                    width: '50px',
                    textAlign: 'center',
                    padding: '2px',
                    border: '1px solid var(--tita-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--tita-surface)',
                    color: 'var(--tita-text)',
                  }}
                  aria-label={`Carga ajustada série ${s.setNumber}`}
                />
                <span>kg ×</span>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={s.reps}
                  onChange={(e) => {
                    const newR = Number(e.target.value) || 0;
                    setEditedSets((prev) =>
                      prev.map((item, i) => (i === idx ? { ...item, reps: newR } : item)),
                    );
                  }}
                  style={{
                    width: '45px',
                    textAlign: 'center',
                    padding: '2px',
                    border: '1px solid var(--tita-border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--tita-surface)',
                    color: 'var(--tita-text)',
                  }}
                  aria-label={`Reps ajustadas série ${s.setNumber}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explicit Actions: Apply / Edit / Ignore */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--tita-space-2)',
          justifyContent: 'flex-end',
          marginTop: 'var(--tita-space-1)',
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onIgnore(suggestion.id)}
          aria-label="Ignorar sugestão de progressão"
          data-testid={`progression-ignore-btn-${suggestion.exerciseId}`}
        >
          Ignorar
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsEditing((prev) => !prev)}
          aria-label={isEditing ? 'Cancelar edição' : 'Editar sugestão'}
          data-testid={`progression-edit-btn-${suggestion.exerciseId}`}
        >
          {isEditing ? 'Cancelar' : 'Editar'}
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handleApply}
          aria-label="Aplicar progressão sugerida"
          data-testid={`progression-apply-btn-${suggestion.exerciseId}`}
        >
          Aplicar
        </Button>
      </div>
    </div>
  );
};
