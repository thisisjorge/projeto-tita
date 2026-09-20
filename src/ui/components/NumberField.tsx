import React from 'react';
import { Field, type FieldProps } from './Field.js';

export interface NumberFieldProps extends Omit<FieldProps, 'onChange' | 'value'> {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  allowEmpty?: boolean;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  value,
  onChange,
  step = 1,
  min = 0,
  max,
  unit,
  allowEmpty = true,
  ...fieldProps
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw === '') {
      if (allowEmpty) {
        onChange(undefined);
      } else {
        onChange(min);
      }
      return;
    }

    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleStep = (direction: 'up' | 'down') => {
    const current = value ?? 0;
    const delta = direction === 'up' ? step : -step;
    let next = Math.round((current + delta) * 100) / 100;
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    onChange(next);
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--tita-space-1)', width: '100%' }}
    >
      <div style={{ flex: 1 }}>
        <Field
          type="number"
          step={step}
          min={min}
          max={max}
          inputMode="decimal"
          value={value !== undefined ? value : ''}
          onChange={handleChange}
          {...fieldProps}
        />
      </div>

      <button
        type="button"
        aria-label="Diminuir"
        title={`Diminuir ${fieldProps.label}`}
        onClick={() => handleStep('down')}
        style={{
          width: 'var(--tita-touch-min)',
          height: 'var(--tita-touch-min)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--tita-surface-2)',
          color: 'var(--tita-text)',
          border: '1px solid var(--tita-border)',
          borderRadius: 'var(--tita-radius-sm)',
          cursor: 'pointer',
          fontWeight: 'bold',
          userSelect: 'none',
        }}
      >
        −
      </button>

      <button
        type="button"
        aria-label="Aumentar"
        title={`Aumentar ${fieldProps.label}`}
        onClick={() => handleStep('up')}
        style={{
          width: 'var(--tita-touch-min)',
          height: 'var(--tita-touch-min)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--tita-surface-2)',
          color: 'var(--tita-text)',
          border: '1px solid var(--tita-border)',
          borderRadius: 'var(--tita-radius-sm)',
          cursor: 'pointer',
          fontWeight: 'bold',
          userSelect: 'none',
        }}
      >
        +
      </button>

      {unit && (
        <span
          style={{
            fontSize: 'var(--tita-text-xs)',
            color: 'var(--tita-text-muted)',
            paddingBottom: 'var(--tita-space-2)',
          }}
        >
          {unit}
        </span>
      )}
    </div>
  );
};
