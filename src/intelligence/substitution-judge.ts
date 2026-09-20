import type { Exercise } from '../domain/entities/exercise.js';
import {
  SUBSTITUTION_REASONS,
  type SubstitutionReason,
  type SubstitutionCandidate,
} from '../domain/workout/substitution.js';
import {
  fastJudgeSchema,
  IntelligenceError,
  serializeSummary,
  type StructuredSummary,
} from './contracts.js';
import { intelligenceSession, type IntelligenceSession } from './session.js';

/** Public catalog IDs only; custom exercises use transient request aliases. No session IDs. */
export function substitutionSummary(
  current: Exercise,
  candidates: readonly SubstitutionCandidate[],
  catalog: readonly Exercise[],
  reason: SubstitutionReason,
): StructuredSummary {
  const metadata = (e: Exercise) => ({
    name: e.name.slice(0, 100),
    primaryMuscle: e.primaryMuscle.slice(0, 60),
    secondaryMuscles: e.secondaryMuscles.slice(0, 6).map((m) => m.slice(0, 60)),
    equipment: e.equipment.slice(0, 80),
    roles: e.roles,
    category: e.category.slice(0, 60),
  });
  const summary: StructuredSummary = {
    version: 1,
    kind: 'substitution',
    data: {
      current: metadata(current),
      reason: SUBSTITUTION_REASONS[reason],
      context:
        'Substituir apenas séries futuras, preservando o objetivo muscular e o papel de movimento. Sem contexto médico.',
      candidates: candidates.slice(0, 10).map((c, i) => {
        const exercise = catalog.find((e) => e.id === c.exerciseId)!;
        return {
          exerciseId: `candidate-${i + 1}`,
          ...metadata(exercise),
          localScore: c.localScore,
          equivalence: c.equivalence,
        };
      }),
    },
  };
  serializeSummary(summary);
  return summary;
}
export interface JudgedCandidate extends SubstitutionCandidate {
  judgeReason?: string;
  judgeScore?: number;
}
export async function refineSubstitutions(
  summary: StructuredSummary,
  local: readonly SubstitutionCandidate[],
  signal?: AbortSignal,
  session: IntelligenceSession = intelligenceSession,
): Promise<{ candidates: JudgedCandidate[]; source: 'local' | 'judge'; notice: string }> {
  try {
    const result = fastJudgeSchema.parse(await session.rankCandidates(summary, signal));
    const ids = new Set<string>();
    const ranked = result.rankedCandidates.map((item) => {
      const index = local.findIndex((_, i) => item.exerciseId === `candidate-${i + 1}`);
      if (index < 0 || ids.has(item.exerciseId))
        throw new IntelligenceError('invalid', 'Ranking inválido.');
      ids.add(item.exerciseId);
      return { ...local[index]!, judgeReason: item.reason, judgeScore: item.score };
    });
    // Require a full permutation: the judge cannot silently suppress local choices.
    if (ranked.length !== local.length)
      throw new IntelligenceError('invalid', 'Ranking incompleto.');
    ranked.sort((a, b) => b.judgeScore - a.judgeScore);
    return {
      candidates: ranked,
      source: 'judge',
      notice: 'Ordem refinada pelo Fast Judge. A escolha continua sendo sua.',
    };
  } catch {
    return {
      candidates: [...local],
      source: 'local',
      notice: 'Refinamento indisponível. Sugestões locais mantidas.',
    };
  }
}
