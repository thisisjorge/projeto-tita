import type { EntityId } from '../../domain/common/types.js';
import type { Routine } from '../../domain/entities/routine.js';

export interface RoutineRepository {
  getById(id: EntityId): Promise<Routine | null>;
  getAll(includeArchived?: boolean): Promise<Routine[]>;
  getByProgramId(programId: EntityId): Promise<Routine[]>;
  save(routine: Routine): Promise<void>;
  saveMany(routines: readonly Routine[]): Promise<void>;
  delete(id: EntityId): Promise<void>;
}
