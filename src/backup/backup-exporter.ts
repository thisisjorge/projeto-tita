import type {
  DatabaseStoreName,
  TitaDatabase,
} from '../repositories/interfaces/database.interface.js';
import {
  type BackupManifest,
  type BackupV1,
  BACKUP_FORMAT_IDENTIFIER,
  CURRENT_BACKUP_SCHEMA_VERSION,
  DEFAULT_BACKUP_STORES,
  calculateSha256,
  serializeDeterministicJson,
} from './backup-grammar.js';
import type { WorkoutSnapshot } from '../domain/entities/workout-snapshot.js';

function sortRecords(records: readonly unknown[]): unknown[] {
  return [...records].sort((a, b) => {
    if (a && typeof a === 'object' && b && typeof b === 'object') {
      const objA = a as Record<string, unknown>;
      const objB = b as Record<string, unknown>;

      const idA = (objA.id ?? objA.key ?? objA.source ?? '') as string;
      const idB = (objB.id ?? objB.key ?? objB.source ?? '') as string;

      if (idA && idB) {
        return idA.localeCompare(idB);
      }
    }
    return JSON.stringify(a).localeCompare(JSON.stringify(b));
  });
}

export interface ExportBackupOptions {
  readonly categories?: readonly DatabaseStoreName[];
  readonly exportedAt?: string;
}

export interface ExportBackupResult {
  readonly backup: BackupV1;
  readonly json: string;
}

/** A single session in the same checksum-protected grammar as a full backup. */
export async function exportWorkoutSnapshot(
  snapshot: WorkoutSnapshot,
): Promise<ExportBackupResult> {
  const records = { workoutSnapshots: [snapshot] };
  const backup: BackupV1 = {
    manifest: {
      format: BACKUP_FORMAT_IDENTIFIER,
      schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      categories: ['workoutSnapshots'],
      counts: { workoutSnapshots: 1 },
      checksum: await calculateSha256(serializeDeterministicJson(records)),
    },
    records,
  };
  return { backup, json: serializeDeterministicJson(backup) };
}

/**
 * Exports data from the database into deterministic Backup Grammar v1 package.
 */
export async function exportBackup(
  db: TitaDatabase,
  options?: ExportBackupOptions,
): Promise<ExportBackupResult> {
  const storesToExport = options?.categories ?? DEFAULT_BACKUP_STORES;
  const exportedAt = options?.exportedAt ?? new Date().toISOString();

  const recordsMap: Record<string, unknown[]> = {};
  const countsMap: Record<string, number> = {};

  await db.transaction(storesToExport, 'readonly', async (tx) => {
    for (const storeName of storesToExport) {
      const rawRecords = await tx.getStore(storeName).getAll();
      const sorted = sortRecords(rawRecords);
      recordsMap[storeName] = sorted;
      countsMap[storeName] = sorted.length;
    }
  });

  // Calculate checksum on the deterministic serialization of records
  const recordsJson = serializeDeterministicJson(recordsMap);
  const checksum = await calculateSha256(recordsJson);

  const manifest: BackupManifest = {
    format: BACKUP_FORMAT_IDENTIFIER,
    schemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    exportedAt,
    categories: [...storesToExport],
    counts: countsMap,
    checksum,
  };

  const backup: BackupV1 = {
    manifest,
    records: recordsMap,
  };

  const json = serializeDeterministicJson(backup);

  return {
    backup,
    json,
  };
}
