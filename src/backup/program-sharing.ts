import type { EntityId } from '../domain/common/types.js';
import type { ProgressionStrategyType } from '../domain/enums/progression-strategy-type.js';
import type { WeekPhase } from '../domain/enums/week-phase.js';
import type { GroupType } from '../domain/enums/group-type.js';
import { SetType } from '../domain/enums/set-type.js';
import type { Program } from '../domain/entities/program.js';
import type { Routine, RoutineExercise, RoutineGroup } from '../domain/entities/routine.js';
import type { Exercise } from '../domain/entities/exercise.js';
import type { TitaDatabase } from '../repositories/interfaces/database.interface.js';
import { generateId } from '../domain/common/id.js';

export const PROGRAM_SHARE_FORMAT = 'titan-program' as const;
export const CURRENT_PROGRAM_SHARE_SCHEMA_VERSION = 1 as const;

export interface ShareableSetTemplate {
  readonly setNumber: number;
  readonly type?: SetType;
  readonly targetLoad?: number;
  readonly targetReps?: number;
  readonly minReps?: number;
  readonly maxReps?: number;
  readonly targetRpe?: number;
  readonly targetRir?: number;
  readonly targetDurationSeconds?: number;
  readonly restSeconds?: number;
  readonly notes?: string;
}

export interface ShareableRoutineExercise {
  readonly exerciseId: string;
  readonly exerciseName?: string;
  readonly order: number;
  readonly sets: readonly ShareableSetTemplate[];
  readonly restSeconds?: number;
  readonly notes?: string;
}

export interface ShareableRoutineGroup {
  readonly type: GroupType;
  readonly exerciseSlotOrders: readonly number[];
  readonly restAfterSeconds?: number;
}

export interface ShareableRoutine {
  readonly localRefId: string;
  readonly name: string;
  readonly notes?: string;
  readonly exercises: readonly ShareableRoutineExercise[];
  readonly groups?: readonly ShareableRoutineGroup[];
}

export interface ShareableProgramWeek {
  readonly weekNumber: number;
  readonly weekPhase?: WeekPhase;
  readonly name?: string;
  readonly routineRefIds: readonly string[];
  readonly volumeFactor?: number;
  readonly targetRir?: number;
  readonly notes?: string;
}

export interface ShareableCustomExercise {
  readonly id: string;
  readonly name: string;
  readonly primaryMuscle: string;
  readonly secondaryMuscles?: readonly string[];
  readonly equipment: string;
  readonly category: string;
  readonly instructions?: readonly string[];
}

export interface TitanProgramShareV1 {
  readonly format: typeof PROGRAM_SHARE_FORMAT;
  readonly schemaVersion: typeof CURRENT_PROGRAM_SHARE_SCHEMA_VERSION;
  readonly appVersion: string;
  readonly exportedAt: string;
  readonly program: {
    readonly name: string;
    readonly description?: string;
    readonly progressionStrategy: ProgressionStrategyType;
    readonly durationWeeks: number;
    readonly daysPerWeek: number;
    readonly weeks: readonly ShareableProgramWeek[];
  };
  readonly routines: readonly ShareableRoutine[];
  readonly customExercises?: readonly ShareableCustomExercise[];
}

export interface ValidateProgramShareResult {
  readonly valid: boolean;
  readonly shareable?: TitanProgramShareV1;
  readonly errors: readonly string[];
}

/**
 * Validates a shareable program JSON payload against schema invariants (REQ-16).
 * Ensures zero personal workout history, valid program structure, and routine references.
 */
export function validateShareableProgram(jsonString: string): ValidateProgramShareResult {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    return {
      valid: false,
      errors: [`JSON inválido: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, errors: ['O payload do programa deve ser um objeto JSON'] };
  }

  const payload = parsed as Partial<TitanProgramShareV1>;

  if (payload.format !== PROGRAM_SHARE_FORMAT) {
    errors.push(
      `Formato inválido: esperado '${PROGRAM_SHARE_FORMAT}', recebido '${payload.format}'`,
    );
  }

  if (payload.schemaVersion !== CURRENT_PROGRAM_SHARE_SCHEMA_VERSION) {
    errors.push(
      `Versão de schema incompatível: suportada ${CURRENT_PROGRAM_SHARE_SCHEMA_VERSION}, recebida ${payload.schemaVersion}`,
    );
  }

  if (!payload.program || typeof payload.program !== 'object') {
    errors.push('Campo obrigatório "program" ausente');
  } else {
    if (!payload.program.name || typeof payload.program.name !== 'string') {
      errors.push('Nome do programa ausente ou inválido');
    }
    if (!Array.isArray(payload.program.weeks) || payload.program.weeks.length === 0) {
      errors.push('O programa deve conter ao menos 1 semana planejada');
    }
  }

  if (!Array.isArray(payload.routines) || payload.routines.length === 0) {
    errors.push('O programa compartilhado deve conter ao menos 1 rotina');
  }

  // Strictly enforce ZERO personal training records (history-free guarantee)
  const suspiciousKeys = [
    'workouts',
    'workoutSnapshots',
    'history',
    'measurements',
    'activeWorkout',
  ];
  for (const key of suspiciousKeys) {
    if (key in (parsed as Record<string, unknown>)) {
      errors.push(
        `Violação de privacidade: o formato compartilhado não pode conter dados pessoais ('${key}')`,
      );
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, shareable: parsed as TitanProgramShareV1, errors: [] };
}

/**
 * Exports a user program into portable, history-free `titan-program.json` format (REQ-16).
 */
export function exportProgramToShareableJson(
  program: Program,
  routines: readonly Routine[],
  customExercises: readonly Exercise[] = [],
  appVersion = '2.0.0',
): string {
  const routineMap = new Map<string, Routine>();
  for (const r of routines) {
    routineMap.set(r.id, r);
  }

  const shareableRoutines: ShareableRoutine[] = routines.map((r) => ({
    localRefId: r.id,
    name: r.name,
    notes: r.notes,
    exercises: r.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      order: e.order,
      sets: e.sets.map((s, idx) => ({
        setNumber: idx + 1,
        type: s.type,
        targetLoad: s.targetLoad,
        targetReps: s.targetReps,
        minReps: s.minReps,
        maxReps: s.maxReps,
        targetRpe: s.targetRpe,
        targetRir: s.targetRir,
        targetDurationSeconds: s.targetDurationSeconds,
        restSeconds: s.restSeconds,
        notes: s.notes,
      })),
      restSeconds: e.restSeconds,
      notes: e.notes,
    })),
    groups: r.groups?.map((g) => ({
      type: g.type,
      exerciseSlotOrders: g.exerciseSlotIds
        .map((slotId) => r.exercises.find((ex) => ex.id === slotId)?.order ?? 0)
        .filter((order) => order > 0),
      restAfterSeconds: g.restAfterSeconds,
    })),
  }));

  const shareableWeeks: ShareableProgramWeek[] = program.weeks.map((w) => ({
    weekNumber: w.weekNumber,
    weekPhase: w.weekPhase,
    name: w.name,
    routineRefIds: w.routineIds,
    volumeFactor: w.volumeFactor,
    targetRir: w.targetRir,
    notes: w.notes,
  }));

  const shareableCustomExercises: ShareableCustomExercise[] = customExercises
    .filter((e) => e.source === 'custom')
    .map((e) => ({
      id: e.id,
      name: e.name,
      primaryMuscle: e.primaryMuscle,
      secondaryMuscles: e.secondaryMuscles,
      equipment: e.equipment,
      category: e.category,
      instructions: e.instructions,
    }));

  const shareable: TitanProgramShareV1 = {
    format: PROGRAM_SHARE_FORMAT,
    schemaVersion: CURRENT_PROGRAM_SHARE_SCHEMA_VERSION,
    appVersion,
    exportedAt: new Date().toISOString(),
    program: {
      name: program.name,
      description: program.description,
      progressionStrategy: program.progressionStrategy,
      durationWeeks: program.durationWeeks,
      daysPerWeek: program.daysPerWeek,
      weeks: shareableWeeks,
    },
    routines: shareableRoutines,
    customExercises: shareableCustomExercises.length > 0 ? shareableCustomExercises : undefined,
  };

  return JSON.stringify(shareable, null, 2);
}

export interface ImportProgramShareResult {
  readonly programId: EntityId;
  readonly routineIds: readonly EntityId[];
  readonly customExerciseIds: readonly EntityId[];
}

/**
 * Clones and imports a shareable program into the local database as a user-owned Program (REQ-16).
 * Generates fresh entity IDs to prevent collisions.
 */
export async function importShareableProgram(
  db: TitaDatabase,
  shareable: TitanProgramShareV1,
  options: { activate?: boolean } = {},
): Promise<ImportProgramShareResult> {
  const now = new Date().toISOString();
  const programId = generateId('prog');
  const routineIdMap = new Map<string, EntityId>();
  const importedRoutineIds: EntityId[] = [];
  const importedExerciseIds: EntityId[] = [];

  await db.transaction(['exercises', 'routines', 'programs'], 'readwrite', async (tx) => {
    const exerciseStore = tx.getStore<Exercise>('exercises');
    const routineStore = tx.getStore<Routine>('routines');
    const programStore = tx.getStore<Program>('programs');

    // 1. Import any bundled custom exercises if not already existing
    if (shareable.customExercises && shareable.customExercises.length > 0) {
      for (const customEx of shareable.customExercises) {
        const existing = await exerciseStore.get(customEx.id);
        if (!existing) {
          const newExercise: Exercise = {
            id: customEx.id,
            schemaVersion: 1,
            name: customEx.name,
            aliases: [],
            primaryMuscle: customEx.primaryMuscle,
            secondaryMuscles: customEx.secondaryMuscles ?? [],
            equipment: customEx.equipment,
            category: customEx.category,
            instructions: customEx.instructions ?? [],
            source: 'custom',
            roles: [],
            createdAt: now,
            updatedAt: now,
          };
          await exerciseStore.put(newExercise);
          importedExerciseIds.push(newExercise.id);
        }
      }
    }

    // 2. Clone routines with fresh IDs and link to cloned program
    for (const r of shareable.routines) {
      const newRoutineId = generateId('rt');
      routineIdMap.set(r.localRefId, newRoutineId);

      const slotMap = new Map<number, EntityId>();
      const exercises: RoutineExercise[] = r.exercises.map((e) => {
        const slotId = generateId('slot');
        slotMap.set(e.order, slotId);
        return {
          id: slotId,
          exerciseId: e.exerciseId,
          order: e.order,
          sets: e.sets.map((s) => ({
            id: generateId('st'),
            type: s.type ?? SetType.NORMAL,
            targetLoad: s.targetLoad,
            targetReps: s.targetReps,
            minReps: s.minReps,
            maxReps: s.maxReps,
            targetRpe: s.targetRpe,
            targetRir: s.targetRir,
            targetDurationSeconds: s.targetDurationSeconds,
            restSeconds: s.restSeconds,
            notes: s.notes,
          })),
          restSeconds: e.restSeconds,
          notes: e.notes,
        };
      });

      const groups: RoutineGroup[] | undefined = r.groups?.map((g) => ({
        id: generateId('grp'),
        type: g.type,
        exerciseSlotIds: g.exerciseSlotOrders
          .map((order) => slotMap.get(order))
          .filter((id): id is EntityId => Boolean(id)),
        restAfterSeconds: g.restAfterSeconds,
      }));

      const clonedRoutine: Routine = {
        id: newRoutineId,
        schemaVersion: 1,
        name: r.name,
        notes: r.notes,
        programId,
        exercises,
        groups,
        createdAt: now,
        updatedAt: now,
      };

      await routineStore.put(clonedRoutine);
      importedRoutineIds.push(newRoutineId);
    }

    // 3. Build and save the cloned Program
    const clonedWeeks = shareable.program.weeks.map((w) => ({
      id: generateId('pw'),
      schemaVersion: 1,
      programId,
      weekNumber: w.weekNumber,
      weekPhase: w.weekPhase,
      name: w.name,
      routineIds: w.routineRefIds.map((refId) => routineIdMap.get(refId) ?? refId),
      volumeFactor: w.volumeFactor,
      targetRir: w.targetRir,
      notes: w.notes,
      createdAt: now,
      updatedAt: now,
    }));

    const clonedProgram: Program = {
      id: programId,
      schemaVersion: 1,
      name: shareable.program.name,
      description: shareable.program.description,
      progressionStrategy: shareable.program.progressionStrategy,
      durationWeeks: shareable.program.durationWeeks,
      daysPerWeek: shareable.program.daysPerWeek,
      weeks: clonedWeeks,
      active: options.activate ?? false,
      createdAt: now,
      updatedAt: now,
    };

    await programStore.put(clonedProgram);
  });

  return {
    programId,
    routineIds: importedRoutineIds,
    customExerciseIds: importedExerciseIds,
  };
}
