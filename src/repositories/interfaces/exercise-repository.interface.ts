import type { EntityId } from '../../domain/common/types.js';
import type { Exercise } from '../../domain/entities/exercise.js';

export interface ExerciseRepository {
  getById(id: EntityId): Promise<Exercise | null>;
  getByName(name: string): Promise<Exercise | null>;
  getAll(includeArchived?: boolean): Promise<Exercise[]>;
  save(exercise: Exercise): Promise<void>;
  saveMany(exercises: readonly Exercise[]): Promise<void>;
  delete(id: EntityId): Promise<void>;
}
