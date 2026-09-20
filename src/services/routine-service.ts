import type { EntityId, ISODateTimeString } from '../domain/common/types.js';
import { generateId } from '../domain/common/id.js';
import type { Routine, RoutineExercise, RoutineGroup } from '../domain/entities/routine.js';
import type { SetTemplate } from '../domain/entities/set-template.js';
import { SetType } from '../domain/enums/set-type.js';
import type { ProgressionStrategyType } from '../domain/enums/progression-strategy-type.js';
import { validateRoutine } from '../domain/validators/routine-validator.js';
import type { TitaDatabase } from '../repositories/interfaces/database.interface.js';
import { IdbRoutineRepository } from '../repositories/indexeddb/idb-routine-repository.js';
import { getAppDatabase } from './db-provider.js';

export interface SetTemplateInput {
  type?: SetType;
  targetLoad?: number;
  targetReps?: number;
  minReps?: number;
  maxReps?: number;
  targetRpe?: number;
  targetRir?: number;
  targetDurationSeconds?: number;
  restSeconds?: number;
  notes?: string;
}

export interface RoutineExerciseInput {
  id?: EntityId;
  exerciseId: EntityId;
  restSeconds?: number;
  notes?: string;
  progressionStrategy?: ProgressionStrategyType;
  sets?: SetTemplateInput[];
}

export interface CreateRoutineInput {
  name: string;
  notes?: string;
  programId?: EntityId;
  defaultProgressionStrategy?: ProgressionStrategyType;
  exercises?: RoutineExerciseInput[];
  groups?: RoutineGroup[];
}

export interface UpdateRoutineInput {
  name?: string;
  notes?: string;
  programId?: EntityId;
  defaultProgressionStrategy?: ProgressionStrategyType;
  exercises?: RoutineExerciseInput[];
  groups?: RoutineGroup[];
}

export class RoutineService {
  private readonly db: TitaDatabase;
  private readonly routineRepo: IdbRoutineRepository;

  constructor(db: TitaDatabase = getAppDatabase()) {
    this.db = db;
    this.routineRepo = new IdbRoutineRepository(db);
  }

  private async ensureDatabaseOpen(): Promise<void> {
    if (!this.db.isOpen()) {
      await this.db.open();
    }
  }

  /**
   * Retrieves routines, optionally including soft-deleted (archived) ones.
   */
  async getRoutines(options?: { includeArchived?: boolean }): Promise<Routine[]> {
    await this.ensureDatabaseOpen();
    return this.routineRepo.getAll(options?.includeArchived ?? false);
  }

  /**
   * Retrieves a single routine by its Stable_ID.
   */
  async getRoutineById(id: EntityId): Promise<Routine | null> {
    await this.ensureDatabaseOpen();
    return this.routineRepo.getById(id);
  }

  /**
   * Creates a new routine, validating domain invariants.
   */
  async createRoutine(input: CreateRoutineInput): Promise<Routine> {
    await this.ensureDatabaseOpen();

    const now: ISODateTimeString = new Date().toISOString();
    const routineId = generateId('rt');

    const formattedExercises: RoutineExercise[] = (input.exercises ?? []).map((slotInput, idx) => {
      const slotId = slotInput.id ?? generateId('slot');
      const setsInput =
        slotInput.sets && slotInput.sets.length > 0
          ? slotInput.sets
          : [{ type: SetType.NORMAL, targetReps: 10 }];

      const formattedSets: SetTemplate[] = setsInput.map((s) => ({
        id: generateId('st'),
        type: s.type ?? SetType.NORMAL,
        targetLoad: s.targetLoad,
        targetReps: s.targetReps,
        minReps: s.minReps,
        maxReps: s.maxReps,
        targetRpe: s.targetRpe,
        targetRir: s.targetRir,
        targetDurationSeconds: s.targetDurationSeconds,
        restSeconds: s.restSeconds ?? slotInput.restSeconds ?? 90,
        notes: s.notes,
      }));

      return {
        id: slotId,
        exerciseId: slotInput.exerciseId,
        order: idx,
        sets: formattedSets,
        restSeconds: slotInput.restSeconds ?? 90,
        notes: slotInput.notes,
        progressionStrategy: slotInput.progressionStrategy ?? input.defaultProgressionStrategy,
      };
    });

    const newRoutine: Routine = {
      id: routineId,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      name: input.name.trim(),
      notes: input.notes?.trim(),
      programId: input.programId,
      exercises: formattedExercises,
      groups: input.groups ?? [],
      defaultProgressionStrategy: input.defaultProgressionStrategy,
    };

    const validation = validateRoutine(newRoutine);
    if (!validation.valid) {
      throw new Error(`Dados de rotina inválidos: ${validation.errors.join(', ')}`);
    }

    await this.routineRepo.save(newRoutine);
    return newRoutine;
  }

  /**
   * Updates an existing routine.
   */
  async updateRoutine(id: EntityId, input: UpdateRoutineInput): Promise<Routine> {
    await this.ensureDatabaseOpen();

    const existing = await this.routineRepo.getById(id);
    if (!existing) {
      throw new Error(`Rotina com ID '${id}' não encontrada.`);
    }

    const now: ISODateTimeString = new Date().toISOString();

    let updatedExercises = existing.exercises;
    if (input.exercises !== undefined) {
      updatedExercises = input.exercises.map((slotInput, idx) => {
        const slotId = slotInput.id ?? generateId('slot');
        const setsInput =
          slotInput.sets && slotInput.sets.length > 0
            ? slotInput.sets
            : [{ type: SetType.NORMAL, targetReps: 10 }];

        const formattedSets: SetTemplate[] = setsInput.map((s) => ({
          id: generateId('st'),
          type: s.type ?? SetType.NORMAL,
          targetLoad: s.targetLoad,
          targetReps: s.targetReps,
          minReps: s.minReps,
          maxReps: s.maxReps,
          targetRpe: s.targetRpe,
          targetRir: s.targetRir,
          targetDurationSeconds: s.targetDurationSeconds,
          restSeconds: s.restSeconds ?? slotInput.restSeconds ?? 90,
          notes: s.notes,
        }));

        return {
          id: slotId,
          exerciseId: slotInput.exerciseId,
          order: idx,
          sets: formattedSets,
          restSeconds: slotInput.restSeconds ?? 90,
          notes: slotInput.notes,
          progressionStrategy:
            slotInput.progressionStrategy !== undefined
              ? slotInput.progressionStrategy
              : input.defaultProgressionStrategy !== undefined
                ? input.defaultProgressionStrategy
                : existing.defaultProgressionStrategy,
        };
      });
    }

    const updated: Routine = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      notes: input.notes !== undefined ? input.notes.trim() : existing.notes,
      programId: input.programId !== undefined ? input.programId : existing.programId,
      exercises: updatedExercises,
      groups: input.groups !== undefined ? input.groups : existing.groups,
      defaultProgressionStrategy:
        input.defaultProgressionStrategy !== undefined
          ? input.defaultProgressionStrategy
          : existing.defaultProgressionStrategy,
      updatedAt: now,
    };

    const validation = validateRoutine(updated);
    if (!validation.valid) {
      throw new Error(`Atualização de rotina inválida: ${validation.errors.join(', ')}`);
    }

    await this.routineRepo.save(updated);
    return updated;
  }

  /**
   * Duplicates a routine, creating a deep copy with fresh Stable_IDs for all slots and sets.
   */
  async duplicateRoutine(id: EntityId, newName?: string): Promise<Routine> {
    await this.ensureDatabaseOpen();

    const original = await this.routineRepo.getById(id);
    if (!original) {
      throw new Error(`Rotina com ID '${id}' não encontrada para duplicação.`);
    }

    const now: ISODateTimeString = new Date().toISOString();
    const clonedId = generateId('rt');

    // Map old slot IDs to new slot IDs to preserve group references
    const slotIdMap = new Map<EntityId, EntityId>();

    const clonedExercises: RoutineExercise[] = original.exercises.map((slot) => {
      const newSlotId = generateId('slot');
      slotIdMap.set(slot.id, newSlotId);

      const newSets: SetTemplate[] = slot.sets.map((s) => ({
        ...s,
        id: generateId('st'),
      }));

      return {
        ...slot,
        id: newSlotId,
        sets: newSets,
      };
    });

    const clonedGroups: RoutineGroup[] = (original.groups ?? []).map((grp) => ({
      id: generateId('grp'),
      type: grp.type,
      exerciseSlotIds: grp.exerciseSlotIds.map((oldId) => slotIdMap.get(oldId) ?? oldId),
      restAfterSeconds: grp.restAfterSeconds,
    }));

    const clonedRoutine: Routine = {
      id: clonedId,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      name: newName ? newName.trim() : `${original.name} (Cópia)`,
      notes: original.notes,
      programId: original.programId,
      exercises: clonedExercises,
      groups: clonedGroups,
    };

    const validation = validateRoutine(clonedRoutine);
    if (!validation.valid) {
      throw new Error(`Erro ao duplicar rotina: ${validation.errors.join(', ')}`);
    }

    await this.routineRepo.save(clonedRoutine);
    return clonedRoutine;
  }

  /**
   * Archives a routine (soft delete). Past WorkoutSnapshots referencing this routine remain valid and unharmed.
   */
  async archiveRoutine(id: EntityId): Promise<Routine> {
    await this.ensureDatabaseOpen();

    const existing = await this.routineRepo.getById(id);
    if (!existing) {
      throw new Error(`Rotina com ID '${id}' não encontrada para arquivamento.`);
    }

    const now: ISODateTimeString = new Date().toISOString();
    const archived: Routine = {
      ...existing,
      deletedAt: now,
      updatedAt: now,
    };

    await this.routineRepo.save(archived);
    return archived;
  }

  /**
   * Restores an archived routine.
   */
  async restoreRoutine(id: EntityId): Promise<Routine> {
    await this.ensureDatabaseOpen();

    // Must fetch including archived
    const all = await this.routineRepo.getAll(true);
    const existing = all.find((r) => r.id === id);
    if (!existing) {
      throw new Error(`Rotina com ID '${id}' não encontrada para restauração.`);
    }

    const now: ISODateTimeString = new Date().toISOString();
    const restored: Routine = {
      ...existing,
      deletedAt: undefined,
      updatedAt: now,
    };

    await this.routineRepo.save(restored);
    return restored;
  }

  /**
   * Reorders exercises within a routine by updating their sequence indices.
   */
  async reorderExercises(routineId: EntityId, slotIds: EntityId[]): Promise<Routine> {
    await this.ensureDatabaseOpen();

    const existing = await this.routineRepo.getById(routineId);
    if (!existing) {
      throw new Error(`Rotina com ID '${routineId}' não encontrada.`);
    }

    const slotMap = new Map<EntityId, RoutineExercise>();
    for (const slot of existing.exercises) {
      slotMap.set(slot.id, slot);
    }

    const reordered: RoutineExercise[] = [];
    for (let i = 0; i < slotIds.length; i++) {
      const slotId = slotIds[i]!;
      const slot = slotMap.get(slotId);
      if (slot) {
        reordered.push({
          ...slot,
          order: i,
        });
        slotMap.delete(slotId);
      }
    }

    // Append any slots not in slotIds at the end
    let nextOrder = reordered.length;
    for (const remaining of slotMap.values()) {
      reordered.push({
        ...remaining,
        order: nextOrder++,
      });
    }

    const updated: Routine = {
      ...existing,
      exercises: reordered,
      updatedAt: new Date().toISOString(),
    };

    await this.routineRepo.save(updated);
    return updated;
  }

  /**
   * Permanently deletes a routine from the local database.
   */
  async deleteRoutine(id: EntityId): Promise<void> {
    await this.ensureDatabaseOpen();
    await this.routineRepo.delete(id);
  }
}
