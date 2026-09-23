import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  helpQuestions,
  helpSummary,
  libraryHelpContext,
  localHelp,
  workoutHelpContext,
} from '../../src/intelligence/help.js';
import { IntelligenceSession } from '../../src/intelligence/session.js';
import { createProvider } from '../../src/intelligence/providers.js';
import { SEED_EXERCISES } from '../../src/data/seed-exercises.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import type { ProviderConfig } from '../../src/intelligence/contracts.js';

const config: ProviderConfig = {
  provider: 'openai-compatible',
  endpoint: 'https://integrate.api.nvidia.com/v1',
  model: 'main-model',
  apiKey: 'help-fixture-not-a-real-key',
};
const context = {
  version: 1 as const,
  kind: 'progress' as const,
  data: { metric: 'E1RM', period: 'MONTH', volumeKg: 800 },
};
const payload = helpSummary('progress', 'Por que meu volume mudou?', context);
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe('local help and minimal context', () => {
  it.each(['RIR', 'RPE', 'e1RM', 'volume', 'PR', 'platô', 'progressão', 'BYOK'])(
    'answers %s locally without configuration',
    (term) => {
      expect(localHelp(term)).toBeTruthy();
    },
  );
  it('keeps compound/contextual questions out of generic local answers', () => {
    expect(localHelp('Por que meu e1RM subiu e meu volume caiu esta semana?')).toBeNull();
    expect(localHelp('Como fazer backup?')).toContain('Ajustes');
    expect(localHelp('Funciona offline?')).toContain('offline');
  });
  it.each([
    'Sinto dor no ombro',
    'É seguro para uma lesão?',
    'Preciso de diagnóstico',
    'I have an injury',
  ])('handles injury conservatively and locally: %s', (question) => {
    expect(localHelp(question)).toContain('Interrompa');
    expect(localHelp(question)).toContain('não diagnostica');
  });
  it('uses catalog instructions without inventing execution cues', () => {
    const exercise = SEED_EXERCISES[0]!;
    expect(localHelp(helpQuestions.library[1], exercise)).toBe(exercise.instructions.join('\n'));
    expect(localHelp(helpQuestions.library[0], exercise)).toContain(exercise.primaryMuscle);
    const json = JSON.stringify(libraryHelpContext(exercise));
    expect(json).not.toContain(exercise.id);
    expect(
      libraryHelpContext({ ...exercise, source: 'custom', instructions: ['PRIVATE-NOTE'] }).data
        .curatedInstructions,
    ).toEqual([]);
  });
  it('workout context excludes completed current sets, notes, timestamps and identifiers', () => {
    const set = {
      id: 'private-set',
      setNumber: 1,
      type: SetType.NORMAL,
      completed: true,
      weight: 60,
      reps: 8,
      notes: 'PRIVATE-NOTE',
      completedAt: 'PRIVATE-TIME',
    };
    const result = workoutHelpContext(
      {
        id: 'private-slot',
        exerciseId: 'private-id',
        exerciseName: 'Supino',
        order: 0,
        notes: 'PRIVATE-NOTE',
        sets: [set, { ...set, completed: false, weight: 62.5 }],
      },
      [set],
    );
    expect(result.data.previous).toEqual([{ kg: 60, reps: 8 }]);
    expect(result.data.current).toEqual([{ kg: 62.5, reps: 8 }]);
    expect(JSON.stringify(result)).not.toMatch(/private-|PRIVATE-/);
  });
  it('retains only explicitly supplied screen context and validates free text', () => {
    expect(payload.data).toEqual({
      screen: 'progress',
      question: 'Por que meu volume mudou?',
      context: context.data,
    });
    expect(() => helpSummary('progress', 'x'.repeat(241), context)).toThrow();
    expect(() => helpSummary('progress', 'sk-test-credential', context)).toThrow();
  });
});
describe('main provider help routing and failure boundaries', () => {
  it('uses main credentials even with a separate Fast Judge; no key in body or snapshot', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary: 'O volume pode variar com séries e repetições.',
                    positives: [],
                    concerns: [],
                    suggestions: [],
                    confidence: 'low',
                  }),
                },
              },
            ],
          }),
        ),
    );
    const session = new IntelligenceSession((c) => createProvider(c, fetcher));
    session.configure(config);
    session.configureFastJudge({
      ...config,
      model: 'judge-model',
      apiKey: 'judge-fixture-not-a-real-key',
    });
    await session.generateInsight(payload);
    const request = fetcher.mock.calls[0]![1]!;
    const body = JSON.parse(request.body as string);
    expect(body.model).toBe('main-model');
    expect(request.headers).toMatchObject({ Authorization: `Bearer ${config.apiKey}` });
    expect(JSON.stringify(body)).not.toContain(config.apiKey);
    expect(JSON.stringify(session.getSnapshot())).not.toContain(config.apiKey);
    expect(() =>
      session.generateInsight({ ...payload, data: { question: config.apiKey } }),
    ).toThrow('credenciais');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('disabled/offline never dispatches and local answers remain available', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const session = new IntelligenceSession((c) => createProvider(c, fetcher));
    await expect(session.generateInsight(payload)).rejects.toMatchObject({ code: 'disabled' });
    session.configure(config);
    vi.stubGlobal('navigator', { onLine: false });
    await expect(session.generateInsight(payload)).rejects.toMatchObject({ code: 'offline' });
    expect(fetcher).not.toHaveBeenCalled();
    expect(localHelp('RIR')).toBeTruthy();
  });
  it.each([401, 429, 500])(
    'sanitizes provider failure %s while retaining local help',
    async (status) => {
      const session = new IntelligenceSession((c) =>
        createProvider(c, async () => new Response('PRIVATE-PROVIDER-BODY', { status })),
      );
      session.configure(config);
      await expect(session.generateInsight(payload)).rejects.not.toThrow('PRIVATE-PROVIDER-BODY');
      expect(localHelp('RIR')).toBeTruthy();
    },
  );
  it('times out main help in 30 seconds with abort, without invoking Fast Judge', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const session = new IntelligenceSession((c) => createProvider(c, fetcher));
    session.configure(config);
    const pending = expect(session.generateInsight(payload)).rejects.toMatchObject({
      code: 'timeout',
    });
    await vi.advanceTimersByTimeAsync(30001);
    await pending;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(localHelp('RIR')).toBeTruthy();
  });
});
