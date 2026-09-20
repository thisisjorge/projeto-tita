import type { EntityId } from '../../domain/common/types.js';
import type { Program } from '../../domain/entities/program.js';
import type { ProgramRepository } from '../interfaces/program-repository.interface.js';
import type { TitaDatabase } from '../interfaces/database.interface.js';

export class IdbProgramRepository implements ProgramRepository {
  constructor(private readonly db: TitaDatabase) {}

  async getById(id: EntityId): Promise<Program | null> {
    return this.db.transaction(['programs'], 'readonly', async (tx) => {
      return tx.getStore<Program>('programs').get(id);
    });
  }

  async getAll(): Promise<Program[]> {
    return this.db.transaction(['programs'], 'readonly', async (tx) => {
      const records = await tx.getStore<Program>('programs').getAll();
      return records.filter((p) => !p.deletedAt);
    });
  }

  async getActive(): Promise<Program | null> {
    const all = await this.getAll();
    return all.find((p) => p.active) ?? null;
  }

  async save(program: Program): Promise<void> {
    return this.db.transaction(['programs'], 'readwrite', async (tx) => {
      await tx.getStore<Program>('programs').put(program);
    });
  }

  async saveMany(programs: readonly Program[]): Promise<void> {
    if (programs.length === 0) return;
    return this.db.transaction(['programs'], 'readwrite', async (tx) => {
      const store = tx.getStore<Program>('programs');
      for (const p of programs) {
        await store.put(p);
      }
    });
  }

  async delete(id: EntityId): Promise<void> {
    return this.db.transaction(['programs'], 'readwrite', async (tx) => {
      await tx.getStore('programs').delete(id);
    });
  }
}
