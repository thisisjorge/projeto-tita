import React from 'react';

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  actions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  actions,
  children,
  className = '',
  style,
  ...props
}) => {
  const activeAction = actions ?? action;

  return (
    <div
      style={{
        backgroundColor: 'var(--tita-surface)',
        border: '1px solid var(--tita-border)',
        borderRadius: 'var(--tita-radius-md)',
        padding: 'var(--tita-space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--tita-space-3)',
        ...style,
      }}
      className={`tita-card ${className}`.trim()}
      {...props}
    >
      {(title || activeAction) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--tita-space-2)',
          }}
        >
          <div>
            {typeof title === 'string' ? (
              <h3
                style={{
                  fontSize: 'var(--tita-text-lg)',
                  fontWeight: 'var(--tita-weight-semibold)',
                  color: 'var(--tita-text)',
                }}
              >
                {title}
              </h3>
            ) : (
              title
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: 'var(--tita-text-sm)',
                  color: 'var(--tita-text-muted)',
                  marginTop: 'var(--tita-space-1)',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {activeAction && <div>{activeAction}</div>}
        </div>
      )}

      <div>{children}</div>
    </div>
  );
};
