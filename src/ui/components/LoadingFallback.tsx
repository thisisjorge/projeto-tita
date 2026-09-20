import React from 'react';

export interface LoadingFallbackProps {
  readonly message?: string;
}

export const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = 'Carregando módulo...',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="loading-fallback"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '240px',
        padding: 'var(--tita-space-8)',
        gap: 'var(--tita-space-4)',
        color: 'var(--tita-text-muted)',
        fontFamily: 'var(--tita-font-sans)',
      }}
    >
      <div
        className="tita-spinner"
        style={{
          width: '36px',
          height: '36px',
          border: '3px solid var(--tita-border)',
          borderTopColor: 'var(--tita-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span style={{ fontSize: 'var(--tita-text-sm)', fontWeight: 'var(--tita-weight-medium)' }}>
        {message}
      </span>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
