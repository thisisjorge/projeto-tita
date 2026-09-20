import type { EntityId } from '../../domain/common/types.js';
import type { SnapshotRepository } from '../interfaces/snapshot-repository.interface.js';
import type { RecoverySnapshot, TitaDatabase } from '../interfaces/database.interface.js';

export class IdbSnapshotRepository implements SnapshotRepository {
  constructor(private readonly db: TitaDatabase) {}

  async getById(id: EntityId): Promise<RecoverySnapshot | null> {
    return this.db.transaction(['snapshots'], 'readonly', async (tx) => {
      return tx.getStore<RecoverySnapshot>('snapshots').get(id);
    });
  }

  async getAll(): Promise<RecoverySnapshot[]> {
    return this.db.transaction(['snapshots'], 'readonly', async (tx) => {
      const records = await tx.getStore<RecoverySnapshot>('snapshots').getAll();
      return records.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
  }

  async getByKind(kind: RecoverySnapshot['kind']): Promise<RecoverySnapshot[]> {
    const all = await this.getAll();
    return all.filter((s) => s.kind === kind);
  }

  async save(snapshot: RecoverySnapshot): Promise<void> {
    return this.db.transaction(['snapshots'], 'readwrite', async (tx) => {
      await tx.getStore<RecoverySnapshot>('snapshots').put(snapshot);
    });
  }

  async delete(id: EntityId): Promise<void> {
    return this.db.transaction(['snapshots'], 'readwrite', async (tx) => {
      await tx.getStore('snapshots').delete(id);
    });
  }

  async getLatest(): Promise<RecoverySnapshot | null> {
    const all = await this.getAll();
    return all[0] ?? null;
  }
}
