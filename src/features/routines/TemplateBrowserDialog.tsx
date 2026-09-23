import React, { useState } from 'react';
import type { ProgramTemplate } from '../../data/seed-templates.js';
import { builtinSplitLabel } from '../../data/builtin-display.js';
import { TemplateService } from '../../services/template-service.js';
import { Dialog, Button, Card } from '../../ui/components/index.js';

interface TemplateBrowserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateService: TemplateService;
  onTemplateCloned: () => void;
}

export const TemplateBrowserDialog: React.FC<TemplateBrowserDialogProps> = ({
  isOpen,
  onClose,
  templateService,
  onTemplateCloned,
}) => {
  const templates = templateService.getTemplates();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) ?? null;

  const handleClone = async (templateId: string) => {
    setIsCloning(true);
    try {
      await templateService.cloneTemplateToUserProgram(templateId);
      setSuccessMessage(
        'Modelo clonado com sucesso! Suas novas rotinas já estão prontas para treino.',
      );
      onTemplateCloned();
      setTimeout(() => {
        setSuccessMessage(null);
        setSelectedTemplateId(null);
        onClose();
      }, 1200);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao clonar modelo.');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={selectedTemplate ? selectedTemplate.name : 'Modelos de Treino Oficiais'}
      footer={
        selectedTemplate ? (
          <div
            style={{
              display: 'flex',
              gap: 'var(--tita-space-2)',
              width: '100%',
              justifyContent: 'space-between',
            }}
          >
            <Button variant="secondary" onClick={() => setSelectedTemplateId(null)}>
              ← Voltar à Lista
            </Button>
            <Button
              variant="primary"
              onClick={() => handleClone(selectedTemplate.id)}
              disabled={isCloning}
              data-testid="clone-selected-template-btn"
            >
              {isCloning ? 'Clonando...' : 'Usar este Modelo'}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        )
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
        {successMessage && (
          <div
            style={{
              backgroundColor: 'rgba(34, 197, 94, 0.15)',
              color: '#22c55e',
              padding: 'var(--tita-space-3)',
              borderRadius: 'var(--tita-radius-sm)',
              fontSize: 'var(--tita-text-sm)',
              fontWeight: 'bold',
              textAlign: 'center',
            }}
          >
            {successMessage}
          </div>
        )}

        {!selectedTemplate ? (
          /* Templates List */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
            <p style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text-muted)' }}>
              Selecione uma estrutura canônica pronta para clonar. Ao clonar, você ganha cópias 100%
              editáveis no seu dispositivo, com identificadores próprios e total autonomia.
            </p>

            {templates.map((tpl) => (
              <Card key={tpl.id}>
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-2)' }}
                >
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
                      <h4 style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'bold' }}>
                        {tpl.name}
                      </h4>
                      <div
                        style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            backgroundColor: 'var(--tita-surface-2)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            color: 'var(--tita-accent)',
                          }}
                        >
                          {builtinSplitLabel(tpl.splitType)}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            backgroundColor: 'var(--tita-surface-2)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: 'var(--tita-text-muted)',
                          }}
                        >
                          {tpl.daysPerWeek} dias/semana
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            backgroundColor: 'var(--tita-surface-2)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: 'var(--tita-text-muted)',
                          }}
                        >
                          ~{tpl.estimatedSessionDurationMinutes} min/sessão
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setSelectedTemplateId(tpl.id)}
                      data-testid={`preview-template-${tpl.id}`}
                    >
                      Ver Detalhes
                    </Button>
                  </div>

                  <p
                    style={{
                      fontSize: 'var(--tita-text-xs)',
                      color: 'var(--tita-text-muted)',
                      marginTop: '4px',
                    }}
                  >
                    {tpl.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          /* Template Details & Routines Breakdown */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-4)' }}>
            <div>
              <p style={{ fontSize: 'var(--tita-text-sm)', color: 'var(--tita-text-muted)' }}>
                {selectedTemplate.description}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                  Ciclo: {selectedTemplate.durationWeeks} semanas
                </span>
                <span>•</span>
                <span style={{ fontSize: '12px' }}>
                  Progressão: {selectedTemplate.progressionStrategy}
                </span>
              </div>
            </div>

            <h4 style={{ fontSize: 'var(--tita-text-base)', fontWeight: 'bold' }}>
              Rotinas Incluídas ({selectedTemplate.routines.length}):
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tita-space-3)' }}>
              {selectedTemplate.routines.map((r, rIdx) => (
                <div
                  key={rIdx}
                  style={{
                    backgroundColor: 'var(--tita-surface-2)',
                    padding: 'var(--tita-space-3)',
                    borderRadius: 'var(--tita-radius-md)',
                    border: '1px solid var(--tita-border)',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 'bold',
                      fontSize: 'var(--tita-text-sm)',
                      color: 'var(--tita-accent)',
                    }}
                  >
                    Dia {r.dayNumber}: {r.name}
                  </div>
                  {r.description && (
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--tita-text-muted)',
                        marginTop: '2px',
                      }}
                    >
                      {r.description}
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    {r.exercises.map((slot, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          padding: '2px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <span>
                          {sIdx + 1}. {slot.defaultExerciseName}
                        </span>
                        <span style={{ color: 'var(--tita-text-muted)' }}>
                          {slot.targetSets}x{' '}
                          {slot.minReps === slot.maxReps
                            ? slot.minReps
                            : `${slot.minReps}-${slot.maxReps}`}{' '}
                          reps ({slot.restSeconds}s)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
};
