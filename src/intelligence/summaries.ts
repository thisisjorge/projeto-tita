import type {
  ExerciseProgressSummary,
  GlobalProgressMetrics,
  PlateauReport,
  WeeklyReview,
} from '../domain/analytics/types.js';
import type { WorkoutSnapshot } from '../domain/entities/workout-snapshot.js';
import type { Routine } from '../domain/entities/routine.js';
import type { Exercise } from '../domain/entities/exercise.js';
import type { ProgressionSuggestion } from '../domain/progression/types.js';
import { type StructuredSummary, serializeSummary } from './contracts.js';

const round = (n: number) => Math.round(n * 100) / 100;
const label = (s: string) => s.slice(0, 100);
function bounded(
  kind: StructuredSummary['kind'],
  data: StructuredSummary['data'],
): StructuredSummary {
  const result = { version: 1 as const, kind, data };
  serializeSummary(result);
  return result;
}
function plateauMetrics(reports: readonly PlateauReport[]) {
  return reports.slice(0, 12).map((p) => ({
    exercise: label(p.exerciseName),
    type: p.type,
    exposures: p.exposuresCount,
    benchmark: round(p.benchmarkValue),
    current: round(p.currentValue),
    changePercent: round(p.changePercent),
  }));
}
export function aggregateEffort(
  snapshots: readonly WorkoutSnapshot[],
  exerciseId: string,
  includedSnapshotIds: ReadonlySet<string>,
) {
  const values: { rpe: number[]; rir: number[] } = { rpe: [], rir: [] };
  for (const snapshot of snapshots) {
    if (!includedSnapshotIds.has(snapshot.id)) continue;
    for (const exercise of snapshot.exercises) {
      if (exercise.exerciseId !== exerciseId) continue;
      for (const set of exercise.sets) {
        if (!set.completed) continue;
        for (const key of ['rpe', 'rir'] as const) {
          const value = set[key];
          if (value !== undefined && Number.isFinite(value)) values[key].push(value);
        }
      }
    }
  }
  return Object.fromEntries(
    Object.entries(values).map(([key, list]) => [
      key,
      {
        count: list.length,
        average: list.length ? round(list.reduce((a, b) => a + b, 0) / list.length) : null,
      },
    ]),
  );
}
export function progressSummary(
  progress: ExerciseProgressSummary,
  global: GlobalProgressMetrics,
  period: string,
  plateaus: readonly PlateauReport[],
  effort?: ReturnType<typeof aggregateEffort>,
): StructuredSummary {
  const months = new Map<
    string,
    {
      month: string;
      sessions: number;
      maxWeightKg: number;
      e1rmKg: number;
      volumeKg: number;
      workingSets: number;
      prs: number;
    }
  >();
  for (const point of progress.historyPoints) {
    const month = point.date.slice(0, 7);
    const item = months.get(month) ?? {
      month,
      sessions: 0,
      maxWeightKg: 0,
      e1rmKg: 0,
      volumeKg: 0,
      workingSets: 0,
      prs: 0,
    };
    item.sessions++;
    item.maxWeightKg = Math.max(item.maxWeightKg, point.maxWeightKg);
    item.e1rmKg = round(Math.max(item.e1rmKg, point.estimated1RM));
    item.volumeKg = round(item.volumeKg + point.totalVolumeKg);
    item.workingSets += point.workingSetsCount;
    if (point.isPR) item.prs++;
    months.set(month, item);
  }
  const best = progress.personalBests;
  return bounded('progress', {
    exercise: label(progress.exerciseName),
    period,
    totalExerciseSessions: progress.totalSessions,
    trainingFrequencyPerWeek: round(global.weeklyFrequency),
    firstSessionDay: progress.firstSessionDate?.slice(0, 10),
    lastSessionDay: progress.lastSessionDate?.slice(0, 10),
    personalBests: {
      loadKg: best.heaviestWeightKg,
      e1rmKg: round(best.bestE1RMKg),
      setVolumeKg: best.bestSetVolumeKg,
      sessionVolumeKg: best.bestSessionVolumeKg,
    },
    monthlyTrend: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
    trendLimit: 'Até os 12 meses mais recentes do período selecionado.',
    plateaus: plateauMetrics(plateaus.filter((p) => p.exerciseId === progress.exerciseId)),
    plateauScope:
      'Heurística local recente; pode abranger sessões anteriores ao período selecionado.',
    effort: effort ?? null,
  });
}
export function weeklySummary(
  week: WeeklyReview,
  plateaus: readonly PlateauReport[],
): StructuredSummary {
  return bounded('weekly', {
    week: week.weekKey,
    workouts: week.totalWorkouts,
    workingSets: week.totalWorkingSets,
    volumeKg: round(week.totalVolumeKg),
    durationMinutes: Math.round(week.totalDurationMs / 60000),
    prsCount: week.totalPRs,
    muscles: week.muscleDistribution.map((m) => ({
      muscle: m.muscle,
      sets: m.sets,
      volumeKg: round(m.volumeKg),
    })),
    prs: week.prsAchieved.slice(0, 12).map((p) => ({
      exercise: label(p.exerciseName),
      category: p.category,
      value: round(p.value),
      unit: p.unit,
    })),
    trends: week.exerciseProgressions.slice(0, 12).map((p) => ({
      exercise: label(p.exerciseName),
      previousE1rm: round(p.previousE1RM),
      currentE1rm: round(p.currentE1RM),
      deltaPercent: round(p.deltaPercent),
    })),
    previousWeek: week.comparisonWithPreviousWeek
      ? {
          workouts: week.comparisonWithPreviousWeek.previousCount,
          volumeKg: round(week.comparisonWithPreviousWeek.previousVolumeKg),
          volumeDeltaPercent: round(week.comparisonWithPreviousWeek.volumeDeltaPercent),
        }
      : null,
    plateaus: plateauMetrics(plateaus),
    detailLimit: 'Até 12 PRs, tendências e alertas; totais preservados.',
  });
}
export function routineSummary(
  routine: Routine,
  exercises: readonly Exercise[],
): StructuredSummary {
  const lookup = new Map(exercises.map((e) => [e.id, e]));
  const muscles: Record<string, number> = {};
  const entries = routine.exercises.map((slot) => {
    const exercise = lookup.get(slot.exerciseId);
    const muscle = exercise?.primaryMuscle ?? 'Não informado';
    muscles[muscle] = (muscles[muscle] ?? 0) + slot.sets.length;
    const loads = slot.sets.filter((s) => s.targetLoad !== undefined && s.targetReps !== undefined);
    return {
      exercise: label(exercise?.name ?? 'Exercício personalizado'),
      muscle,
      sets: slot.sets.length,
      targetReps: slot.sets.map((s) => s.targetReps ?? null),
      plannedVolumeKg: round(loads.reduce((sum, s) => sum + s.targetLoad! * s.targetReps!, 0)),
      setsWithoutFixedLoadAndReps: slot.sets.length - loads.length,
    };
  });
  return bounded('routine', {
    exercises: entries,
    setsByPrimaryMuscle: muscles,
    frequencyPerWeek: null,
    frequencyNote: 'A rotina isolada não informa frequência semanal. Não inferir.',
    volumeNote:
      'Volume estimado apenas para séries com carga e reps fixas; não representa trabalho concluído.',
  });
}
export function progressionSummary(suggestion: ProgressionSuggestion): StructuredSummary {
  return bounded('progression', {
    source: 'Progression Engine determinístico; explicar sem substituir a prescrição.',
    strategy: suggestion.strategyType,
    evidence:
      suggestion.strategyType === 'CUSTOM'
        ? 'Regra personalizada do usuário; descrição pessoal omitida.'
        : suggestion.evidence.slice(0, 900),
    suggestedSets: suggestion.suggestedSets.map((s) => ({
      number: s.setNumber,
      kg: s.weight,
      reps: s.reps,
      rpe: s.targetRpe,
      rir: s.targetRir,
    })),
  });
}
