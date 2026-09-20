import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading,
  isLoading,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  style,
  type = 'button',
  ...props
}) => {
  const isBusy = Boolean(loading || isLoading);

  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'secondary':
        return {
          backgroundColor: 'var(--tita-surface-2)',
          color: 'var(--tita-text)',
          border: '1px solid var(--tita-border)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--tita-text-muted)',
          border: '1px solid transparent',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--tita-error-bg)',
          color: 'var(--tita-error)',
          border: '1px solid var(--tita-error)',
        };
      case 'primary':
      default:
        return {
          backgroundColor: 'var(--tita-primary)',
          color: 'var(--tita-primary-contrast)',
          border: '1px solid transparent',
        };
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          minHeight: 'var(--tita-touch-min)',
          padding: '0 var(--tita-space-3)',
          fontSize: 'var(--tita-text-sm)',
        };
      case 'lg':
        return {
          minHeight: '52px',
          padding: '0 var(--tita-space-6)',
          fontSize: 'var(--tita-text-lg)',
        };
      case 'md':
      default:
        return {
          minHeight: 'var(--tita-touch-min)',
          padding: '0 var(--tita-space-4)',
          fontSize: 'var(--tita-text-base)',
        };
    }
  };

  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--tita-space-2)',
    borderRadius: 'var(--tita-radius-sm)',
    fontWeight: 'var(--tita-weight-semibold)',
    cursor: disabled || isBusy ? 'not-allowed' : 'pointer',
    opacity: disabled || isBusy ? 0.5 : 1,
    transition:
      'background-color var(--tita-transition-fast), border-color var(--tita-transition-fast)',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  const fullClassName =
    `tita-button tita-button--${variant} tita-button--${size} ${className}`.trim();

  return (
    <button
      type={type}
      disabled={disabled || isBusy}
      aria-busy={isBusy ? 'true' : undefined}
      style={baseStyles}
      className={fullClassName}
      {...props}
    >
      {isBusy ? (
        <span
          aria-hidden="true"
          style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}
        >
          ⏳
        </span>
      ) : (
        leftIcon
      )}
      <span className="tita-button__content">{children}</span>
      {!isBusy && rightIcon}
    </button>
  );
};
