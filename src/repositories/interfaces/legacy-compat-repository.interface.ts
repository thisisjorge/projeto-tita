import type { LegacyCompatRecord } from './database.interface.js';

export interface LegacyCompatRepository {
  get(source: string): Promise<LegacyCompatRecord | null>;
  getAll(): Promise<LegacyCompatRecord[]>;
  save(record: LegacyCompatRecord): Promise<void>;
  delete(source: string): Promise<void>;
}
