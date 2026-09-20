import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createProvider,
  registerProvider,
  OpenAICompatibleProvider,
  GeminiProvider,
} from '../../src/intelligence/providers.js';
import {
  validateConfiguration,
  type ProviderConfig,
  type StructuredSummary,
  MAX_RESPONSE_BYTES,
} from '../../src/intelligence/contracts.js';
import { IntelligenceSession } from '../../src/intelligence/session.js';
import {
  refineSubstitutions,
  substitutionSummary,
} from '../../src/intelligence/substitution-judge.js';
import { rankSubstitutions } from '../../src/domain/workout/substitution.js';
import { SEED_EXERCISES } from '../../src/data/seed-exercises.js';
import {
  routineSummary,
  progressSummary,
  weeklySummary,
  progressionSummary,
  aggregateEffort,
} from '../../src/intelligence/summaries.js';
import { ActiveWorkoutService } from '../../src/services/active-workout-service.js';
import { ExerciseLibraryService } from '../../src/services/exercise-library-service.js';
import { HistoryService } from '../../src/services/history-service.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import { createTestDatabase } from '../helpers/test-db.js';
import { exportBackup } from '../../src/backup/backup-exporter.js';
import { exportProgramToShareableJson } from '../../src/backup/program-sharing.js';
import { ProgressionStrategyType } from '../../src/domain/enums/progression-strategy-type.js';

const config: ProviderConfig = {
  provider: 'openai-compatible',
  endpoint: 'https://integrate.api.nvidia.com/v1',
  apiKey: 'fixture-key-not-a-real-credential',
  model: 'meta/llama-3.2-1b-instruct',
};
const insight = {
  summary: 'Dados insuficientes para uma tendência.',
  positives: [],
  concerns: [],
  suggestions: ['Mantenha registros consistentes.'],
  confidence: 'low',
};
const summary: StructuredSummary = {
  version: 1,
  kind: 'weekly',
  data: { workouts: 1, volumeKg: 800 },
};
const response = (value: unknown) =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }));
const fetcherFor = (value: unknown) => vi.fn<typeof fetch>(async () => response(value));
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('BYOK adapter contracts', () => {
  it('NVIDIA NIM uses the same OpenAI-compatible adapter and never puts a key in URL/body', async () => {
    const fetcher = fetcherFor(insight);
    const provider = createProvider(config, fetcher);
    expect(provider).toBeInstanceOf(OpenAICompatibleProvider);
    expect(await provider.generateInsight(summary)).toEqual(insight);
    const [url, request] = fetcher.mock.calls[0]!;
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(request?.headers).toMatchObject({ Authorization: `Bearer ${config.apiKey}` });
    expect(request).toMatchObject({
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      referrerPolicy: 'no-referrer',
    });
    const body = JSON.parse(request!.body as string);
    expect(body.model).toBe(config.model);
    expect(body.response_format.type).toBe('json_object');
    expect(body.messages[1].content).toBe(JSON.stringify(summary));
    expect(JSON.stringify(body)).not.toContain(config.apiKey);
  });
  it('supports an arbitrary compatible endpoint and an extensible adapter registry', () => {
    expect(createProvider({ ...config, endpoint: 'https://example.org/custom/v1' })).toBeInstanceOf(
      OpenAICompatibleProvider,
    );
    registerProvider('test-extension', (c, f) => new OpenAICompatibleProvider(c, f));
    expect(createProvider({ ...config, provider: 'test-extension' })).toBeInstanceOf(
      OpenAICompatibleProvider,
    );
    expect(() => createProvider({ ...config, provider: 'unknown' })).toThrow('Adapter');
  });
  it('Gemini uses its native API, header authentication and JSON schema', async () => {
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ thought: true, text: 'omit' }, { text: JSON.stringify(insight) }],
                },
              },
            ],
          }),
        ),
    );
    const provider = new GeminiProvider(
      {
        ...config,
        provider: 'gemini',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-test',
      },
      fetcher,
    );
    expect(await provider.generateInsight(summary)).toEqual(insight);
    const [url, request] = fetcher.mock.calls[0]!;
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent',
    );
    expect(request?.headers).toMatchObject({ 'x-goog-api-key': config.apiKey });
    expect(
      JSON.parse(request!.body as string).generationConfig.responseJsonSchema.properties.summary,
    ).toBeDefined();
  });
  it.each([
    'http://example.org/v1',
    'https://user:pass@example.org',
    'https://example.org?key=x',
    'https://example.org#key',
  ])('rejects unsafe URL %s', (endpoint) => {
    expect(() => validateConfiguration({ ...config, endpoint })).toThrow();
  });
  it.each([401, 403, 404, 429, 500])(
    'sanitizes HTTP %s without exposing error bodies',
    async (status) => {
      const provider = createProvider(
        config,
        vi.fn(async () => new Response(config.apiKey, { status })),
      );
      await expect(provider.generateInsight(summary)).rejects.toMatchObject({
        code: `http-${status}`,
      });
      await expect(provider.generateInsight(summary)).rejects.not.toThrow(config.apiKey);
    },
  );
  it('handles CORS/network errors without leaking sensitive original errors', async () => {
    const provider = createProvider(
      config,
      vi.fn(async () => {
        throw new Error(config.apiKey);
      }),
    );
    await expect(provider.generateInsight(summary)).rejects.toMatchObject({ code: 'network' });
  });
  it.each([
    {},
    { ...insight, unexpected: 'hidden action' },
    { ...insight, summary: '' },
    { ...insight, summary: config.apiKey },
  ])('rejects invalid/unsafe structured response', async (value) => {
    await expect(
      createProvider(config, fetcherFor(value)).generateInsight(summary),
    ).rejects.toMatchObject({ code: 'invalid' });
  });
  it('bounds request and response bytes', async () => {
    const fetcher = fetcherFor(insight);
    await expect(
      createProvider(config, fetcher).generateInsight({
        ...summary,
        data: { text: 'x'.repeat(12001) },
      }),
    ).rejects.toMatchObject({ code: 'payload' });
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      createProvider(
        config,
        vi.fn(async () => new Response('x'.repeat(MAX_RESPONSE_BYTES + 1))),
      ).generateInsight(summary),
    ).rejects.toMatchObject({ code: 'invalid' });
  });
  it('connection test sends no workout information', async () => {
    const fetcher = fetcherFor({ ok: true });
    await createProvider(config, fetcher).testConnection();
    expect(fetcher.mock.calls[0]![1]!.body).not.toContain('volumeKg');
  });
  it('offline prevents any network call', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const fetcher = fetcherFor(insight);
    await expect(createProvider(config, fetcher).generateInsight(summary)).rejects.toMatchObject({
      code: 'offline',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

const bench = SEED_EXERCISES[0]!;
const local = rankSubstitutions(bench, SEED_EXERCISES, { reason: 'occupied' });
const judgeSummary = substitutionSummary(bench, local, SEED_EXERCISES, 'occupied');
const judgeResult = {
  rankedCandidates: local.map((_, i) => ({
    exerciseId: `candidate-${i + 1}`,
    score: i * 10,
    reason: 'Equipamento alternativo.',
  })),
};

describe('Fast Judge routing and safe fallback', () => {
  it('progress/weekly summaries preserve analytics but remove raw sessions, IDs, notes and precise timestamps', async () => {
    const db = createTestDatabase();
    await db.open();
    try {
      await new ExerciseLibraryService(db).initialize();
      const service = new ActiveWorkoutService(db);
      const result = await service.startWorkout({
        title: 'PRIVATE TITLE',
        nowMs: Date.parse('2026-09-17T10:00:00.123Z'),
      });
      if (result.type !== 'started') throw new Error();
      const workout = await service.addExercise(result.workout.id, {
        exerciseId: bench.id,
        exerciseName: bench.name,
        initialSetsCount: 1,
      });
      await service.updateSet(
        workout.id,
        workout.exercises[0]!.id,
        workout.exercises[0]!.sets[0]!.id,
        { completed: true, weight: 60, reps: 8, rpe: 8, rir: 2, notes: 'PRIVATE NOTES' },
      );
      const snapshot = await service.finalizeWorkout(
        workout.id,
        Date.parse('2026-09-17T11:00:00.456Z'),
      );
      const history = new HistoryService(db);
      const progress = await history.getExerciseProgress(bench.id);
      const effort = aggregateEffort([snapshot], bench.id, new Set([snapshot.id]));
      const trend = progressSummary(progress, await history.getGlobalMetrics(), 'ALL', [], effort);
      const weekly = weeklySummary(await history.getWeeklyReview('2026-09-17'), []);
      expect(trend.data.monthlyTrend).toMatchObject([
        { volumeKg: 480, maxWeightKg: 60, workingSets: 1 },
      ]);
      expect(effort).toEqual({ rpe: { count: 1, average: 8 }, rir: { count: 1, average: 2 } });
      expect(weekly.data.volumeKg).toBe(480);
      const json = JSON.stringify([trend, weekly]);
      for (const privateValue of [
        snapshot.id,
        workout.id,
        bench.id,
        'PRIVATE',
        '10:00:00.123',
        '11:00:00.456',
      ])
        expect(json).not.toContain(privateValue);
    } finally {
      db.close();
    }
  });
  it('explains deterministic targets without exposing custom private evidence or changing the suggestion', () => {
    const suggestion = {
      id: 'private-suggestion',
      exerciseId: bench.id,
      strategyType: ProgressionStrategyType.CUSTOM,
      title: 'private-title',
      summary: 'private-summary',
      evidence: 'PRIVATE NOTE',
      suggestedSets: [{ setNumber: 1, weight: 62.5, reps: 8 }],
      status: 'PENDING' as const,
      createdAt: '2026-09-19T10:00:00Z',
    };
    const before = JSON.stringify(suggestion);
    const result = progressionSummary(suggestion);
    expect(result.data.suggestedSets).toEqual([
      { number: 1, kg: 62.5, reps: 8, rpe: undefined, rir: undefined },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE|private-|2026-09-19/);
    expect(JSON.stringify(suggestion)).toBe(before);
  });
  it('defaults to principal provider/key/model, with no second configuration', async () => {
    const fetcher = fetcherFor(judgeResult);
    const session = new IntelligenceSession((c) => createProvider(c, fetcher));
    session.configure(config);
    const result = await refineSubstitutions(judgeSummary, local, undefined, session);
    expect(result.source).toBe('judge');
    expect(result.candidates[0]!.exerciseId).toBe(local.at(-1)!.exerciseId);
    expect(fetcher.mock.calls[0]![0]).toBe(`${config.endpoint}/chat/completions`);
    expect(JSON.parse(fetcher.mock.calls[0]![1]!.body as string).model).toBe(config.model);
  });
  it('routes a separate model through the existing adapter and clears both keys on disable', async () => {
    const fetcher = fetcherFor(judgeResult);
    const session = new IntelligenceSession((c) => createProvider(c, fetcher));
    session.configure(config);
    session.configureFastJudge({
      ...config,
      endpoint: 'https://other.example/v1',
      apiKey: 'second-fixture',
      model: 'fast-model',
    });
    await session.rankCandidates(judgeSummary);
    expect(fetcher.mock.calls[0]![0]).toBe('https://other.example/v1/chat/completions');
    expect(fetcher.mock.calls[0]![1]?.headers).toMatchObject({
      Authorization: 'Bearer second-fixture',
    });
    session.configureFastJudge(null);
    await session.rankCandidates(judgeSummary);
    expect(fetcher.mock.calls[1]![0]).toBe(`${config.endpoint}/chat/completions`);
    session.disable();
    expect(session.getSnapshot()).toMatchObject({ enabled: false, fastJudge: null });
    await expect(session.rankCandidates(judgeSummary)).rejects.toMatchObject({ code: 'disabled' });
    expect(JSON.stringify(session)).not.toContain('fixture');
  });
  it.each([401, 429])('HTTP %s keeps the complete local ranking', async (status) => {
    const session = new IntelligenceSession((c) =>
      createProvider(
        c,
        vi.fn(async () => new Response('', { status })),
      ),
    );
    session.configure(config);
    expect(await refineSubstitutions(judgeSummary, local, undefined, session)).toMatchObject({
      source: 'local',
      candidates: local,
    });
  });
  it.each([
    { rankedCandidates: [{ exerciseId: 'outside-list', score: 100, reason: 'Invalid' }] },
    { rankedCandidates: [{ exerciseId: 'candidate-1', score: 101, reason: 'Invalid' }] },
    { rankedCandidates: [] },
    {
      rankedCandidates: local.map(() => ({
        exerciseId: 'candidate-1',
        score: 50,
        reason: 'Duplicate',
      })),
    },
  ])('rejects invalid IDs/scores/duplicates/incomplete permutations', async (value) => {
    const session = new IntelligenceSession((c) => createProvider(c, fetcherFor(value)));
    session.configure(config);
    expect(await refineSubstitutions(judgeSummary, local, undefined, session)).toMatchObject({
      source: 'local',
      candidates: local,
    });
  });
  it('times out after 4.5 seconds and immediately retains local choices', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>(
      (_, options) =>
        new Promise((_, reject) =>
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Abort', 'AbortError')),
          ),
        ),
    );
    const session = new IntelligenceSession((c) => createProvider(c, fetcher));
    session.configure(config);
    const promise = refineSubstitutions(judgeSummary, local, undefined, session);
    await vi.advanceTimersByTimeAsync(4501);
    expect(await promise).toMatchObject({ source: 'local', candidates: local });
  });
  it('aborts in-flight requests when disabled and uses local ranking with AI off', async () => {
    const fetcher = vi.fn<typeof fetch>(
      (_, options) =>
        new Promise((_, reject) =>
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Abort', 'AbortError')),
          ),
        ),
    );
    const session = new IntelligenceSession((c) => createProvider(c, fetcher));
    expect((await refineSubstitutions(judgeSummary, local, undefined, session)).source).toBe(
      'local',
    );
    expect(fetcher).not.toHaveBeenCalled();
    session.configure(config);
    const promise = refineSubstitutions(judgeSummary, local, undefined, session);
    session.disable();
    expect((await promise).source).toBe('local');
  });
  it('sends only bounded metadata, transient candidate aliases, and no stored identifiers or instructions', () => {
    const json = JSON.stringify(judgeSummary);
    expect(json).not.toContain(bench.id);
    expect(json).not.toContain('instructions');
    expect(json).not.toContain('createdAt');
    expect((judgeSummary.data.candidates as unknown[]).length).toBeLessThanOrEqual(10);
  });
  it('does not persist credentials in the database or backup, and a new session starts disabled', async () => {
    const db = createTestDatabase();
    await db.open();
    try {
      const session = new IntelligenceSession();
      session.configure(config);
      session.configureFastJudge({ ...config, apiKey: 'second-fixture-key' });
      const backup = await exportBackup(db);
      expect(backup.json).not.toContain(config.apiKey);
      expect(backup.json).not.toContain('second-fixture-key');
      const share = exportProgramToShareableJson(
        {
          id: 'program',
          schemaVersion: 1,
          createdAt: '2026-09-19',
          updatedAt: '2026-09-19',
          name: 'Public plan',
          progressionStrategy: ProgressionStrategyType.DOUBLE_PROGRESSION,
          durationWeeks: 1,
          daysPerWeek: 3,
          weeks: [],
          active: true,
        },
        [],
      );
      expect(share).not.toContain(config.apiKey);
      expect(share).not.toContain('second-fixture-key');
      expect(JSON.stringify(session.getSnapshot())).not.toContain(config.apiKey);
      expect(new IntelligenceSession().getSnapshot().enabled).toBe(false);
    } finally {
      db.close();
    }
  });
  it('routine summary omits names, notes and internal IDs while preserving deterministic set counts', () => {
    const result = routineSummary(
      {
        id: 'private-routine',
        name: 'Private Name',
        notes: 'Private Notes',
        schemaVersion: 1,
        createdAt: 'precise-time',
        updatedAt: 'precise-time',
        exercises: [
          {
            id: 'private-slot',
            exerciseId: bench.id,
            order: 1,
            sets: [{ id: 'private-set', type: SetType.NORMAL, targetLoad: 60, targetReps: 8 }],
          },
        ],
      },
      SEED_EXERCISES,
    );
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/Private|private-|precise-time/);
    expect(result.data.setsByPrimaryMuscle).toEqual({ Peito: 1 });
    expect(result.data.frequencyPerWeek).toBeNull();
  });
});
