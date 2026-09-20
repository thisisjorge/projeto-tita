import type { LegacyCompatRepository } from '../interfaces/legacy-compat-repository.interface.js';
import type { LegacyCompatRecord, TitaDatabase } from '../interfaces/database.interface.js';

export class IdbLegacyCompatRepository implements LegacyCompatRepository {
  constructor(private readonly db: TitaDatabase) {}

  async get(source: string): Promise<LegacyCompatRecord | null> {
    return this.db.transaction(['legacyCompat'], 'readonly', async (tx) => {
      return tx.getStore<LegacyCompatRecord>('legacyCompat').get(source);
    });
  }

  async getAll(): Promise<LegacyCompatRecord[]> {
    return this.db.transaction(['legacyCompat'], 'readonly', async (tx) => {
      return tx.getStore<LegacyCompatRecord>('legacyCompat').getAll();
    });
  }

  async save(record: LegacyCompatRecord): Promise<void> {
    return this.db.transaction(['legacyCompat'], 'readwrite', async (tx) => {
      await tx.getStore<LegacyCompatRecord>('legacyCompat').put(record);
    });
  }

  async delete(source: string): Promise<void> {
    return this.db.transaction(['legacyCompat'], 'readwrite', async (tx) => {
      await tx.getStore('legacyCompat').delete(source);
    });
  }
}
