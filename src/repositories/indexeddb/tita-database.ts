import type { EntityId, ISODateTimeString } from '../../domain/common/types.js';
import { generateId } from '../../domain/common/id.js';
import type {
  DatabaseStoreName,
  DatabaseTransaction,
  RecoverySnapshot,
  TitaDatabase,
} from '../interfaces/database.interface.js';

export const DATABASE_NAME = 'tita-db';
export const DATABASE_VERSION = 1;

export const ALL_STORE_NAMES: readonly DatabaseStoreName[] = [
  'metadata',
  'routines',
  'exercises',
  'activeWorkouts',
  'workoutSnapshots',
  'measurements',
  'programs',
  'journal',
  'snapshots',
  'legacyCompat',
] as const;

export interface TitaDatabaseOptions {
  readonly idbFactory?: IDBFactory;
  readonly dbName?: string;
  readonly version?: number;
}

export class IndexedDBTitaDatabase implements TitaDatabase {
  private readonly factory: IDBFactory;
  private readonly dbName: string;
  private readonly version: number;
  private db: IDBDatabase | null = null;

  constructor(options?: TitaDatabaseOptions) {
    this.factory =
      options?.idbFactory ??
      (typeof globalThis !== 'undefined' && 'indexedDB' in globalThis
        ? globalThis.indexedDB
        : (undefined as unknown as IDBFactory));
    this.dbName = options?.dbName ?? DATABASE_NAME;
    this.version = options?.version ?? DATABASE_VERSION;

    if (!this.factory) {
      throw new Error(
        'IndexedDB is not available in the current environment. Please supply an IDBFactory instance.',
      );
    }
  }

  isOpen(): boolean {
    return this.db !== null;
  }

  async open(): Promise<void> {
    if (this.db) return;

    return new Promise<void>((resolve, reject) => {
      const request = this.factory.open(this.dbName, this.version);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        this.upgradeSchema(db, event.oldVersion, event.newVersion ?? this.version);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.db.onversionchange = () => {
          this.close();
        };
        resolve();
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open IndexedDB database'));
      };

      request.onblocked = () => {
        // Handled gracefully
      };
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  private upgradeSchema(db: IDBDatabase, _oldVersion: number, _newVersion: number): void {
    // 1. metadata (key is the keyPath)
    if (!db.objectStoreNames.contains('metadata')) {
      db.createObjectStore('metadata', { keyPath: 'key' });
    }

    // 2. routines
    if (!db.objectStoreNames.contains('routines')) {
      const store = db.createObjectStore('routines', { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });
      store.createIndex('deletedAt', 'deletedAt', { unique: false });
      store.createIndex('programId', 'programId', { unique: false });
    }

    // 3. exercises
    if (!db.objectStoreNames.contains('exercises')) {
      const store = db.createObjectStore('exercises', { keyPath: 'id' });
      store.createIndex('name', 'name', { unique: false });
      store.createIndex('normalizedName', 'normalizedName', { unique: false });
      store.createIndex('deletedAt', 'deletedAt', { unique: false });
    }

    // 4. activeWorkouts
    if (!db.objectStoreNames.contains('activeWorkouts')) {
      const store = db.createObjectStore('activeWorkouts', { keyPath: 'id' });
      store.createIndex('status', 'status', { unique: false });
      store.createIndex('startedAt', 'startedAt', { unique: false });
    }

    // 5. workoutSnapshots
    if (!db.objectStoreNames.contains('workoutSnapshots')) {
      const store = db.createObjectStore('workoutSnapshots', { keyPath: 'id' });
      store.createIndex('completedAt', 'completedAt', { unique: false });
      store.createIndex('sourceRoutineId', 'sourceRoutineId', { unique: false });
      store.createIndex('sourceWorkoutId', 'sourceWorkoutId', { unique: false });
    }

    // 6. measurements
    if (!db.objectStoreNames.contains('measurements')) {
      const store = db.createObjectStore('measurements', { keyPath: 'id' });
      store.createIndex('capturedAt', 'capturedAt', { unique: false });
      store.createIndex('metric', 'metric', { unique: false });
    }

    // 7. programs
    if (!db.objectStoreNames.contains('programs')) {
      const store = db.createObjectStore('programs', { keyPath: 'id' });
      store.createIndex('updatedAt', 'updatedAt', { unique: false });
      store.createIndex('active', 'active', { unique: false });
    }

    // 8. journal
    if (!db.objectStoreNames.contains('journal')) {
      const store = db.createObjectStore('journal', { keyPath: 'id' });
      store.createIndex('status', 'status', { unique: false });
      store.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // 9. snapshots
    if (!db.objectStoreNames.contains('snapshots')) {
      const store = db.createObjectStore('snapshots', { keyPath: 'id' });
      store.createIndex('kind', 'kind', { unique: false });
      store.createIndex('createdAt', 'createdAt', { unique: false });
    }

    // 10. legacyCompat
    if (!db.objectStoreNames.contains('legacyCompat')) {
      db.createObjectStore('legacyCompat', { keyPath: 'source' });
    }
  }

  private ensureOpen(): IDBDatabase {
    if (!this.db) {
      throw new Error("Database is not open. Call 'open()' before performing operations.");
    }
    return this.db;
  }

  async transaction<T>(
    storeNames: readonly DatabaseStoreName[],
    mode: 'readonly' | 'readwrite',
    callback: (tx: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    if (!this.db) {
      await this.open();
    }
    const db = this.ensureOpen();
    const idbTx = db.transaction(storeNames as string[], mode);

    const txWrapper: DatabaseTransaction = {
      getStore: <U = unknown>(storeName: DatabaseStoreName) => {
        const idbStore = idbTx.objectStore(storeName);
        return {
          get: (key: IDBValidKey): Promise<U | null> => {
            return new Promise<U | null>((resolve, reject) => {
              const req = idbStore.get(key);
              req.onsuccess = () => resolve((req.result as U) ?? null);
              req.onerror = () => reject(req.error);
            });
          },
          getAll: (): Promise<U[]> => {
            return new Promise<U[]>((resolve, reject) => {
              const req = idbStore.getAll();
              req.onsuccess = () => resolve((req.result as U[]) ?? []);
              req.onerror = () => reject(req.error);
            });
          },
          put: (value: U, key?: IDBValidKey): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
              const req = key !== undefined ? idbStore.put(value, key) : idbStore.put(value);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
          },
          delete: (key: IDBValidKey): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
              const req = idbStore.delete(key);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
          },
          clear: (): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
              const req = idbStore.clear();
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            });
          },
        };
      },
    };

    return new Promise<T>((resolve, reject) => {
      let callbackResult: T;
      let callbackDone = false;

      idbTx.oncomplete = () => {
        if (callbackDone) {
          resolve(callbackResult);
        }
      };

      idbTx.onerror = () => {
        reject(idbTx.error ?? new Error('IndexedDB transaction failed'));
      };

      idbTx.onabort = () => {
        reject(new Error('IndexedDB transaction aborted'));
      };

      callback(txWrapper)
        .then((result) => {
          callbackResult = result;
          callbackDone = true;
          // If transaction is already complete (or synchronous in mocks), resolve
          if (idbTx.error === null && !('commit' in idbTx)) {
            // normal IDB auto-commits
          }
        })
        .catch((err) => {
          try {
            idbTx.abort();
          } catch {
            // Already aborted or completed
          }
          reject(err);
        });
    });
  }

  async createRecoverySnapshot(
    kind: RecoverySnapshot['kind'],
    description: string,
  ): Promise<RecoverySnapshot> {
    const snapshotId = generateId('snap');
    const now: ISODateTimeString = new Date().toISOString();

    const snapshotData: Record<DatabaseStoreName, unknown[]> = {
      metadata: [],
      routines: [],
      exercises: [],
      activeWorkouts: [],
      workoutSnapshots: [],
      measurements: [],
      programs: [],
      journal: [],
      snapshots: [],
      legacyCompat: [],
    };

    // Read all stores except snapshots in a single readonly transaction
    const storesToSnapshot = ALL_STORE_NAMES.filter((s) => s !== 'snapshots');
    await this.transaction(storesToSnapshot, 'readonly', async (tx) => {
      for (const storeName of storesToSnapshot) {
        const records = await tx.getStore(storeName).getAll();
        snapshotData[storeName] = records;
      }
    });

    const recoverySnapshot: RecoverySnapshot = {
      id: snapshotId,
      schemaVersion: this.version,
      kind,
      description,
      createdAt: now,
      stores: snapshotData,
    };

    // Store the snapshot in the 'snapshots' store
    await this.transaction(['snapshots'], 'readwrite', async (tx) => {
      await tx.getStore<RecoverySnapshot>('snapshots').put(recoverySnapshot);
    });

    return recoverySnapshot;
  }

  async restoreSnapshot(snapshotId: EntityId): Promise<void> {
    let snapshot: RecoverySnapshot | null = null;

    await this.transaction(['snapshots'], 'readonly', async (tx) => {
      snapshot = await tx.getStore<RecoverySnapshot>('snapshots').get(snapshotId);
    });

    if (!snapshot) {
      throw new Error(`Recovery snapshot '${snapshotId}' not found.`);
    }

    const typedSnapshot = snapshot as RecoverySnapshot;
    const storesToRestore = ALL_STORE_NAMES.filter((s) => s !== 'snapshots');

    await this.transaction(storesToRestore, 'readwrite', async (tx) => {
      for (const storeName of storesToRestore) {
        const store = tx.getStore(storeName);
        await store.clear();
        const records = typedSnapshot.stores[storeName] ?? [];
        for (const record of records) {
          await store.put(record);
        }
      }
    });
  }
}
