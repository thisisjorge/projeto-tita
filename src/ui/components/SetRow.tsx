import React, { useState } from 'react';
import { SetType } from '../../domain/enums/set-type.js';

export interface SetRowProps {
  setNumber: number;
  type?: SetType;
  weight: number | undefined;
  reps: number | undefined;
  rir?: number;
  rpe?: number;
  tempo?: string;
  notes?: string;
  durationSeconds?: number;
  distanceMeters?: number;
  completed?: boolean;
  isCompleted?: boolean;
  onWeightChange?: (weight: number | undefined) => void;
  onRepsChange?: (reps: number | undefined) => void;
  onRirChange?: (rir: number | undefined) => void;
  onRpeChange?: (rpe: number | undefined) => void;
  onTempoChange?: (tempo: string | undefined) => void;
  onNotesChange?: (notes: string | undefined) => void;
  onDurationChange?: (duration: number | undefined) => void;
  onDistanceChange?: (distance: number | undefined) => void;
  onTypeChange?: (type: SetType) => void;
  onToggleComplete?: () => void;
  previousPerformance?: string;
  targetPerformance?: string;
  weightStep?: number;
  disabled?: boolean;
  onRemove?: () => void;
  // Progressive disclosure controls
  showAdvanced?: boolean;
  showSetType?: boolean;
  showRpe?: boolean;
  showRir?: boolean;
  showTempo?: boolean;
  showNotes?: boolean;
  showDuration?: boolean;
  showDistance?: boolean;
}

const SET_TYPE_LABELS: Record<SetType, { label: string; badge: string; color: string }> = {
  [SetType.NORMAL]: { label: 'Normal', badge: 'N', color: 'var(--tita-text-muted)' },
  [SetType.WARMUP]: { label: 'Aquecimento', badge: 'W', color: 'var(--tita-warning)' },
  [SetType.TOP_SET]: { label: 'Top Set', badge: 'T', color: 'var(--tita-text-secondary)' },
  [SetType.BACKOFF]: { label: 'Backoff', badge: 'B', color: 'var(--tita-info)' },
  [SetType.DROP_SET]: { label: 'Drop Set', badge: 'D', color: 'var(--tita-warning)' },
  [SetType.FAILURE]: { label: 'Até a Falha', badge: 'F', color: 'var(--tita-error)' },
  [SetType.REST_PAUSE]: { label: 'Rest Pause', badge: 'RP', color: 'var(--tita-info)' },
  [SetType.MYO_REP]: { label: 'Myo Rep', badge: 'M', color: 'var(--tita-text-secondary)' },
  [SetType.AMRAP]: { label: 'AMRAP', badge: 'A', color: 'var(--tita-accent)' },
  [SetType.CLUSTER]: { label: 'Cluster', badge: 'C', color: 'var(--tita-text-secondary)' },
  [SetType.PAUSED]: { label: 'Pausada', badge: 'P', color: 'var(--tita-text-muted)' },
  [SetType.TEMPO]: { label: 'Tempo', badge: 'TP', color: 'var(--tita-info)' },
  [SetType.ISOMETRIC]: { label: 'Isométrica', badge: 'ISO', color: 'var(--tita-accent)' },
};

export const SetRow: React.FC<SetRowProps> = ({
  setNumber,
  type = SetType.NORMAL,
  weight,
  reps,
  rir,
  rpe,
  tempo,
  notes,
  durationSeconds,
  distanceMeters,
  completed,
  isCompleted,
  onWeightChange = () => {},
  onRepsChange = () => {},
  onRirChange = () => {},
  onRpeChange = () => {},
  onTempoChange = () => {},
  onNotesChange = () => {},
  onDurationChange = () => {},
  onDistanceChange = () => {},
  onTypeChange = () => {},
  onToggleComplete = () => {},
  previousPerformance,
  targetPerformance,
  weightStep = 2.5,
  disabled = false,
  onRemove,
  showAdvanced = false,
  showSetType = false,
  showRpe = false,
  showRir = false,
  showTempo = false,
  showNotes = false,
  showDuration = false,
  showDistance = false,
}) => {
  const isDone = Boolean(completed ?? isCompleted);
  const [isExpanded, setIsExpanded] = useState(false);

  const hasAdvancedFieldsEnabled =
    showAdvanced && (showRpe || showRir || showTempo || showNotes || showDuration || showDistance);

  const currentTypeInfo = SET_TYPE_LABELS[type] ?? SET_TYPE_LABELS[SetType.NORMAL];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: 'var(--tita-space-2) var(--tita-space-3)',
        backgroundColor: isDone ? 'rgba(16, 185, 129, 0.06)' : 'var(--tita-surface)',
        borderRadius: 'var(--tita-radius-sm)',
        border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.25)' : 'var(--tita-border)'}`,
        borderLeft: isDone ? '3px solid var(--tita-accent)' : '3px solid transparent',
        transition: 'all 0.15s ease',
      }}
      className={`tita-set-row ${isDone ? 'tita-set-row--completed' : ''}`.trim()}
      data-testid={`set-row-${setNumber}`}
    >
      {/* Set Header with target & previous info */}
      <div
        className="tita-set-row__heading"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--tita-text-muted)',
          marginBottom: '2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            className="tita-num"
            style={{
              fontWeight: 'var(--tita-weight-bold)',
              color: isDone ? 'var(--tita-accent)' : 'var(--tita-text-secondary)',
            }}
          >
            SÉRIE {setNumber}
          </span>
          {showSetType ? (
            <select
              value={type}
              onChange={(e) => onTypeChange(e.target.value as SetType)}
              disabled={disabled}
              title={currentTypeInfo.label}
              aria-label={`Tipo da série ${setNumber}`}
              data-testid={`set-type-select-${setNumber}`}
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                padding: '1px 4px',
                backgroundColor: 'var(--tita-surface-2)',
                color: currentTypeInfo.color,
                border: `1px solid ${currentTypeInfo.color}`,
                borderRadius: 'var(--tita-radius-xs)',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              {Object.entries(SET_TYPE_LABELS).map(([t, info]) => (
                <option key={t} value={t}>
                  {info.badge} — {info.label}
                </option>
              ))}
            </select>
          ) : type !== SetType.NORMAL ? (
            <span style={{ color: currentTypeInfo.color, fontWeight: 'bold' }}>
              • {currentTypeInfo.label}
            </span>
          ) : null}
        </div>

        <div
          className="tita-set-row__references"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {previousPerformance && (
            <span
              className="tita-set-row__previous"
              style={{
                fontSize: '11px',
                color: 'var(--tita-text-subtle)',
                fontFamily: 'var(--tita-font-sans)',
              }}
              title={`Anterior: ${previousPerformance}`}
            >
              Anterior:{' '}
              <strong
                style={{
                  color: 'var(--tita-text-secondary)',
                  fontFamily: 'var(--tita-font-display)',
                }}
              >
                {previousPerformance}
              </strong>
            </span>
          )}
          {targetPerformance && (
            <span
              style={{
                fontSize: '11px',
                color: 'var(--tita-primary)',
                fontFamily: 'var(--tita-font-sans)',
              }}
            >
              Meta:{' '}
              <strong style={{ fontFamily: 'var(--tita-font-display)' }}>
                {targetPerformance}
              </strong>
            </span>
          )}
        </div>
        {onRemove && (
          <details
            className="tita-set-row__menu"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget))
                event.currentTarget.open = false;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.currentTarget.open = false;
                event.currentTarget.querySelector('summary')?.focus();
                event.stopPropagation();
              }
            }}
          >
            <summary aria-label={`Opções da série ${setNumber}`}>⋯</summary>
            <button
              type="button"
              onClick={onRemove}
              disabled={disabled}
              aria-label={`Remover série ${setNumber}`}
            >
              Excluir série {setNumber}
            </button>
          </details>
        )}
      </div>

      {/* Primary Row: Weight Stepper, Reps Stepper, Complete Button */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 48px',
          alignItems: 'center',
          gap: 'var(--tita-space-2)',
          minHeight: '44px',
        }}
      >
        {/* Weight Stepper Control */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--tita-surface-2)',
            border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : 'var(--tita-border-strong)'}`,
            borderRadius: 'var(--tita-radius-sm)',
            overflow: 'hidden',
            height: '44px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              const current = weight !== undefined ? weight : 0;
              const next = Math.max(0, Math.round((current - weightStep) * 10) / 10);
              onWeightChange(next);
            }}
            disabled={disabled}
            aria-label="Diminuir carga"
            data-testid={`stepper-weight-minus-${setNumber}`}
            style={{
              width: '36px',
              minWidth: '36px',
              height: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--tita-text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              userSelect: 'none',
              padding: 0,
            }}
          >
            −
          </button>
          <input
            type="number"
            step={weightStep}
            min="0"
            inputMode="decimal"
            placeholder={
              previousPerformance ? `${previousPerformance.split('x')[0] ?? ''}` : '0 kg'
            }
            value={weight !== undefined ? weight : ''}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value.trim();
              onWeightChange(val === '' ? undefined : Number(val));
            }}
            aria-label={`Carga série ${setNumber}`}
            className="tita-num"
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              textAlign: 'center',
              backgroundColor: 'transparent',
              color: 'var(--tita-text)',
              border: 'none',
              fontSize: 'var(--tita-text-base)',
              fontWeight: 'var(--tita-weight-bold)',
              fontFamily: 'var(--tita-font-display)',
              fontVariantNumeric: 'tabular-nums',
              padding: '0 2px',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => {
              const current = weight !== undefined ? weight : 0;
              const next = Math.round((current + weightStep) * 10) / 10;
              onWeightChange(next);
            }}
            disabled={disabled}
            aria-label="Aumentar carga"
            data-testid={`stepper-weight-plus-${setNumber}`}
            style={{
              width: '36px',
              minWidth: '36px',
              height: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--tita-text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              userSelect: 'none',
              padding: 0,
            }}
          >
            +
          </button>
        </div>

        {/* Reps Stepper Control */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: isDone ? 'rgba(16, 185, 129, 0.08)' : 'var(--tita-surface-2)',
            border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : 'var(--tita-border-strong)'}`,
            borderRadius: 'var(--tita-radius-sm)',
            overflow: 'hidden',
            height: '44px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              const current = reps !== undefined ? reps : 0;
              const next = Math.max(0, current - 1);
              onRepsChange(next);
            }}
            disabled={disabled}
            aria-label="Diminuir repetições"
            data-testid={`stepper-reps-minus-${setNumber}`}
            style={{
              width: '32px',
              minWidth: '32px',
              height: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--tita-text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              userSelect: 'none',
              padding: 0,
            }}
          >
            −
          </button>
          <input
            type="number"
            step="1"
            min="0"
            inputMode="numeric"
            placeholder={
              previousPerformance ? `${previousPerformance.split('x')[1] ?? ''}` : 'Reps'
            }
            value={reps !== undefined ? reps : ''}
            disabled={disabled}
            onChange={(e) => {
              const val = e.target.value.trim();
              onRepsChange(val === '' ? undefined : Number(val));
            }}
            aria-label={`Repetições série ${setNumber}`}
            className="tita-num"
            style={{
              flex: 1,
              minWidth: 0,
              height: '100%',
              textAlign: 'center',
              backgroundColor: 'transparent',
              color: 'var(--tita-text)',
              border: 'none',
              fontSize: 'var(--tita-text-base)',
              fontWeight: 'var(--tita-weight-bold)',
              fontFamily: 'var(--tita-font-display)',
              fontVariantNumeric: 'tabular-nums',
              padding: '0 2px',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={() => {
              const current = reps !== undefined ? reps : 0;
              const next = current + 1;
              onRepsChange(next);
            }}
            disabled={disabled}
            aria-label="Aumentar repetições"
            data-testid={`stepper-reps-plus-${setNumber}`}
            style={{
              width: '32px',
              minWidth: '32px',
              height: '100%',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--tita-text-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              userSelect: 'none',
              padding: 0,
            }}
          >
            +
          </button>
        </div>

        {/* Complete Checkbox Button (48x48px touch target) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button
            type="button"
            role="checkbox"
            aria-checked={isDone}
            data-testid={`complete-set-btn-${setNumber}`}
            disabled={disabled}
            onClick={onToggleComplete}
            aria-label={
              isDone ? `Desmarcar série ${setNumber}` : `Marcar série ${setNumber} como concluída`
            }
            style={{
              width: '48px',
              height: '44px',
              minWidth: '48px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDone ? 'var(--tita-accent)' : 'var(--tita-surface-2)',
              color: isDone ? 'var(--tita-primary-contrast)' : 'var(--tita-text-muted)',
              border: `1.5px solid ${isDone ? 'var(--tita-accent)' : 'var(--tita-border-strong)'}`,
              borderRadius: 'var(--tita-radius-sm)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isDone ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
            }}
          >
            {isDone ? (
              <span style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>
            ) : (
              <span style={{ fontSize: '14px', color: 'var(--tita-text-subtle)', lineHeight: 1 }}>
                ✓
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Advanced Details Expander / Sub-Row */}
      {hasAdvancedFieldsEnabled && (
        <div style={{ marginTop: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              aria-expanded={isExpanded}
              aria-label={`Campos avançados da série ${setNumber}`}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--tita-accent)',
                fontSize: '11px',
                cursor: 'pointer',
                padding: '4px 8px',
                minHeight: '36px',
                borderRadius: 'var(--tita-radius-sm)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span>{isExpanded ? '▼ Menos detalhes' : '▶ Detalhes avançados (RPE, RIR...)'}</span>
              {(rpe !== undefined || rir !== undefined || tempo || notes) && (
                <span
                  style={{
                    backgroundColor: 'var(--tita-surface-2)',
                    padding: '1px 4px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    color: 'var(--tita-text-muted)',
                  }}
                >
                  {rpe !== undefined ? `RPE ${rpe}` : ''}
                  {rir !== undefined ? ` ${rir} RIR` : ''}
                  {tempo ? ` ${tempo}` : ''}
                </span>
              )}
            </button>
          </div>

          {isExpanded && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 'var(--tita-space-2)',
                padding: 'var(--tita-space-2)',
                marginTop: '4px',
                backgroundColor: 'var(--tita-surface)',
                borderRadius: 'var(--tita-radius-sm)',
                border: '1px dashed var(--tita-border)',
                fontSize: '12px',
              }}
              data-testid={`advanced-fields-container-${setNumber}`}
            >
              {showRpe && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label
                    htmlFor={`rpe-${setNumber}`}
                    style={{ color: 'var(--tita-text-muted)', fontSize: '10px' }}
                  >
                    RPE (1-10)
                  </label>
                  <input
                    id={`rpe-${setNumber}`}
                    type="number"
                    step="0.5"
                    min="1"
                    max="10"
                    placeholder="8.0"
                    value={rpe !== undefined ? rpe : ''}
                    disabled={disabled}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      onRpeChange(val === '' ? undefined : Number(val));
                    }}
                    style={{
                      width: '60px',
                      padding: '4px',
                      textAlign: 'center',
                      borderRadius: 'var(--tita-radius-sm)',
                      border: '1px solid var(--tita-border)',
                      backgroundColor: 'var(--tita-surface-2)',
                      color: 'var(--tita-text)',
                    }}
                  />
                </div>
              )}

              {showRir && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label
                    htmlFor={`rir-${setNumber}`}
                    style={{ color: 'var(--tita-text-muted)', fontSize: '10px' }}
                  >
                    RIR (0-10)
                  </label>
                  <input
                    id={`rir-${setNumber}`}
                    type="number"
                    step="1"
                    min="0"
                    max="10"
                    placeholder="2"
                    value={rir !== undefined ? rir : ''}
                    disabled={disabled}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      onRirChange(val === '' ? undefined : Number(val));
                    }}
                    style={{
                      width: '60px',
                      padding: '4px',
                      textAlign: 'center',
                      borderRadius: 'var(--tita-radius-sm)',
                      border: '1px solid var(--tita-border)',
                      backgroundColor: 'var(--tita-surface-2)',
                      color: 'var(--tita-text)',
                    }}
                  />
                </div>
              )}

              {showTempo && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label
                    htmlFor={`tempo-${setNumber}`}
                    style={{ color: 'var(--tita-text-muted)', fontSize: '10px' }}
                  >
                    Tempo (ex: 3-1-1-0)
                  </label>
                  <input
                    id={`tempo-${setNumber}`}
                    type="text"
                    placeholder="3-1-1-0"
                    value={tempo ?? ''}
                    disabled={disabled}
                    onChange={(e) => onTempoChange(e.target.value.trim() || undefined)}
                    style={{
                      width: '80px',
                      padding: '4px',
                      textAlign: 'center',
                      borderRadius: 'var(--tita-radius-sm)',
                      border: '1px solid var(--tita-border)',
                      backgroundColor: 'var(--tita-surface-2)',
                      color: 'var(--tita-text)',
                    }}
                  />
                </div>
              )}

              {showDuration && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label
                    htmlFor={`dur-${setNumber}`}
                    style={{ color: 'var(--tita-text-muted)', fontSize: '10px' }}
                  >
                    Duração (s)
                  </label>
                  <input
                    id={`dur-${setNumber}`}
                    type="number"
                    min="0"
                    placeholder="45"
                    value={durationSeconds !== undefined ? durationSeconds : ''}
                    disabled={disabled}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      onDurationChange(val === '' ? undefined : Number(val));
                    }}
                    style={{
                      width: '65px',
                      padding: '4px',
                      textAlign: 'center',
                      borderRadius: 'var(--tita-radius-sm)',
                      border: '1px solid var(--tita-border)',
                      backgroundColor: 'var(--tita-surface-2)',
                      color: 'var(--tita-text)',
                    }}
                  />
                </div>
              )}

              {showDistance && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <label
                    htmlFor={`dist-${setNumber}`}
                    style={{ color: 'var(--tita-text-muted)', fontSize: '10px' }}
                  >
                    Distância (m)
                  </label>
                  <input
                    id={`dist-${setNumber}`}
                    type="number"
                    min="0"
                    placeholder="50"
                    value={distanceMeters !== undefined ? distanceMeters : ''}
                    disabled={disabled}
                    onChange={(e) => {
                      const val = e.target.value.trim();
                      onDistanceChange(val === '' ? undefined : Number(val));
                    }}
                    style={{
                      width: '65px',
                      padding: '4px',
                      textAlign: 'center',
                      borderRadius: 'var(--tita-radius-sm)',
                      border: '1px solid var(--tita-border)',
                      backgroundColor: 'var(--tita-surface-2)',
                      color: 'var(--tita-text)',
                    }}
                  />
                </div>
              )}

              {showNotes && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    flex: '1 1 100%',
                  }}
                >
                  <label
                    htmlFor={`notes-${setNumber}`}
                    style={{ color: 'var(--tita-text-muted)', fontSize: '10px' }}
                  >
                    Notas da série
                  </label>
                  <input
                    id={`notes-${setNumber}`}
                    type="text"
                    placeholder="ex: pausa no peito, pegada fechada..."
                    value={notes ?? ''}
                    disabled={disabled}
                    onChange={(e) => onNotesChange(e.target.value || undefined)}
                    style={{
                      width: '100%',
                      padding: '4px 8px',
                      borderRadius: 'var(--tita-radius-sm)',
                      border: '1px solid var(--tita-border)',
                      backgroundColor: 'var(--tita-surface-2)',
                      color: 'var(--tita-text)',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
