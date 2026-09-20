import type { EntityId } from '../../domain/common/types.js';
import type { JournalEntry } from './database.interface.js';

export interface JournalRepository {
  append(entry: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry>;
  getAll(): Promise<JournalEntry[]>;
  getByStatus(status: JournalEntry['status']): Promise<JournalEntry[]>;
  markStatus(id: EntityId, status: JournalEntry['status']): Promise<void>;
  clear(): Promise<void>;
}
