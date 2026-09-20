import { IDBFactory } from 'fake-indexeddb';
import { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';

/**
 * Creates an isolated, in-memory IndexedDBTitaDatabase instance for testing.
 */
export function createTestDatabase(dbName = 'test-tita-db'): IndexedDBTitaDatabase {
  const fakeFactory = new IDBFactory();
  return new IndexedDBTitaDatabase({
    idbFactory: fakeFactory,
    dbName,
    version: 1,
  });
}
