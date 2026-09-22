import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button } from '../../ui/components/index.js';

export const LegacyView: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
      <Card
        title="Seus dados da versão anterior"
        subtitle="Importe um backup ou migre os dados disponíveis neste dispositivo."
      >
        <p
          style={{
            fontSize: 'var(--tita-text-sm)',
            color: 'var(--tita-text-muted)',
            marginBottom: 'var(--tita-space-4)',
          }}
        >
          Em Configurações, você pode importar sua ficha JSON. Se houver dados da versão anterior
          neste navegador, a opção de migração também estará disponível.
        </p>
        <div style={{ display: 'flex', gap: 'var(--tita-space-3)' }}>
          <Button variant="primary" onClick={() => navigate('/settings')}>
            Abrir Configurações
          </Button>
        </div>
      </Card>
    </div>
  );
};
