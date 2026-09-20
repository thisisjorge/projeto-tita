import React from 'react';
import { Button } from './Button.js';

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  action,
  className = '',
}) => {
  const finalLabel = action?.label ?? actionLabel;
  const finalAction = action?.onClick ?? onAction;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'var(--tita-space-8) var(--tita-space-4)',
        gap: 'var(--tita-space-3)',
        borderRadius: 'var(--tita-radius-md)',
        border: '1px dashed var(--tita-border)',
        backgroundColor: 'var(--tita-surface)',
        width: '100%',
      }}
      className={`tita-empty-state ${className}`.trim()}
      data-testid="empty-state"
    >
      {icon && (
        <div
          style={{
            fontSize: '40px',
            color: 'var(--tita-text-muted)',
            marginBottom: 'var(--tita-space-2)',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: 'var(--tita-text-lg)',
          fontWeight: 'var(--tita-weight-semibold)',
          color: 'var(--tita-text)',
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: 'var(--tita-text-sm)',
          color: 'var(--tita-text-muted)',
          maxWidth: '380px',
          lineHeight: 'var(--tita-line-relaxed)',
        }}
      >
        {description}
      </p>
      {finalLabel && finalAction && (
        <div style={{ marginTop: 'var(--tita-space-2)' }}>
          <Button variant="primary" onClick={finalAction}>
            {finalLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
