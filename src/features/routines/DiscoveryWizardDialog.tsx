import React, { useState, useMemo } from 'react';
import {
  ProgramDiscoveryEngine,
  type DiscoveryPreferences,
  type DiscoveryRecommendation,
} from '../../domain/discovery/program-discovery-engine.js';
import { TemplateService } from '../../services/template-service.js';
import { Dialog, Button, Card } from '../../ui/components/index.js';

interface DiscoveryWizardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateService: TemplateService;
  onProgramSelected: () => void;
}

export const DiscoveryWizardDialog: React.FC<DiscoveryWizardDialogProps> = ({
  isOpen,
  onClose,
  templateService,
  onProgramSelected,
}) => {
  const engine = useMemo(() => new ProgramDiscoveryEngine(), []);

  const [step, setStep] = useState<number>(1);
  const [daysPerWeek, setDaysPerWeek] = useState<number>(3);
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [experience, setExperience] = useState<'beginner' | 'intermediate' | 'advanced'>(
    'beginner',
  );
  const [goal, setGoal] = useState<'hypertrophy' | 'strength' | 'general_fitness'>('hypertrophy');
  const [equipment, setEquipment] = useState<'full_gym' | 'barbell_and_rack' | 'dumbbells'>(
    'full_gym',
  );
  const [preferredSplit, setPreferredSplit] = useState<'any' | 'full_body' | 'upper_lower' | 'ppl'>(
    'any',
  );

  const [recommendations, setRecommendations] = useState<readonly DiscoveryRecommendation[]>([]);
  const [isCloning, setIsCloning] = useState(false);

  const handleRunDiscovery = () => {
    const prefs: DiscoveryPreferences = {
      daysPerWeek,
      sessionDurationMinutes: durationMinutes,
      experienceLevel: experience,
      goal,
      equipment,
      preferredSplit,
    };

    const report = engine.discover(prefs);
    setRecommendations(report.recommendations);
    setStep(7); // Results step
  };

  const handleCloneRecommendation = async (templateId: string) => {
    setIsCloning(true);
    try {
      await templateService.cloneTemplateToUserProgram(templateId);
      onProgramSelected();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao clonar programa recomendado.');
    } finally {
      setIsCloning(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setRecommendations([]);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={step === 7 ? 'Seu Plano de Treino Ideal' : `Assistente de Descoberta (${step}/6)`}
      footer={
        step === 7 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <Button variant="secondary" onClick={handleReset}>
              ← Refazer Escolhas
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Fechar
            </Button>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            {step > 1 ? (
              <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>
                ← Voltar
              </Button>
            ) : (
              <div />
            )}

            {step < 6 ? (
              <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
                Próximo →
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleRunDiscovery}
                data-testid="submit-discovery-btn"
              >
                Gerar Recomendações
              </Button>
            )}
          </div>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
        {/* Step 1: Days Per Week */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
            <h3 style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'bold' }}>
              Quantos dias na semana você pretende treinar?
            </h3>
            <p style={{ fontSize: 'var(--tita-text-xs)', color: 'var(--tita-text-muted)' }}>
              A consistência é mais importante do que treinar todos os dias. Seja realista com sua
              rotina.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(64px, 1fr))',
                gap: '8px',
              }}
            >
              {[2, 3, 4, 5, 6].map((days) => (
                <Button
                  key={days}
                  variant={daysPerWeek === days ? 'primary' : 'secondary'}
                  onClick={() => setDaysPerWeek(days)}
                >
                  {days} dias
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Session Duration */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
            <h3 style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'bold' }}>
              Quanto tempo você tem disponível por sessão?
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(88px, 1fr))',
                gap: '8px',
              }}
            >
              {[30, 45, 60, 75, 90].map((dur) => (
                <Button
                  key={dur}
                  variant={durationMinutes === dur ? 'primary' : 'secondary'}
                  onClick={() => setDurationMinutes(dur)}
                >
                  ~{dur} min
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Experience Level */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
            <h3 style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'bold' }}>
              Qual é o seu nível atual de experiência com musculação?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'beginner', label: 'Iniciante (menos de 1 ano de treino consistente)' },
                { id: 'intermediate', label: 'Intermediário (1 a 3 anos de treino regular)' },
                { id: 'advanced', label: 'Avançado (mais de 3 anos de treino sério)' },
              ].map((lvl) => (
                <Button
                  key={lvl.id}
                  variant={experience === lvl.id ? 'primary' : 'secondary'}
                  onClick={() => setExperience(lvl.id as 'beginner' | 'intermediate' | 'advanced')}
                  style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                >
                  {lvl.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Primary Goal */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
            <h3 style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'bold' }}>
              Qual é o seu objetivo prioritário no momento?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'hypertrophy', label: 'Hipertrofia Muscular (Ganho de Massa)' },
                { id: 'strength', label: 'Ganho de Força Bruta (Cargas nos Básicos)' },
                { id: 'general_fitness', label: 'Condicionamento Físico & Saúde Geral' },
              ].map((g) => (
                <Button
                  key={g.id}
                  variant={goal === g.id ? 'primary' : 'secondary'}
                  onClick={() => setGoal(g.id as 'hypertrophy' | 'strength' | 'general_fitness')}
                  style={{ justifyContent: 'flex-start' }}
                >
                  {g.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Equipment */}
        {step === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
            <h3 style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'bold' }}>
              A qual tipo de equipamento você tem acesso?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'full_gym', label: 'Academia Completa (Barras, Halteres, Polias, Máquinas)' },
                { id: 'barbell_and_rack', label: 'Barra Olímpica, Gaiola/Suporte e Anilhas' },
                { id: 'dumbbells', label: 'Halteres e Banco Ajustável' },
              ].map((eq) => (
                <Button
                  key={eq.id}
                  variant={equipment === eq.id ? 'primary' : 'secondary'}
                  onClick={() =>
                    setEquipment(eq.id as 'full_gym' | 'barbell_and_rack' | 'dumbbells')
                  }
                  style={{ justifyContent: 'flex-start' }}
                >
                  {eq.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 6: Preferred Split */}
        {step === 6 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
            <h3 style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'bold' }}>
              Tem alguma divisão de treino preferida?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { id: 'any', label: 'Sem preferência (deixar o algoritmo calcular)' },
                { id: 'full_body', label: 'Full Body (Corpo Inteiro por sessão)' },
                { id: 'upper_lower', label: 'Upper / Lower (Superiores / Inferiores)' },
                { id: 'ppl', label: 'Push / Pull / Legs (Empurrar / Puxar / Pernas)' },
              ].map((sp) => (
                <Button
                  key={sp.id}
                  variant={preferredSplit === sp.id ? 'primary' : 'secondary'}
                  onClick={() =>
                    setPreferredSplit(sp.id as 'any' | 'full_body' | 'upper_lower' | 'ppl')
                  }
                  style={{ justifyContent: 'flex-start' }}
                >
                  {sp.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Step 7: Results */}
        {step === 7 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
            <div
              style={{
                backgroundColor: 'var(--tita-surface-2)',
                padding: 'var(--tita-space-3)',
                borderRadius: 'var(--tita-radius-sm)',
                fontSize: 'var(--tita-text-xs)',
                color: 'var(--tita-text-muted)',
              }}
            >
              💡 <strong>Algoritmo Determinístico:</strong> As pontuações abaixo representam o
              índice de compatibilidade do modelo com seu calendário ({daysPerWeek} dias/sem), tempo
              disponível (~{durationMinutes} min) e perfil técnico. Não é IA ou probabilidade
              estatística.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
              {recommendations.map((rec, idx) => (
                <Card key={rec.template.id}>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}
                  >
                    {/* Header with Score */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <div>
                        {idx === 0 && (
                          <span
                            style={{
                              backgroundColor: 'var(--tita-accent)',
                              color: 'var(--tita-bg)',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              textTransform: 'uppercase',
                              marginRight: '6px',
                            }}
                          >
                            Melhor Escolha
                          </span>
                        )}
                        <h4
                          style={{
                            fontSize: 'var(--tita-text-base)',
                            fontWeight: 'bold',
                            display: 'inline',
                          }}
                        >
                          {rec.template.name}
                        </h4>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--tita-text-muted)',
                            marginTop: '2px',
                          }}
                        >
                          {rec.template.splitType} • {rec.template.daysPerWeek} dias/sem • ~
                          {rec.template.estimatedSessionDurationMinutes} min
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor:
                            idx === 0 ? 'rgba(234, 179, 8, 0.15)' : 'var(--tita-surface-2)',
                          color: idx === 0 ? 'var(--tita-accent)' : 'var(--tita-text)',
                          border: '1px solid var(--tita-border)',
                          padding: '4px 10px',
                          borderRadius: 'var(--tita-radius-sm)',
                          fontWeight: 'bold',
                          fontSize: 'var(--tita-text-sm)',
                        }}
                      >
                        {rec.compatibilityScore}% Compatível
                      </div>
                    </div>

                    {/* Reasoning */}
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--tita-text)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      {rec.matchReasoning.map((reason, rIdx) => (
                        <div key={rIdx} style={{ display: 'flex', gap: '6px' }}>
                          <span style={{ color: 'var(--tita-accent)' }}>✓</span>
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    {/* Tradeoffs if any */}
                    {rec.tradeoffs.length > 0 && (
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--tita-text-muted)',
                          backgroundColor: 'rgba(255,255,255,0.02)',
                          padding: '6px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        <span style={{ fontWeight: 'bold' }}>Atenção: </span>
                        {rec.tradeoffs[0]}
                      </div>
                    )}

                    {/* Action */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                      <Button
                        size="sm"
                        variant={idx === 0 ? 'primary' : 'secondary'}
                        onClick={() => handleCloneRecommendation(rec.template.id)}
                        disabled={isCloning}
                        data-testid={`clone-recommendation-${rec.template.id}`}
                      >
                        {isCloning ? 'Clonando...' : 'Clonar e Usar Modelo'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
