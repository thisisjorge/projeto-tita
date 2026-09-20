import { useSyncExternalStore } from 'react';
import {
  type AIProvider,
  type ProviderConfig,
  type StructuredSummary,
  IntelligenceError,
  validateConfiguration,
} from './contracts.js';
import { createProvider } from './providers.js';

interface SessionState {
  enabled: boolean;
  connected: boolean;
  provider: ProviderConfig['provider'];
  endpoint: string;
  model: string;
  revision: number;
  fastJudge: { provider: string; endpoint: string; model: string } | null;
}
const EMPTY: SessionState = {
  enabled: false,
  connected: false,
  provider: 'openai-compatible',
  endpoint: 'https://api.openai.com/v1',
  model: '',
  revision: 0,
  fastJudge: null,
};

/** Credentials stay in this tab's memory, outside IndexedDB, backups and browser storage. */
export class IntelligenceSession {
  #config: ProviderConfig | null = null;
  #judgeConfig: ProviderConfig | null = null;
  #requests = new Set<AIProvider>();
  #state: SessionState = EMPTY;
  #listeners = new Set<() => void>();
  constructor(private readonly factory = createProvider) {}
  getSnapshot = () => this.#state;
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  private emit(state: SessionState) {
    this.#state = state;
    this.#listeners.forEach((listener) => listener());
  }
  configure(config: ProviderConfig) {
    const valid = validateConfiguration(config);
    this.#requests.forEach((request) => request.abort());
    this.#config = valid;
    this.emit({
      ...this.#state,
      enabled: true,
      connected: false,
      provider: valid.provider,
      endpoint: valid.endpoint,
      model: valid.model,
      revision: this.#state.revision + 1,
    });
  }
  disable = () => {
    this.#requests.forEach((request) => request.abort());
    this.#config = null;
    this.#judgeConfig = null;
    this.emit({ ...EMPTY, revision: this.#state.revision + 1 });
  };
  configureFastJudge(config: ProviderConfig | null) {
    const valid = config ? validateConfiguration(config) : null;
    this.#requests.forEach((p) => p.abort());
    this.#judgeConfig = valid;
    this.emit({
      ...this.#state,
      revision: this.#state.revision + 1,
      fastJudge: valid
        ? { provider: valid.provider, endpoint: valid.endpoint, model: valid.model }
        : null,
    });
  }
  private async run<T>(
    operation: (provider: AIProvider) => Promise<T>,
    signal?: AbortSignal,
    fastJudge = false,
  ): Promise<T> {
    if (!this.#config || !this.#state.enabled)
      throw new IntelligenceError('disabled', 'Ative e configure Titã Intelligence em Ajustes.');
    if (signal?.aborted) throw new IntelligenceError('aborted', 'Análise cancelada.');
    const revision = this.#state.revision;
    const provider = this.factory(
      fastJudge && this.#judgeConfig ? this.#judgeConfig : this.#config,
    );
    this.#requests.add(provider);
    const abort = () => provider.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const result = await operation(provider);
      if (revision !== this.#state.revision || signal?.aborted)
        throw new IntelligenceError('aborted', 'Análise cancelada.');
      if (!fastJudge) this.emit({ ...this.#state, connected: true });
      return result;
    } finally {
      signal?.removeEventListener('abort', abort);
      this.#requests.delete(provider);
    }
  }
  testConnection(signal?: AbortSignal, fastJudge = false) {
    return this.run((p) => p.testConnection(), signal, fastJudge);
  }
  generateInsight(summary: StructuredSummary, signal?: AbortSignal) {
    const payload = JSON.stringify(summary);
    if (
      [this.#config?.apiKey, this.#judgeConfig?.apiKey].some((key) => key && payload.includes(key))
    )
      throw new IntelligenceError('payload', 'Remova credenciais do resumo antes de enviar.');
    return this.run((p) => p.generateInsight(summary), signal);
  }
  rankCandidates(summary: StructuredSummary, signal?: AbortSignal) {
    return this.run((p) => p.rankCandidates(summary), signal, true);
  }
}
export const intelligenceSession = new IntelligenceSession();
export const useIntelligence = () =>
  useSyncExternalStore(
    intelligenceSession.subscribe,
    intelligenceSession.getSnapshot,
    intelligenceSession.getSnapshot,
  );
