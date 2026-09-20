import type { EntityId } from '../../domain/common/types.js';
import type { Exercise } from '../../domain/entities/exercise.js';
import type { ExerciseRepository } from '../interfaces/exercise-repository.interface.js';
import type { TitaDatabase } from '../interfaces/database.interface.js';

export class IdbExerciseRepository implements ExerciseRepository {
  constructor(private readonly db: TitaDatabase) {}

  async getById(id: EntityId): Promise<Exercise | null> {
    return this.db.transaction(['exercises'], 'readonly', async (tx) => {
      return tx.getStore<Exercise>('exercises').get(id);
    });
  }

  async getByName(name: string): Promise<Exercise | null> {
    const all = await this.getAll(true);
    const normalized = name.trim().toLowerCase();
    return (
      all.find(
        (ex) =>
          ex.name.trim().toLowerCase() === normalized ||
          ex.aliases.some((a) => a.trim().toLowerCase() === normalized),
      ) ?? null
    );
  }

  async getAll(includeArchived = false): Promise<Exercise[]> {
    return this.db.transaction(['exercises'], 'readonly', async (tx) => {
      const records = await tx.getStore<Exercise>('exercises').getAll();
      if (includeArchived) return records;
      return records.filter((r) => !r.deletedAt);
    });
  }

  async save(exercise: Exercise): Promise<void> {
    return this.db.transaction(['exercises'], 'readwrite', async (tx) => {
      await tx.getStore<Exercise>('exercises').put(exercise);
    });
  }

  async saveMany(exercises: readonly Exercise[]): Promise<void> {
    if (exercises.length === 0) return;
    return this.db.transaction(['exercises'], 'readwrite', async (tx) => {
      const store = tx.getStore<Exercise>('exercises');
      for (const exercise of exercises) {
        await store.put(exercise);
      }
    });
  }

  async delete(id: EntityId): Promise<void> {
    return this.db.transaction(['exercises'], 'readwrite', async (tx) => {
      await tx.getStore('exercises').delete(id);
    });
  }
}
