import React, { useEffect, useRef, useState } from 'react';
import { Button, Dialog, StatusBanner } from '../../ui/components/index.js';
import {
  IntelligenceError,
  serializeSummary,
  type StructuredSummary,
  type TrainingInsight,
} from '../../intelligence/contracts.js';
import { intelligenceSession, useIntelligence } from '../../intelligence/session.js';
import './intelligence.css';

export function intelligenceMessage(error: unknown): string {
  return error instanceof IntelligenceError
    ? error.message
    : 'Não foi possível preparar a análise. Seus treinos não foram alterados.';
}
export function IntelligenceAction({
  label,
  getSummary,
}: {
  label: string;
  getSummary: () => StructuredSummary | Promise<StructuredSummary>;
}) {
  const state = useIntelligence();
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<StructuredSummary | null>(null);
  const [insight, setInsight] = useState<TrainingInsight | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef<AbortController | null>(null);
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    operation.current?.abort();
    setOpen(false);
    setSummary(null);
    setInsight(null);
    setError('');
    setBusy(false);
  }, [state.revision]);
  const close = () => {
    operation.current?.abort();
    setOpen(false);
    setBusy(false);
  };
  const prepare = async () => {
    operation.current?.abort();
    const controller = new AbortController();
    operation.current = controller;
    setOpen(true);
    setBusy(true);
    setError('');
    setInsight(null);
    setSummary(null);
    try {
      const data = await getSummary();
      serializeSummary(data);
      if (!controller.signal.aborted) setSummary(data);
    } catch (e) {
      if (!controller.signal.aborted) setError(intelligenceMessage(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const generate = async () => {
    if (!summary) return;
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    setInsight(null);
    try {
      const result = await intelligenceSession.generateInsight(summary, controller.signal);
      if (!controller.signal.aborted) setInsight(result);
    } catch (e) {
      if (!controller.signal.aborted) setError(intelligenceMessage(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  if (!state.enabled) return null;
  return (
    <>
      <Button variant="secondary" size="sm" onClick={prepare} className="tita-intelligence-action">
        {label}
      </Button>
      <Dialog
        isOpen={open}
        onClose={close}
        title="Titã Intelligence"
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              {busy ? 'Cancelar' : insight ? 'Fechar análise' : 'Voltar'}
            </Button>
            {!insight && (
              <Button disabled={busy || !summary} onClick={generate}>
                {busy ? 'Preparando análise…' : 'Enviar resumo e analisar'}
              </Button>
            )}
          </>
        }
      >
        <div className="tita-intelligence">
          <p>
            Para gerar esta análise, um resumo dos seus dados de treino será enviado ao provedor de
            IA configurado.
          </p>
          <p className="tita-intelligence__meta">
            Destino: {state.provider === 'gemini' ? 'Gemini' : state.endpoint} · Modelo:{' '}
            {state.model}. O provider pode cobrar por esta chamada e aplicar sua própria política de
            retenção.
          </p>
          {summary && (
            <details>
              <summary>Ver dados que serão enviados</summary>
              <pre data-testid="intelligence-payload">{JSON.stringify(summary, null, 2)}</pre>
              <p>Notas pessoais, identificadores internos e histórico bruto não estão incluídos.</p>
            </details>
          )}
          {busy && <p role="status">Aguardando o provider. Você pode cancelar.</p>}
          {error && <StatusBanner type="error" message={error} />}
          {insight && (
            <section data-testid="intelligence-result" aria-live="polite">
              <h3>Resumo</h3>
              <p>{insight.summary}</p>
              {(
                [
                  ['O que está indo bem', insight.positives],
                  ['Ponto de atenção', insight.concerns],
                  ['Próxima ação sugerida', insight.suggestions],
                ] as const
              ).map(([title, items]) => (
                <div key={title}>
                  <h3>{title}</h3>
                  {items.length ? (
                    <ul>
                      {items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Nenhum ponto informado pelo provider.</p>
                  )}
                </div>
              ))}
              <p className="tita-intelligence__meta">
                Suporte dos dados:{' '}
                {{ low: 'baixo', medium: 'médio', high: 'alto' }[insight.confidence]}. Análise
                informativa: nenhum treino foi alterado. A IA pode errar e não substitui orientação
                profissional.
              </p>
            </section>
          )}
        </div>
      </Dialog>
    </>
  );
}
