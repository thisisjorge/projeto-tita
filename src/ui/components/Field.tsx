import React, { useId } from 'react';

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  errorMessage?: string;
  error?: string;
  hideLabel?: boolean;
}

export const Field: React.FC<FieldProps> = ({
  label,
  helperText,
  errorMessage,
  error,
  hideLabel = false,
  id,
  disabled,
  className = '',
  style,
  children,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id ?? `field-${generatedId.replace(/:/g, '')}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const activeError = error ?? errorMessage;
  const hasError = Boolean(activeError);

  const displayLabel = label || (props['aria-label'] as string) || props.placeholder || 'Campo';

  const inputClassNames = [
    'tita-input',
    'tita-field__input',
    hasError ? 'tita-field__input--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--tita-space-1)',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
      className="tita-field"
    >
      <label
        htmlFor={inputId}
        className={hideLabel ? 'sr-only' : undefined}
        style={
          hideLabel
            ? undefined
            : {
                fontSize: 'var(--tita-text-sm)',
                fontWeight: 'var(--tita-weight-medium)',
                color: hasError ? 'var(--tita-error)' : 'var(--tita-text-muted)',
              }
        }
      >
        {displayLabel}
      </label>

      <input
        id={inputId}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : undefined}
        aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
        style={{
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          minHeight: 'var(--tita-touch-min)',
          padding: '0 var(--tita-space-3)',
          backgroundColor: 'var(--tita-surface-2)',
          color: 'var(--tita-text)',
          border: `1px solid ${hasError ? 'var(--tita-error)' : 'var(--tita-border)'}`,
          borderRadius: 'var(--tita-radius-sm)',
          fontSize: 'var(--tita-text-base)',
          transition: 'border-color var(--tita-transition-fast)',
          opacity: disabled ? 0.5 : 1,
          ...style,
        }}
        className={inputClassNames}
        {...props}
      />

      {hasError && (
        <span
          id={errorId}
          role="alert"
          style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-error)' }}
        >
          {activeError}
        </span>
      )}

      {!hasError && helperText && (
        <span
          id={helperId}
          style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-subtle)' }}
        >
          {helperText}
        </span>
      )}
    </div>
  );
};
