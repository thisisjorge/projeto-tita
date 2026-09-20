import type {
  DatabaseStoreName,
  TitaDatabase,
} from '../repositories/interfaces/database.interface.js';
import {
  type BackupV1,
  BACKUP_FORMAT_IDENTIFIER,
  CURRENT_BACKUP_SCHEMA_VERSION,
  DEFAULT_BACKUP_STORES,
  calculateSha256,
  serializeDeterministicJson,
} from './backup-grammar.js';

export interface CategoryConflictInfo {
  readonly store: DatabaseStoreName;
  readonly existingCount: number;
  readonly incomingCount: number;
  readonly conflictingIds: readonly string[];
}

export interface ImportPreflightResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly backup?: BackupV1;
  readonly categories: readonly string[];
  readonly counts: Record<string, number>;
  readonly conflicts: readonly CategoryConflictInfo[];
  readonly dateRange?: {
    readonly earliest: string;
    readonly latest: string;
  };
}

export type ImportMode = 'merge' | 'replace_selected' | 'cancel';

export interface ImportExecutionOptions {
  readonly mode: ImportMode;
  readonly selectedCategories?: readonly DatabaseStoreName[];
}

export interface ImportExecutionResult {
  readonly success: boolean;
  readonly cancelled: boolean;
  readonly snapshotId?: string;
  readonly importedCounts: Record<string, number>;
  readonly error?: string;
}

/**
 * Preflights an import payload without mutating the database:
 * - Parses JSON and validates structure
 * - Verifies manifest format and schemaVersion
 * - Verifies SHA-256 checksum over deterministic records serialization
 * - Analyzes incoming entities vs database state for conflicts
 */
export async function preflightImport(
  db: TitaDatabase,
  jsonString: string,
): Promise<ImportPreflightResult> {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    return {
      valid: false,
      errors: [`Invalid JSON payload: ${err instanceof Error ? err.message : String(err)}`],
      categories: [],
      counts: {},
      conflicts: [],
    };
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      valid: false,
      errors: ['Import payload must be a non-null JSON object.'],
      categories: [],
      counts: {},
      conflicts: [],
    };
  }

  const candidate = parsed as Partial<BackupV1>;

  if (!candidate.manifest || typeof candidate.manifest !== 'object') {
    errors.push("Missing required 'manifest' object in backup payload.");
  }

  if (candidate.manifest?.format !== BACKUP_FORMAT_IDENTIFIER) {
    errors.push(
      `Unsupported backup format '${candidate.manifest?.format}'. Expected '${BACKUP_FORMAT_IDENTIFIER}'.`,
    );
  }

  if (
    typeof candidate.manifest?.schemaVersion !== 'number' ||
    candidate.manifest.schemaVersion > CURRENT_BACKUP_SCHEMA_VERSION
  ) {
    errors.push(
      `Unsupported schema version ${candidate.manifest?.schemaVersion}. Maximum supported is ${CURRENT_BACKUP_SCHEMA_VERSION}.`,
    );
  }

  if (!candidate.records || typeof candidate.records !== 'object') {
    errors.push("Missing required 'records' object in backup payload.");
  }

  if (errors.length > 0 || !candidate.manifest || !candidate.records) {
    return {
      valid: false,
      errors,
      categories: candidate.manifest?.categories ?? [],
      counts: candidate.manifest?.counts ?? {},
      conflicts: [],
    };
  }

  // Verify SHA-256 Checksum
  const computedRecordsJson = serializeDeterministicJson(candidate.records);
  const computedChecksum = await calculateSha256(computedRecordsJson);

  if (computedChecksum !== candidate.manifest.checksum) {
    errors.push(
      `Backup checksum mismatch! Manifest: ${candidate.manifest.checksum}, Computed: ${computedChecksum}. Data may be corrupted or tampered.`,
    );
  }

  const backup = candidate as BackupV1;
  const categories = backup.manifest.categories ?? Object.keys(backup.records);
  const counts: Record<string, number> = {};
  const conflicts: CategoryConflictInfo[] = [];

  let earliestDate: string | undefined;
  let latestDate: string | undefined;

  function observeDate(dateStr: unknown) {
    if (typeof dateStr === 'string' && dateStr.length >= 10) {
      if (!earliestDate || dateStr < earliestDate) earliestDate = dateStr;
      if (!latestDate || dateStr > latestDate) latestDate = dateStr;
    }
  }

  // Inspect database to calculate conflicts
  for (const cat of categories) {
    const storeName = cat as DatabaseStoreName;
    const incomingRecords = (backup.records[cat] as readonly unknown[]) ?? [];
    counts[cat] = incomingRecords.length;

    // Observe dates for preview
    for (const rec of incomingRecords) {
      if (rec && typeof rec === 'object') {
        const o = rec as Record<string, unknown>;
        observeDate(o.completedAt ?? o.startedAt ?? o.capturedAt ?? o.createdAt ?? o.updatedAt);
      }
    }

    try {
      await db.transaction([storeName], 'readonly', async (tx) => {
        const existingRecords = await tx.getStore(storeName).getAll();
        const existingIds = new Set<string>();

        for (const er of existingRecords) {
          if (er && typeof er === 'object') {
            const o = er as Record<string, unknown>;
            const id = (o.id ?? o.key ?? o.source) as string | undefined;
            if (id) existingIds.add(id);
          }
        }

        const conflicting: string[] = [];
        for (const ir of incomingRecords) {
          if (ir && typeof ir === 'object') {
            const o = ir as Record<string, unknown>;
            const id = (o.id ?? o.key ?? o.source) as string | undefined;
            if (id && existingIds.has(id)) {
              conflicting.push(id);
            }
          }
        }

        conflicts.push({
          store: storeName,
          existingCount: existingRecords.length,
          incomingCount: incomingRecords.length,
          conflictingIds: conflicting,
        });
      });
    } catch {
      // Store may not exist in current schema or other read error
    }
  }

  const dateRange =
    earliestDate && latestDate ? { earliest: earliestDate, latest: latestDate } : undefined;

  return {
    valid: errors.length === 0,
    errors,
    backup: errors.length === 0 ? backup : undefined,
    categories,
    counts,
    conflicts,
    dateRange,
  };
}

/**
 * Executes import following preflight validation:
 * - Cancels cleanly without mutation if mode === 'cancel'
 * - Creates atomic RecoverySnapshot before any mutation
 * - Applies merge or replace_selected
 * - Automatically rolls back to snapshot if any error occurs
 */
export async function executeImport(
  db: TitaDatabase,
  backup: BackupV1,
  options: ImportExecutionOptions,
): Promise<ImportExecutionResult> {
  if (options.mode === 'cancel') {
    return {
      success: true,
      cancelled: true,
      importedCounts: {},
    };
  }

  const storesToImport = (
    options.selectedCategories ?? (backup.manifest.categories as readonly DatabaseStoreName[])
  ).filter((name) => DEFAULT_BACKUP_STORES.includes(name as DatabaseStoreName));

  // Create RecoverySnapshot before any mutation
  const preSnapshot = await db.createRecoverySnapshot(
    'import_preflight',
    `Pre-import snapshot for mode: ${options.mode}`,
  );

  const importedCounts: Record<string, number> = {};

  try {
    await db.transaction(storesToImport, 'readwrite', async (tx) => {
      for (const storeName of storesToImport) {
        const store = tx.getStore(storeName);
        const incomingRecords = (backup.records[storeName] as readonly unknown[]) ?? [];

        if (options.mode === 'replace_selected') {
          await store.clear();
        }

        for (const record of incomingRecords) {
          await store.put(record);
        }

        importedCounts[storeName] = incomingRecords.length;
      }
    });

    return {
      success: true,
      cancelled: false,
      snapshotId: preSnapshot.id,
      importedCounts,
    };
  } catch (error) {
    // Automatic Rollback on failure!
    try {
      await db.restoreSnapshot(preSnapshot.id);
    } catch (rollbackErr) {
      console.error('Critical: Rollback after import failure failed:', rollbackErr);
    }

    return {
      success: false,
      cancelled: false,
      snapshotId: preSnapshot.id,
      importedCounts: {},
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
