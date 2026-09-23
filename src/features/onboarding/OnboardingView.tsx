import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, StatusBanner } from '../../ui/components/index.js';
import { IndexedDBTitaDatabase } from '../../repositories/indexeddb/tita-database.js';
import {
  LegacyMigrationEngine,
  PRIMARY_STORAGE_KEY,
  FALLBACK_STORAGE_KEY,
} from '../../migration/legacy-migration-engine.js';
import { TemplateService } from '../../services/template-service.js';
import { TitaBrandMonogram } from '../../ui/components/icons.js';
import './onboarding.css';

export interface OnboardingViewProps {
  onSkip?: () => void;
  onNavigate?: (path: string) => void;
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onSkip, onNavigate }) => {
  let routerNavigate: ((path: string) => void) | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routerNavigate = useNavigate();
  } catch {
    // Graceful fallback when rendered outside Router context (e.g., SSR or isolated tests)
    routerNavigate = null;
  }

  const navigate = onNavigate ?? routerNavigate ?? (() => {});

  const [hasLegacyData] = useState(() => {
    try {
      const storage =
        typeof window !== 'undefined' && window.localStorage
          ? window.localStorage
          : typeof localStorage !== 'undefined'
            ? localStorage
            : null;
      if (storage) {
        const primary = storage.getItem(PRIMARY_STORAGE_KEY);
        const fallback = storage.getItem(FALLBACK_STORAGE_KEY);
        return Boolean(primary || fallback);
      }
    } catch {
      // Storage access blocked or restricted
    }
    return false;
  });

  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);

  const handleMigrateLegacy = async () => {
    setIsMigrating(true);
    setMigrationStatus(null);
    try {
      const db = new IndexedDBTitaDatabase();
      await db.open();
      const engine = new LegacyMigrationEngine(db);
      const result = await engine.runMigration();
      db.close();

      if (result.success) {
        setMigrationStatus(
          `Migração concluída com sucesso! ${result.counts.workoutSnapshots} treinos, ${result.counts.exercises} exercícios e ${result.counts.measurements} medições importados.`,
        );
        setTimeout(() => navigate('/'), 2000);
      } else {
        setMigrationStatus(`Erro na migração: ${result.error ?? 'Falha desconhecida'}`);
      }
    } catch (err) {
      setMigrationStatus(`Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [sampleStatus, setSampleStatus] = useState<string | null>(null);

  const handleLoadSampleRoutine = async () => {
    setIsLoadingSample(true);
    setSampleStatus(null);
    try {
      const service = new TemplateService();
      const result = await service.cloneTemplateToUserProgram('template-full-body-3x');
      setSampleStatus(
        `Ficha modelo "${result.program.name}" (${result.routines.length} rotinas) adicionada com sucesso! Redirecionando...`,
      );
      setTimeout(() => navigate('/routines'), 1200);
    } catch (err) {
      setSampleStatus(
        `Erro ao carregar modelo: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      navigate('/');
    }
  };

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        padding: 'var(--tita-space-6) var(--tita-space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--tita-space-6)',
      }}
      className="tita-onboarding"
    >
      {/* Header */}
      <div
        style={{
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--tita-space-2)',
        }}
      >
        <div className="tita-onboarding__brand">
          <TitaBrandMonogram size={40} />
          <span>PROJETO TITÃ</span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--tita-font-display)',
            fontSize: 'clamp(2.5rem, 9vw, 3.5rem)',
            lineHeight: 1.05,
            fontWeight: 'var(--tita-weight-bold)',
            letterSpacing: '-0.02em',
          }}
        >
          Seu treino.
          <br />
          Cada série conta.
        </h1>
        <p
          style={{
            fontSize: 'var(--tita-text-base)',
            color: 'var(--tita-text-muted)',
            maxWidth: '440px',
            marginTop: '12px',
          }}
        >
          Registre cargas, acompanhe sua evolução e treine offline. Sem precisar de conta.
        </p>
      </div>

      {migrationStatus && (
        <StatusBanner
          type={migrationStatus.includes('Erro') ? 'error' : 'success'}
          message={migrationStatus}
          onDismiss={() => setMigrationStatus(null)}
        />
      )}

      {sampleStatus && (
        <StatusBanner
          type={sampleStatus.includes('Erro') ? 'error' : 'success'}
          message={sampleStatus}
          onDismiss={() => setSampleStatus(null)}
        />
      )}

      {/* Featured Starter: Sample Routine (Full Body 3x) */}
      <section className="tita-onboarding__starter" aria-labelledby="starter-title">
        <div className="tita-onboarding__eyebrow">UM PONTO DE PARTIDA</div>
        <h2 id="starter-title">
          Corpo inteiro <span>3× / semana</span>
        </h2>
        <p>Agachamento, supino e remada. Uma ficha pronta para usar e adaptar ao seu ritmo.</p>
        <Button
          variant="primary"
          size="lg"
          isLoading={isLoadingSample}
          onClick={handleLoadSampleRoutine}
          data-testid="onboarding-load-sample-btn"
        >
          Começar com corpo inteiro 3x
        </Button>
        <small>Você pode editar todos os exercícios depois.</small>
      </section>

      {/* Legacy Data Detected Alert (REQ-2) */}
      {hasLegacyData && !migrationStatus && (
        <Card
          title="Dados da versão anterior encontrados"
          subtitle="Encontramos treinos e medições da versão anterior gravados neste navegador."
          style={{ border: '1px solid var(--tita-primary)' }}
          action={
            <Button
              variant="primary"
              size="sm"
              isLoading={isMigrating}
              onClick={handleMigrateLegacy}
            >
              Migrar Dados Legados Agora
            </Button>
          }
        >
          <p style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text-muted)' }}>
            Nenhum dado é apagado durante a migração. Um snapshot de segurança é criado
            automaticamente antes de qualquer alteração.
          </p>
        </Card>
      )}

      {/* Onboarding Options Grid */}
      <div
        className="tita-onboarding__options"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 'var(--tita-space-2)',
        }}
      >
        <Card
          title="Criar do Zero"
          subtitle="Monte sua própria ficha."
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate('/routines')}>
              Começar
            </Button>
          }
        />

        <Card
          title="Explorar Modelos"
          subtitle="Corpo inteiro, superior/inferior ou PPL."
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate('/routines')}>
              Ver Modelos
            </Button>
          }
        />

        <Card
          title="Me Ajude a Escolher"
          subtitle="Encontre uma divisão para sua semana."
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate('/routines')}>
              Descobrir
            </Button>
          }
        />

        <Card
          title="Importar Dados"
          subtitle="Traga seu backup do Titã."
          action={
            <Button size="sm" variant="secondary" onClick={() => navigate('/settings')}>
              Importar
            </Button>
          }
        />
      </div>

      {/* Local-Only Architecture & Privacy Notice */}
      <div
        style={{
          padding: 'var(--tita-space-4)',
          borderRadius: 'var(--tita-radius-sm)',
          border: '1px solid var(--tita-border-subtle)',
          backgroundColor: 'var(--tita-surface-2)',
          fontSize: 'var(--tita-text-xs)',
          color: 'var(--tita-text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--tita-space-2)',
        }}
        data-testid="onboarding-privacy-disclosure"
      >
        <div style={{ fontWeight: 'var(--tita-weight-bold)', color: 'var(--tita-text)' }}>
          Seus treinos ficam com você.
        </div>
        <div>
          <strong>Local-first:</strong> dados no seu aparelho, disponíveis offline e exportáveis.
        </div>
        <div>Sem rastreadores, anúncios ou cadastro obrigatório.</div>
        <div>
          Nuvem e IA são opcionais e ficam desativadas por padrão. IA usa sua própria chave.
        </div>
      </div>

      {/* Skip Button - Always Visible per REQ-2 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--tita-space-4)' }}>
        <Button variant="ghost" onClick={handleSkip}>
          Pular por enquanto →
        </Button>
      </div>
    </div>
  );
};
