import { useEffect, useRef, useState } from 'react';
import { Button, Field } from '../../ui/components/index.js';
import { intelligenceSession, useIntelligence } from '../../intelligence/session.js';
import { PROVIDER_PRESETS } from '../../intelligence/providers.js';
import { intelligenceMessage } from './IntelligenceAction.js';

export function FastJudgeSettings() {
  const state = useIntelligence();
  const [separate, setSeparate] = useState(!!state.fastJudge);
  const [presetId, setPresetId] = useState<string>(
    () =>
      PROVIDER_PRESETS.find(
        (p) => p.adapter === state.fastJudge?.provider && p.endpoint === state.fastJudge.endpoint,
      )?.id ?? (state.fastJudge ? 'openai-compatible' : 'nvidia'),
  );
  const preset = PROVIDER_PRESETS.find((p) => p.id === presetId)!;
  const [endpoint, setEndpoint] = useState<string>(state.fastJudge?.endpoint ?? preset.endpoint);
  const [model, setModel] = useState(state.fastJudge?.model ?? '');
  const [key, setKey] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const invalidate = () => {
    controller.current?.abort();
    setBusy(false);
    intelligenceSession.configureFastJudge(null);
    setNotice('Enquanto não salvar, será usado o modelo principal.');
  };
  return (
    <section className="tita-intelligence" aria-label="Fast Judge">
      <h3>Fast Judge · decisões rápidas</h3>
      <p>
        Refina alternativas de exercícios em até 4,5 segundos. Sem resposta, permanece a ordem
        local.
      </p>
      <label className="tita-intelligence__toggle">
        <input
          type="checkbox"
          checked={!separate}
          onChange={(e) => {
            invalidate();
            setKey('');
            setSeparate(!e.target.checked);
          }}
        />
        Usar o mesmo provider/modelo principal
      </label>
      {separate && (
        <div className="tita-intelligence" data-testid="fast-judge-advanced">
          <p>Configuração separada (opcional). A chave também fica somente na memória desta aba.</p>
          <label className="tita-intelligence__field">
            Provider do Fast Judge
            <select
              value={presetId}
              onChange={(e) => {
                const choice = PROVIDER_PRESETS.find((p) => p.id === e.target.value)!;
                invalidate();
                setKey('');
                setModel('');
                setPresetId(choice.id);
                setEndpoint(choice.endpoint);
              }}
            >
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {preset.customEndpoint ? (
            <Field
              label="Endpoint do Fast Judge"
              value={endpoint}
              onChange={(e) => {
                invalidate();
                setEndpoint(e.target.value);
              }}
            />
          ) : (
            <p className="tita-intelligence__meta">Base URL: {preset.endpoint}</p>
          )}
          <Field
            label="API Key do Fast Judge"
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => {
              invalidate();
              setKey(e.target.value);
            }}
          />
          <Field
            label="Modelo do Fast Judge"
            value={model}
            onChange={(e) => {
              invalidate();
              setModel(e.target.value);
            }}
          />
          <div className="tita-intelligence__actions">
            <Button
              disabled={!key || !model || !state.enabled}
              onClick={() => {
                try {
                  intelligenceSession.configureFastJudge({
                    provider: preset.adapter,
                    endpoint,
                    apiKey: key,
                    model,
                  });
                  setKey('');
                  setNotice('Fast Judge separado configurado nesta aba.');
                } catch (e) {
                  setNotice(intelligenceMessage(e));
                }
              }}
            >
              Usar configuração separada
            </Button>
            <Button
              variant="secondary"
              disabled={!state.fastJudge || busy}
              onClick={async () => {
                const current = new AbortController();
                controller.current = current;
                setBusy(true);
                setNotice('Testando conexão…');
                try {
                  await intelligenceSession.testConnection(current.signal, true);
                  if (!current.signal.aborted) setNotice('Fast Judge conectado.');
                } catch (e) {
                  if (!current.signal.aborted) setNotice(intelligenceMessage(e));
                } finally {
                  if (!current.signal.aborted) setBusy(false);
                }
              }}
            >
              Testar Fast Judge
            </Button>
          </div>
          <p className="tita-intelligence__meta">
            O teste usa o modelo sem dados de treino e pode gerar cobrança.
          </p>
        </div>
      )}
      <p role="status">
        {notice ||
          (state.fastJudge ? `Separado: ${state.fastJudge.model}` : `Principal: ${state.model}`)}
      </p>
    </section>
  );
}
