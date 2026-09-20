import React from 'react';
import { Card, Button } from '../../ui/components/index.js';

export const LegacyView: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
      <Card
        title="Versão Monolítica Legada"
        subtitle="Acesso de compatibilidade à interface original enquanto a migração strangler avança"
      >
        <p
          style={{
            fontSize: 'var(--tita-text-sm)',
            color: 'var(--tita-text-muted)',
            marginBottom: 'var(--tita-space-4)',
          }}
        >
          Todas as funcionalidades existentes continuam operacionais. Seus dados antigos estão
          intactos no localStorage e podem ser sincronizados ou migrados para o novo sistema
          IndexedDB.
        </p>
        <div style={{ display: 'flex', gap: 'var(--tita-space-3)' }}>
          <Button
            variant="primary"
            onClick={() => {
              window.location.href = '/index.html';
            }}
          >
            Abrir Monólito Original
          </Button>
        </div>
      </Card>
    </div>
  );
};
