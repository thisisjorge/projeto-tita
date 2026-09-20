import type { EntityId, ISODateTimeString } from '../../domain/common/types.js';

/**
 * All official object stores supported in the 'tita-db' IndexedDB schema.
 */
export type DatabaseStoreName =
  | 'metadata'
  | 'routines'
  | 'exercises'
  | 'activeWorkouts'
  | 'workoutSnapshots'
  | 'measurements'
  | 'programs'
  | 'journal'
  | 'snapshots'
  | 'legacyCompat';

/**
 * Metadata key-value record stored in the 'metadata' store.
 */
export interface MetadataRecord {
  readonly key: string;
  readonly value: unknown;
  readonly updatedAt: ISODateTimeString;
}

/**
 * Journal record used for crash recovery and audit trail in the 'journal' store.
 */
export interface JournalEntry {
  readonly id: EntityId;
  readonly createdAt: ISODateTimeString;
  readonly operation: 'create' | 'update' | 'delete' | 'snapshot';
  readonly store: DatabaseStoreName;
  readonly entityId: EntityId;
  readonly payload?: unknown;
  readonly status: 'pending' | 'committed' | 'rolled_back';
}

/**
 * Point-in-time recovery snapshot stored in the 'snapshots' store.
 */
export interface RecoverySnapshot {
  readonly id: EntityId;
  readonly schemaVersion: number;
  readonly kind: 'migration_preflight' | 'import_preflight' | 'manual' | 'rollback';
  readonly description: string;
  readonly createdAt: ISODateTimeString;
  readonly stores: Record<DatabaseStoreName, unknown[]>;
}

/**
 * Preserved unknown/legacy fields and datasets stored in 'legacyCompat'.
 */
export interface LegacyCompatRecord {
  readonly source: string;
  readonly data: unknown;
  readonly migratedAt: ISODateTimeString;
}

/**
 * Transaction abstraction over IndexedDB transactions.
 */
export interface DatabaseTransaction {
  getStore<T = unknown>(
    storeName: DatabaseStoreName,
  ): {
    get(key: IDBValidKey): Promise<T | null>;
    getAll(): Promise<T[]>;
    put(value: T, key?: IDBValidKey): Promise<void>;
    delete(key: IDBValidKey): Promise<void>;
    clear(): Promise<void>;
  };
}

/**
 * Root database interface for 'tita-db'.
 */
export interface TitaDatabase {
  open(): Promise<void>;
  close(): void;
  isOpen(): boolean;
  transaction<T>(
    storeNames: readonly DatabaseStoreName[],
    mode: 'readonly' | 'readwrite',
    callback: (tx: DatabaseTransaction) => Promise<T>,
  ): Promise<T>;
  createRecoverySnapshot(
    kind: RecoverySnapshot['kind'],
    description: string,
  ): Promise<RecoverySnapshot>;
  restoreSnapshot(snapshotId: EntityId): Promise<void>;
}
