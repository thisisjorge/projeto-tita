import React from 'react';

export interface StatusBannerProps {
  type?: 'info' | 'warning' | 'error' | 'success';
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message?: string;
  children?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
  onDismiss?: () => void;
  className?: string;
  testId?: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  type,
  variant,
  title,
  message,
  children,
  action,
  onDismiss,
  className = '',
  testId,
}) => {
  const activeVariant = variant ?? type ?? 'info';

  const getBannerColors = () => {
    switch (activeVariant) {
      case 'warning':
        return {
          bg: 'var(--tita-warning-bg)',
          border: 'var(--tita-warning)',
          text: 'var(--tita-warning)',
        };
      case 'error':
        return {
          bg: 'var(--tita-error-bg)',
          border: 'var(--tita-error)',
          text: 'var(--tita-error)',
        };
      case 'success':
        return {
          bg: 'var(--tita-success-bg)',
          border: 'var(--tita-success)',
          text: 'var(--tita-success)',
        };
      case 'info':
      default:
        return {
          bg: 'var(--tita-info-bg)',
          border: 'var(--tita-info)',
          text: 'var(--tita-info)',
        };
    }
  };

  const colors = getBannerColors();
  const role = activeVariant === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--tita-space-3)',
        padding: 'var(--tita-space-3) var(--tita-space-4)',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 'var(--tita-radius-sm)',
        width: '100%',
      }}
      className={`tita-status-banner tita-status-banner--${activeVariant} ${className}`.trim()}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {title && (
          <span
            style={{
              fontWeight: 'var(--tita-weight-semibold)',
              fontSize: 'var(--tita-text-sm)',
              color: colors.text,
            }}
          >
            {title}
          </span>
        )}
        <span style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text)' }}>
          {message ?? children}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tita-space-2)' }}>
        {action && (
          <button
            type="button"
            data-testid={action.testId}
            onClick={action.onClick}
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              color: colors.text,
              borderRadius: 'var(--tita-radius-sm)',
              padding: '4px 12px',
              fontSize: 'var(--tita-text-xs)',
              fontWeight: 'var(--tita-weight-semibold)',
              cursor: 'pointer',
              minHeight: 'var(--tita-touch-min)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {action.label}
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dispensar aviso"
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--tita-text-muted)',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '18px',
              minWidth: 'var(--tita-touch-min)',
              minHeight: 'var(--tita-touch-min)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--tita-radius-sm)',
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};
