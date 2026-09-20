import type { EntityId } from '../../domain/common/types.js';
import type { RecoverySnapshot } from './database.interface.js';

export interface SnapshotRepository {
  getById(id: EntityId): Promise<RecoverySnapshot | null>;
  getAll(): Promise<RecoverySnapshot[]>;
  getByKind(kind: RecoverySnapshot['kind']): Promise<RecoverySnapshot[]>;
  save(snapshot: RecoverySnapshot): Promise<void>;
  delete(id: EntityId): Promise<void>;
  getLatest(): Promise<RecoverySnapshot | null>;
}
