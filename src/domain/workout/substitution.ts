import type { Exercise } from '../entities/exercise.js';
import type { ActiveWorkout } from '../entities/active-workout.js';
import type { ExerciseSet } from '../entities/exercise-set.js';
import { WorkoutStatus } from '../enums/workout-status.js';
import { generateId } from '../common/id.js';

export const SUBSTITUTION_REASONS = {
  occupied: 'Máquina ocupada',
  unavailable: 'Sem equipamento',
  alternative: 'Quero alternativa',
} as const;
export type SubstitutionReason = keyof typeof SUBSTITUTION_REASONS;
export interface ExerciseSubstitution {
  readonly fromExerciseId: string;
  readonly toExerciseId: string;
  readonly fromSlotId: string;
  readonly toSlotId: string;
  readonly reason: SubstitutionReason;
  readonly timestamp: string;
  readonly completedSetsBeforeSwap: number;
}
export interface SubstitutionCandidate {
  exerciseId: string;
  localScore: number;
  equivalence: 'high' | 'partial';
  reasons: string[];
}
const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR');
/** Resolve the two pre-catalog quick-workout IDs without rewriting saved history. */
export function substitutionCatalogId(id: string): string {
  return (
    (
      {
        'bench-press': '00000000-0000-4000-8000-000000000001',
        'lat-pulldown': '00000000-0000-4000-8000-000000000007',
      } as Record<string, string>
    )[id] ?? id
  );
}
export function sameMovement(a: Exercise, b: Exercise): boolean {
  return (
    normalize(a.primaryMuscle) === normalize(b.primaryMuscle) &&
    a.roles.some((role) => b.roles.includes(role))
  );
}

/** Catalog roles are broad: these are general alternatives, not identical biomechanics. */
export function rankSubstitutions(
  current: Exercise,
  catalog: readonly Exercise[],
  options: {
    reason: SubstitutionReason;
    excludedIds?: readonly string[];
    availableEquipment?: readonly string[];
    favoriteIds?: readonly string[];
    limit?: number;
  },
): SubstitutionCandidate[] {
  const excluded = new Set([current.id, ...(options.excludedIds ?? [])].map(substitutionCatalogId));
  const equipment = options.availableEquipment?.map(normalize);
  const seen = new Set<string>();
  return catalog
    .flatMap((candidate): SubstitutionCandidate[] => {
      if (excluded.has(candidate.id) || candidate.deletedAt || seen.has(candidate.id)) return [];
      seen.add(candidate.id);
      const sameEquipment = normalize(current.equipment) === normalize(candidate.equipment);
      if (equipment && !equipment.includes(normalize(candidate.equipment))) return [];
      if (options.reason !== 'alternative' && sameEquipment) return [];
      const muscle = normalize(candidate.primaryMuscle) === normalize(current.primaryMuscle);
      const role = current.roles.some((r) => candidate.roles.includes(r));
      if (!muscle && !role) return [];
      const secondary = current.secondaryMuscles.filter((m) =>
        candidate.secondaryMuscles.map(normalize).includes(normalize(m)),
      ).length;
      const reasons = [
        muscle ? 'Mesmo músculo principal' : 'Músculo principal diferente: revise a escolha',
        role
          ? 'Mesmo papel de movimento no catálogo'
          : 'Padrão diferente: muda o estímulo da rotina',
        sameEquipment ? 'Usa o mesmo equipamento' : 'Equipamento diferente',
      ];
      return [
        {
          exerciseId: candidate.id,
          localScore: Math.min(
            100,
            (muscle ? 40 : 0) +
              (role ? 35 : 0) +
              Math.min(6, secondary * 3) +
              (normalize(current.category) === normalize(candidate.category) ? 5 : 0) +
              (!sameEquipment ? 10 : 0) +
              (options.favoriteIds?.includes(candidate.id) ? 4 : 0),
          ),
          equivalence: muscle && role ? 'high' : 'partial',
          reasons,
        },
      ];
    })
    .sort((a, b) => b.localScore - a.localScore || a.exerciseId.localeCompare(b.exerciseId))
    .slice(0, Math.max(1, Math.min(10, options.limit ?? 5)));
}

export function substituteFutureSets(
  workout: ActiveWorkout,
  slotId: string,
  current: Exercise,
  replacement: Exercise,
  reason: SubstitutionReason,
  previousSets: readonly ExerciseSet[],
  nowMs: number,
): ActiveWorkout {
  const index = workout.exercises.findIndex((s) => s.id === slotId);
  const slot = workout.exercises[index];
  if (
    !slot ||
    slot.exerciseId !== current.id ||
    (workout.status !== WorkoutStatus.IN_PROGRESS && workout.status !== WorkoutStatus.PAUSED)
  )
    throw new Error('Sessão ou exercício não disponível para troca.');
  if (
    !Object.hasOwn(SUBSTITUTION_REASONS, reason) ||
    replacement.deletedAt ||
    workout.exercises.some((s) => substitutionCatalogId(s.exerciseId) === replacement.id)
  )
    throw new Error('Escolha outro exercício disponível que ainda não esteja na sessão.');
  const completed = slot.sets.filter((s) => s.completed);
  const future = slot.sets.filter((s) => !s.completed);
  if (!future.length) throw new Error('Não há séries futuras para trocar.');
  const timestamp = new Date(nowMs).toISOString();
  const newId = generateId('slot');
  const sets = future.map((set, i): ExerciseSet => {
    const history = previousSets.filter((s) => s.completed && s.type === set.type);
    const previous = history[i] ?? history[history.length - 1];
    return {
      id: generateId('set'),
      setNumber: i + 1,
      type: set.type,
      completed: false,
      weight: previous?.weight,
      reps: sameMovement(current, replacement) ? set.reps : previous?.reps,
      restTargetSeconds: replacement.defaultRestSeconds ?? slot.targetRestSeconds,
      groupId: set.groupId,
    };
  });
  const replacementSlot = {
    id: newId,
    exerciseId: replacement.id,
    exerciseName: replacement.name,
    order: slot.order,
    sets,
    targetRestSeconds: replacement.defaultRestSeconds ?? slot.targetRestSeconds,
  };
  const exercises = [...workout.exercises];
  exercises.splice(
    index,
    1,
    ...(completed.length ? [{ ...slot, sets: completed }] : []),
    replacementSlot,
  );
  return {
    ...workout,
    updatedAt: timestamp,
    exercises: exercises.map((e, i) => ({ ...e, order: i + 1 })),
    groups: workout.groups?.map((g) => ({
      ...g,
      exerciseSlotIds: g.exerciseSlotIds.map((id) => (id === slotId ? newId : id)),
    })),
    substitutions: [
      ...(workout.substitutions ?? []),
      {
        fromExerciseId: current.id,
        toExerciseId: replacement.id,
        fromSlotId: slotId,
        toSlotId: newId,
        reason,
        timestamp,
        completedSetsBeforeSwap: completed.length,
      },
    ],
  };
}
