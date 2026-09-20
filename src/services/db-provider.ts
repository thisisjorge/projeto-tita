import { IndexedDBTitaDatabase } from '../repositories/indexeddb/tita-database.js';

let instance: IndexedDBTitaDatabase | null = null;

export function getAppDatabase(): IndexedDBTitaDatabase {
  if (!instance) {
    instance = new IndexedDBTitaDatabase();
  }
  return instance;
}

export function setAppDatabaseForTesting(db: IndexedDBTitaDatabase | null): void {
  instance = db;
}
