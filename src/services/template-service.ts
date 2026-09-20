import type { EntityId, ISODateTimeString } from '../domain/common/types.js';
import { generateId } from '../domain/common/id.js';
import type { Program } from '../domain/entities/program.js';
import type { ProgramWeek } from '../domain/entities/program-week.js';
import type { Routine, RoutineExercise } from '../domain/entities/routine.js';
import type { SetTemplate } from '../domain/entities/set-template.js';
import { SetType } from '../domain/enums/set-type.js';
import { WeekPhase } from '../domain/enums/week-phase.js';
import { SEED_TEMPLATES, type ProgramTemplate } from '../data/seed-templates.js';
import type { TitaDatabase } from '../repositories/interfaces/database.interface.js';
import { IdbProgramRepository } from '../repositories/indexeddb/idb-program-repository.js';
import { IdbRoutineRepository } from '../repositories/indexeddb/idb-routine-repository.js';
import { getAppDatabase } from './db-provider.js';

export interface CloneTemplateResult {
  readonly program: Program;
  readonly routines: readonly Routine[];
}

export class TemplateService {
  private readonly db: TitaDatabase;
  private readonly programRepo: IdbProgramRepository;
  private readonly routineRepo: IdbRoutineRepository;

  constructor(db: TitaDatabase = getAppDatabase()) {
    this.db = db;
    this.programRepo = new IdbProgramRepository(db);
    this.routineRepo = new IdbRoutineRepository(db);
  }

  private async ensureDatabaseOpen(): Promise<void> {
    if (!this.db.isOpen()) {
      await this.db.open();
    }
  }

  /**
   * Returns all available built-in program templates.
   */
  getTemplates(): readonly ProgramTemplate[] {
    return SEED_TEMPLATES;
  }

  /**
   * Retrieves a single template by its identifier.
   */
  getTemplateById(id: string): ProgramTemplate | null {
    return SEED_TEMPLATES.find((t) => t.id === id) ?? null;
  }

  /**
   * Clones a built-in template into a user-owned Program and Routines with independent Stable_IDs.
   * Users fully own this copy, which can be modified, reordered, or deleted without affecting the template.
   */
  async cloneTemplateToUserProgram(
    templateId: string,
    customProgramName?: string,
  ): Promise<CloneTemplateResult> {
    await this.ensureDatabaseOpen();

    const template = this.getTemplateById(templateId);
    if (!template) {
      throw new Error(`Modelo de programa '${templateId}' não encontrado.`);
    }

    const now: ISODateTimeString = new Date().toISOString();
    const programId = generateId('prog');

    // 1. Deactivate current active program if exists
    const currentActive = await this.programRepo.getActive();
    if (currentActive) {
      await this.programRepo.save({
        ...currentActive,
        active: false,
        updatedAt: now,
      });
    }

    // 2. Clone routines for this program
    const createdRoutines: Routine[] = [];

    for (let rIdx = 0; rIdx < template.routines.length; rIdx++) {
      const routineTpl = template.routines[rIdx]!;
      const routineId = generateId('rt');

      const routineExercises: RoutineExercise[] = routineTpl.exercises.map((slot, sIdx) => {
        const slotId = generateId('slot');

        const sets: SetTemplate[] = Array.from({ length: slot.targetSets }, () => ({
          id: generateId('st'),
          type: slot.setType ?? SetType.NORMAL,
          minReps: slot.minReps,
          maxReps: slot.maxReps,
          targetReps: slot.minReps === slot.maxReps ? slot.minReps : undefined,
          restSeconds: slot.restSeconds,
          notes: slot.notes,
        }));

        return {
          id: slotId,
          exerciseId: slot.defaultExerciseId,
          order: sIdx,
          sets,
          restSeconds: slot.restSeconds,
          notes: slot.notes,
        };
      });

      const userRoutine: Routine = {
        id: routineId,
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        name: routineTpl.name,
        notes: routineTpl.description,
        programId,
        exercises: routineExercises,
        groups: [],
      };

      createdRoutines.push(userRoutine);
    }

    // 3. Build program weeks
    const weeks: ProgramWeek[] = Array.from({ length: template.durationWeeks }, (_, wIdx) => {
      const isDeload = (wIdx + 1) % 4 === 0; // standard 4th week deload
      return {
        id: generateId('pw'),
        schemaVersion: 1,
        createdAt: now,
        updatedAt: now,
        programId,
        weekNumber: wIdx + 1,
        weekPhase: isDeload ? WeekPhase.DELOAD : WeekPhase.NORMAL,
        name: `Semana ${wIdx + 1}${isDeload ? ' (Deload)' : ''}`,
        routineIds: createdRoutines.map((r) => r.id),
        notes: isDeload ? 'Semana de deload regenerativo' : undefined,
      };
    });

    // 4. Build user program
    const userProgram: Program = {
      id: programId,
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now,
      name: customProgramName?.trim() || template.name,
      description: template.description,
      templateRef: template.id,
      progressionStrategy: template.progressionStrategy,
      durationWeeks: template.durationWeeks,
      daysPerWeek: template.daysPerWeek,
      weeks,
      active: true,
    };

    // 5. Persist program and routines in IndexedDB
    await this.programRepo.save(userProgram);
    await this.routineRepo.saveMany(createdRoutines);

    return {
      program: userProgram,
      routines: createdRoutines,
    };
  }
}
