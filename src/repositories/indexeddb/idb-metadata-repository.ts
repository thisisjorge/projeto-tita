import type { MetadataRepository } from '../interfaces/metadata-repository.interface.js';
import type { MetadataRecord, TitaDatabase } from '../interfaces/database.interface.js';

export class IdbMetadataRepository implements MetadataRepository {
  constructor(private readonly db: TitaDatabase) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    return this.db.transaction(['metadata'], 'readonly', async (tx) => {
      const record = await tx.getStore<MetadataRecord>('metadata').get(key);
      return record ? (record.value as T) : null;
    });
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const record: MetadataRecord = {
      key,
      value,
      updatedAt: new Date().toISOString(),
    };
    return this.db.transaction(['metadata'], 'readwrite', async (tx) => {
      await tx.getStore<MetadataRecord>('metadata').put(record);
    });
  }

  async delete(key: string): Promise<void> {
    return this.db.transaction(['metadata'], 'readwrite', async (tx) => {
      await tx.getStore('metadata').delete(key);
    });
  }

  async getAll(): Promise<Record<string, unknown>> {
    return this.db.transaction(['metadata'], 'readonly', async (tx) => {
      const records = await tx.getStore<MetadataRecord>('metadata').getAll();
      const result: Record<string, unknown> = {};
      for (const r of records) {
        result[r.key] = r.value;
      }
      return result;
    });
  }
}
