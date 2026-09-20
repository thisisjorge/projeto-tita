import type { EntityId } from '../../domain/common/types.js';
import type { Routine } from '../../domain/entities/routine.js';
import type { RoutineRepository } from '../interfaces/routine-repository.interface.js';
import type { TitaDatabase } from '../interfaces/database.interface.js';

export class IdbRoutineRepository implements RoutineRepository {
  constructor(private readonly db: TitaDatabase) {}

  async getById(id: EntityId): Promise<Routine | null> {
    return this.db.transaction(['routines'], 'readonly', async (tx) => {
      return tx.getStore<Routine>('routines').get(id);
    });
  }

  async getAll(includeArchived = false): Promise<Routine[]> {
    return this.db.transaction(['routines'], 'readonly', async (tx) => {
      const records = await tx.getStore<Routine>('routines').getAll();
      if (includeArchived) return records;
      return records.filter((r) => !r.deletedAt);
    });
  }

  async getByProgramId(programId: EntityId): Promise<Routine[]> {
    const all = await this.getAll(false);
    return all.filter((r) => r.programId === programId);
  }

  async save(routine: Routine): Promise<void> {
    return this.db.transaction(['routines'], 'readwrite', async (tx) => {
      await tx.getStore<Routine>('routines').put(routine);
    });
  }

  async saveMany(routines: readonly Routine[]): Promise<void> {
    if (routines.length === 0) return;
    return this.db.transaction(['routines'], 'readwrite', async (tx) => {
      const store = tx.getStore<Routine>('routines');
      for (const routine of routines) {
        await store.put(routine);
      }
    });
  }

  async delete(id: EntityId): Promise<void> {
    return this.db.transaction(['routines'], 'readwrite', async (tx) => {
      await tx.getStore('routines').delete(id);
    });
  }
}
