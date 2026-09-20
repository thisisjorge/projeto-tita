import type { EntityId } from '../../domain/common/types.js';
import type { Program } from '../../domain/entities/program.js';

export interface ProgramRepository {
  getById(id: EntityId): Promise<Program | null>;
  getAll(): Promise<Program[]>;
  getActive(): Promise<Program | null>;
  save(program: Program): Promise<void>;
  saveMany(programs: readonly Program[]): Promise<void>;
  delete(id: EntityId): Promise<void>;
}
