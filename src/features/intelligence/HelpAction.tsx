import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise } from '../../domain/entities/exercise.js';
import type { StructuredSummary } from '../../intelligence/contracts.js';
import { helpQuestions, helpSummary, localHelp, type HelpScreen } from '../../intelligence/help.js';
import { intelligenceSession, useIntelligence } from '../../intelligence/session.js';
import { Button, Dialog, StatusBanner } from '../../ui/components/index.js';
import { intelligenceMessage } from './IntelligenceAction.js';
import './help.css';

export function HelpAction({
  screen,
  getContext,
  exercise,
  embedded = false,
}: {
  screen: HelpScreen;
  getContext?: () => StructuredSummary | Promise<StructuredSummary>;
  exercise?: Exercise;
  embedded?: boolean;
}) {
  const session = useIntelligence();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [source, setSource] = useState('Resposta local · sem chamada externa');
  const [preview, setPreview] = useState<StructuredSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const operation = useRef<AbortController | null>(null);
  const cancel = () => {
    operation.current?.abort();
    setBusy(false);
  };
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    operation.current?.abort();
    setBusy(false);
    setPreview(null);
    setError('');
  }, [session.revision]);
  const close = () => {
    cancel();
    setOpen(false);
    setQuestion('');
    setAnswer('');
    setPreview(null);
    setError('');
  };
  const edit = (value: string) => {
    cancel();
    setQuestion(value);
    setAnswer('');
    setPreview(null);
    setError('');
  };
  const ask = async (value: string) => {
    edit(value);
    const local = localHelp(value, exercise);
    if (local) {
      setAnswer(local);
      setSource('Resposta local · sem chamada externa');
      return;
    }
    if (!session.enabled) {
      setError('Configure Titã Intelligence para obter uma explicação contextual.');
      return;
    }
    if (!navigator.onLine) {
      setError('Você está offline. As perguntas locais continuam disponíveis.');
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    try {
      const context = await (getContext?.() ?? {
        version: 1 as const,
        kind: 'help' as const,
        data: { screen },
      });
      const payload = helpSummary(screen, value, context);
      if (!controller.signal.aborted) setPreview(payload);
    } catch (e) {
      if (!controller.signal.aborted) setError(intelligenceMessage(e));
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const send = async () => {
    if (!preview) return;
    cancel();
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setError('');
    try {
      const result = await intelligenceSession.generateInsight(preview, controller.signal);
      if (!controller.signal.aborted) {
        setAnswer(result.summary);
        setSource('Titã Intelligence · modelo principal');
      }
    } catch (e) {
      if (!controller.signal.aborted)
        setError(`${intelligenceMessage(e)} As respostas locais continuam disponíveis.`);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const content = (
    <div className="tita-intelligence tita-help" data-testid="help-content">
      {!answer && !preview && (
        <>
          <p>Entenda esta tela. Comece por uma pergunta:</p>
          <div className="tita-help__questions">
            {helpQuestions[screen].map((q) => (
              <Button key={q} variant="secondary" onClick={() => ask(q)}>
                {q}
              </Button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
          >
            <label className="tita-intelligence__field">
              Fazer outra pergunta...
              <textarea
                aria-label="Fazer outra pergunta"
                maxLength={240}
                rows={2}
                value={question}
                onChange={(e) => edit(e.target.value)}
                placeholder="Uma dúvida sobre esta tela"
              />
            </label>
            <p className="tita-intelligence__meta">
              Até 240 caracteres. Não inclua dados pessoais ou credenciais.
            </p>
            <Button type="submit" variant="secondary" disabled={!question.trim() || busy}>
              Consultar ajuda
            </Button>
          </form>
        </>
      )}
      {answer && (
        <section className="tita-help__answer" aria-live="polite" data-testid="help-answer">
          <h3>{question}</h3>
          <p>{answer}</p>
          <p className="tita-intelligence__meta">{source}</p>
          {source.startsWith('Titã') && (
            <p className="tita-intelligence__meta">
              Explicação informativa; a IA pode errar. Nenhum treino foi alterado.
            </p>
          )}
        </section>
      )}
      {preview && !answer && (
        <>
          <h3>{question}</h3>
          <p>Enviar esta pergunta e o resumo da tela ao modelo principal?</p>
          <p className="tita-intelligence__meta">
            Destino: {session.endpoint} · {session.model}. Custos, cotas e retenção dependem do
            provider.
          </p>
          <details>
            <summary>Ver dados que serão enviados</summary>
            <pre data-testid="help-payload">{JSON.stringify(preview, null, 2)}</pre>
          </details>
          <Button onClick={send} disabled={busy}>
            Enviar pergunta e contexto
          </Button>
        </>
      )}
      {busy && <p role="status">Consultando… Você pode cancelar.</p>}
      {error && <StatusBanner type="error" message={error} />}
      {busy && (
        <Button variant="secondary" onClick={cancel}>
          Cancelar consulta
        </Button>
      )}
      {(answer || preview) && (
        <Button variant="secondary" onClick={() => edit('')}>
          Fazer outra pergunta
        </Button>
      )}
    </div>
  );
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="tita-help-trigger"
        onClick={(event) => {
          const menu = event.currentTarget.closest('details');
          menu?.removeAttribute('open');
          (menu?.querySelector('summary') ?? event.currentTarget).focus();
          setOpen(true);
        }}
      >
        {' '}
        ? Ajude-me
      </Button>
      {embedded
        ? open && (
            <section aria-label="Ajude-me" className="tita-help-embedded">
              {content}
              <Button variant="secondary" onClick={close}>
                Fechar ajuda
              </Button>
            </section>
          )
        : createPortal(
            <Dialog isOpen={open} onClose={close} title="Ajude-me" className="tita-help-dialog">
              {content}
            </Dialog>,
            document.body,
          )}
    </>
  );
}
