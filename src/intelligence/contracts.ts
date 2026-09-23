import { z } from 'zod';

export const MAX_SUMMARY_BYTES = 12000;
export const MAX_RESPONSE_BYTES = 48000;
export const CONNECTION_TEST_TIMEOUT_MS = 15000;
export const FAST_JUDGE_TIMEOUT_MS = 4500;
export const FULL_INSIGHT_TIMEOUT_MS = 30000;
export const providerConfigSchema = z
  .object({
    provider: z
      .string()
      .min(1)
      .max(60)
      .regex(/^[a-z0-9-]+$/),
    endpoint: z.string().max(300),
    apiKey: z
      .string()
      .trim()
      .min(1)
      .max(512)
      .refine((v) => !/[\r\n]/.test(v)),
    model: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-zA-Z0-9._:/-]+$/),
  })
  .strict();
export type ProviderConfig = z.infer<typeof providerConfigSchema>;
export type InsightKind =
  'progress' | 'weekly' | 'routine' | 'progression' | 'substitution' | 'help';
export interface StructuredSummary {
  version: 1;
  kind: InsightKind;
  data: Record<string, unknown>;
}
const paragraph = z.string().trim().min(1).max(1000);
export const insightSchema = z
  .object({
    summary: paragraph,
    positives: z.array(paragraph).max(5),
    concerns: z.array(paragraph).max(5),
    suggestions: z.array(paragraph).max(5),
    confidence: z.enum(['low', 'medium', 'high']),
  })
  .strict();
export type TrainingInsight = z.infer<typeof insightSchema>;
export const insightJsonSchema = z.toJSONSchema(insightSchema);
export const fastJudgeSchema = z
  .object({
    rankedCandidates: z
      .array(
        z
          .object({
            exerciseId: z.string().min(1).max(120),
            score: z.number().min(0).max(100),
            reason: z.string().trim().min(1).max(240),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();
export type FastJudgeResult = z.infer<typeof fastJudgeSchema>;
export const fastJudgeJsonSchema = z.toJSONSchema(fastJudgeSchema);

export class IntelligenceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'IntelligenceError';
  }
}
export function validateConfiguration(input: ProviderConfig): ProviderConfig {
  const parsed = providerConfigSchema.safeParse(input);
  if (!parsed.success)
    throw new IntelligenceError('configuration', 'Confira provider, chave e modelo.');
  const config = parsed.data;
  {
    let url: URL;
    try {
      url = new URL(config.endpoint);
    } catch {
      throw new IntelligenceError(
        'endpoint',
        'Informe a URL base HTTPS do provider, incluindo /v1 quando necessário.',
      );
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      throw new IntelligenceError(
        'endpoint',
        'Use HTTPS, sem credenciais, parâmetros ou fragmentos na URL.',
      );
    }
    config.endpoint = url.href.replace(/\/$/, '');
  }
  return config;
}
export interface AIProvider {
  readonly id: ProviderConfig['provider'];
  readonly name: string;
  validateConfiguration(): void;
  testConnection(): Promise<void>;
  generateInsight(summary: StructuredSummary): Promise<TrainingInsight>;
  rankCandidates(summary: StructuredSummary): Promise<FastJudgeResult>;
  abort(): void;
}
export function serializeSummary(summary: StructuredSummary): string {
  const json = JSON.stringify(summary);
  if (new TextEncoder().encode(json).byteLength > MAX_SUMMARY_BYTES) {
    throw new IntelligenceError(
      'payload',
      'Resumo muito grande. Selecione um período menor ou uma rotina com menos exercícios.',
    );
  }
  return json;
}
