import type { EntityId } from '../../domain/common/types.js';
import { generateId } from '../../domain/common/id.js';
import type { JournalRepository } from '../interfaces/journal-repository.interface.js';
import type { JournalEntry, TitaDatabase } from '../interfaces/database.interface.js';

export class IdbJournalRepository implements JournalRepository {
  constructor(private readonly db: TitaDatabase) {}

  async append(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry> {
    const journalEntry: JournalEntry = {
      ...entry,
      id: generateId('jrn'),
      createdAt: new Date().toISOString(),
    };

    await this.db.transaction(['journal'], 'readwrite', async (tx) => {
      await tx.getStore<JournalEntry>('journal').put(journalEntry);
    });

    return journalEntry;
  }

  async getAll(): Promise<JournalEntry[]> {
    return this.db.transaction(['journal'], 'readonly', async (tx) => {
      const records = await tx.getStore<JournalEntry>('journal').getAll();
      return records.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    });
  }

  async getByStatus(status: JournalEntry['status']): Promise<JournalEntry[]> {
    const all = await this.getAll();
    return all.filter((e) => e.status === status);
  }

  async markStatus(id: EntityId, status: JournalEntry['status']): Promise<void> {
    return this.db.transaction(['journal'], 'readwrite', async (tx) => {
      const store = tx.getStore<JournalEntry>('journal');
      const existing = await store.get(id);
      if (existing) {
        await store.put({ ...existing, status });
      }
    });
  }

  async clear(): Promise<void> {
    return this.db.transaction(['journal'], 'readwrite', async (tx) => {
      await tx.getStore('journal').clear();
    });
  }
}
