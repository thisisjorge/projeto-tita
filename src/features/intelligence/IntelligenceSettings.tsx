import React, { useEffect, useRef, useState } from 'react';
import { Button, Card, Field, StatusBanner } from '../../ui/components/index.js';
import { intelligenceSession, useIntelligence } from '../../intelligence/session.js';
import { type ProviderConfig } from '../../intelligence/contracts.js';
import { PROVIDER_PRESETS } from '../../intelligence/providers.js';
import { intelligenceMessage } from './IntelligenceAction.js';
import './intelligence.css';
import { FastJudgeSettings } from './FastJudgeSettings.js';

export function IntelligenceSettings() {
  const state = useIntelligence();
  const [editing, setEditing] = useState(state.enabled);
  const [provider, setProvider] = useState<ProviderConfig['provider']>(state.provider);
  const [presetId, setPresetId] = useState<string>(
    PROVIDER_PRESETS.find((p) => p.adapter === state.provider && p.endpoint === state.endpoint)
      ?.id ?? 'openai-compatible',
  );
  const preset = PROVIDER_PRESETS.find((p) => p.id === presetId)!;
  const [endpoint, setEndpoint] = useState(state.endpoint);
  const [model, setModel] = useState(state.model);
  const [key, setKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const invalidate = () => {
    controller.current?.abort();
    intelligenceSession.disable();
    setMessage('');
    setError('');
    setBusy(false);
  };
  const remove = () => {
    invalidate();
    setKey('');
    setEditing(false);
    setModel('');
    setMessage('Chave removida da memória. Titã Intelligence desativado.');
  };
  const save = () => {
    try {
      intelligenceSession.configure({ provider, endpoint, apiKey: key, model });
      setKey('');
      setError('');
      setMessage('Configuração ativa somente nesta aba. Recarregar ou fechar remove a chave.');
    } catch (e) {
      setError(intelligenceMessage(e));
    }
  };
  const test = async () => {
    const current = new AbortController();
    controller.current = current;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await intelligenceSession.testConnection(current.signal);
      if (!current.signal.aborted)
        setMessage('Conectado. O modelo respondeu ao teste; nenhum dado de treino foi enviado.');
    } catch (e) {
      if (!current.signal.aborted) setError(intelligenceMessage(e));
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  };
  return (
    <Card
      title="Titã Intelligence"
      subtitle="Análises opcionais com sua própria chave (BYOK)."
      data-testid="intelligence-settings"
    >
      <div className="tita-intelligence">
        <label className="tita-intelligence__toggle">
          <input
            type="checkbox"
            checked={editing}
            onChange={(e) => {
              if (!e.target.checked) remove();
              else setEditing(true);
            }}
          />
          Ativar Titã Intelligence
        </label>
        <p>
          O tracker funciona offline sem IA. As chamadas externas só acontecem quando você solicita
          uma análise ou testa a conexão.
        </p>
        {editing && (
          <>
            <p>
              Chave somente na memória desta aba: não é salva no navegador, backup ou ficha. Scripts
              da página, extensões com acesso e ferramentas do navegador podem lê-la enquanto
              estiver em uso. Use uma chave com limites e revogue-a no provider se necessário.
            </p>
            <label className="tita-intelligence__field">
              <strong>Modelo principal</strong>
              Provider
              <select
                aria-label="Provider de IA"
                value={presetId}
                onChange={(e) => {
                  const choice = PROVIDER_PRESETS.find((p) => p.id === e.target.value)!;
                  invalidate();
                  setKey('');
                  setModel('');
                  setPresetId(choice.id);
                  setProvider(choice.adapter);
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
                label="Endpoint HTTPS (URL base)"
                value={endpoint}
                onChange={(e) => {
                  invalidate();
                  setEndpoint(e.target.value);
                }}
                placeholder="https://api.openai.com/v1"
              />
            ) : (
              <p className="tita-intelligence__meta">Base URL: {preset.endpoint}</p>
            )}
            <Field
              label="API Key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => {
                invalidate();
                setKey(e.target.value);
              }}
              placeholder={state.enabled ? 'Chave configurada nesta aba' : 'Sua chave do provider'}
            />
            <Field
              label="Modelo"
              value={model}
              onChange={(e) => {
                invalidate();
                setModel(e.target.value);
              }}
              placeholder="Identificador do modelo com suporte a JSON"
            />
            <p className="tita-intelligence__meta">
              O endpoint recebe a chave. Confira o domínio antes de ativar. Compatibilidade OpenAI
              exige Chat Completions, JSON mode e CORS; depende do provider/modelo.
            </p>
            <div className="tita-intelligence__actions">
              <Button onClick={save} disabled={!key || !model}>
                Usar nesta aba
              </Button>
              <Button variant="secondary" onClick={test} disabled={!state.enabled || busy}>
                Testar conexão
              </Button>
              <Button variant="ghost" onClick={remove}>
                Remover chave e desativar
              </Button>
              {busy && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    controller.current?.abort();
                    setBusy(false);
                  }}
                >
                  Cancelar teste
                </Button>
              )}
            </div>
            <p role="status">
              {state.connected
                ? '● Conectado'
                : state.enabled
                  ? '○ Configurado · conexão não testada'
                  : '○ Não configurado'}
            </p>
            <p className="tita-intelligence__meta">
              O teste envia apenas uma instrução de verificação ao modelo e pode gerar cobrança.
            </p>
            <p className="tita-intelligence__meta">
              BYOK: disponibilidade de modelos, custos e cotas dependem da sua conta e do provider.
              NVIDIA NIM usa o mesmo adapter OpenAI-compatible.
            </p>
            {state.enabled && <FastJudgeSettings />}
          </>
        )}
        {message && <StatusBanner type="info" message={message} />}
        {error && <StatusBanner type="error" message={error} />}
      </div>
    </Card>
  );
}
