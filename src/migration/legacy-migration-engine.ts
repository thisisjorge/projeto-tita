import type { TitaDatabase } from '../repositories/interfaces/database.interface.js';
import type { LegacyState } from './legacy-types.js';
import { transformLegacyState } from './legacy-transformer.js';
import { validateExercise } from '../domain/validators/exercise-validator.js';
import { validateRoutine } from '../domain/validators/routine-validator.js';
import { IdbExerciseRepository } from '../repositories/indexeddb/idb-exercise-repository.js';
import { IdbRoutineRepository } from '../repositories/indexeddb/idb-routine-repository.js';
import { IdbWorkoutSnapshotRepository } from '../repositories/indexeddb/idb-workout-repository.js';
import { IdbMeasurementRepository } from '../repositories/indexeddb/idb-measurement-repository.js';
import { IdbLegacyCompatRepository } from '../repositories/indexeddb/idb-legacy-compat-repository.js';
import { IdbMetadataRepository } from '../repositories/indexeddb/idb-metadata-repository.js';

export const PRIMARY_STORAGE_KEY = 'tita_app_v1';
export const FALLBACK_STORAGE_KEY = 'jorge_titan_app_v1';
export const MIGRATION_METADATA_KEY = 'migration:legacy_v1_status';

export interface MigrationStorageReader {
  getItem(key: string): string | null;
}

export interface MigrationResult {
  readonly success: boolean;
  readonly skipped: boolean;
  readonly reason?: string;
  readonly snapshotId?: string;
  readonly counts: {
    readonly exercises: number;
    readonly routines: number;
    readonly workoutSnapshots: number;
    readonly measurements: number;
    readonly legacyCompatRecords: number;
  };
  readonly error?: string;
}

export class LegacyMigrationEngine {
  constructor(
    private readonly db: TitaDatabase,
    private readonly storage?: MigrationStorageReader,
  ) {}

  /**
   * Reads raw legacy JSON from the storage reader without mutating localStorage.
   */
  readLegacyRaw(): { raw: string | null; keyUsed: string | null } {
    const storage =
      this.storage ??
      (typeof globalThis !== 'undefined' && 'localStorage' in globalThis
        ? globalThis.localStorage
        : null);

    if (!storage) {
      return { raw: null, keyUsed: null };
    }

    let raw = storage.getItem(PRIMARY_STORAGE_KEY);
    let keyUsed = PRIMARY_STORAGE_KEY;

    if (!raw) {
      raw = storage.getItem(FALLBACK_STORAGE_KEY);
      keyUsed = FALLBACK_STORAGE_KEY;
    }

    return { raw, keyUsed: raw ? keyUsed : null };
  }

  /**
   * Executes the non-destructive legacy migration:
   * 1. Read localStorage (read-only)
   * 2. If already migrated or no data, returns skipped safely.
   * 3. Creates an atomic RecoverySnapshot BEFORE any mutation.
   * 4. Transforms data to domain entities.
   * 5. Validates transformed entities with domain rules.
   * 6. Persists data into IndexedDB.
   * 7. Rolls back to RecoverySnapshot automatically on any failure.
   */
  async runMigration(explicitState?: LegacyState): Promise<MigrationResult> {
    const emptyCounts = {
      exercises: 0,
      routines: 0,
      workoutSnapshots: 0,
      measurements: 0,
      legacyCompatRecords: 0,
    };

    // Check if migration was already executed
    const metaRepo = new IdbMetadataRepository(this.db);
    const existingMigration = await metaRepo.get<{ completedAt: string }>(MIGRATION_METADATA_KEY);
    if (existingMigration) {
      return {
        success: true,
        skipped: true,
        reason: 'Migration already applied previously',
        counts: emptyCounts,
      };
    }

    let legacyState: LegacyState | null = explicitState ?? null;

    if (!legacyState) {
      const { raw } = this.readLegacyRaw();
      if (!raw) {
        return {
          success: true,
          skipped: true,
          reason: 'No legacy localStorage data found to migrate',
          counts: emptyCounts,
        };
      }

      try {
        legacyState = JSON.parse(raw) as LegacyState;
      } catch (err) {
        return {
          success: false,
          skipped: false,
          error: `Failed to parse legacy JSON: ${err instanceof Error ? err.message : String(err)}`,
          counts: emptyCounts,
        };
      }
    }

    // Create a RecoverySnapshot before any mutation
    const preSnapshot = await this.db.createRecoverySnapshot(
      'migration_preflight',
      'Pre-migration snapshot before legacy v1 import',
    );

    try {
      // Transform legacy state to canonical domain entities
      const transformed = transformLegacyState(legacyState);

      // Validate all exercises with pure domain validator
      for (const exercise of transformed.exercises) {
        const valRes = validateExercise(exercise);
        if (!valRes.valid) {
          throw new Error(
            `Exercise validation failed for '${exercise.name}': ${valRes.errors.join(', ')}`,
          );
        }
      }

      // Validate all routines with pure domain validator
      for (const routine of transformed.routines) {
        const valRes = validateRoutine(routine);
        if (!valRes.valid) {
          throw new Error(
            `Routine validation failed for '${routine.name}': ${valRes.errors.join(', ')}`,
          );
        }
      }

      // Persist transformed entities using repositories
      const exerciseRepo = new IdbExerciseRepository(this.db);
      const routineRepo = new IdbRoutineRepository(this.db);
      const workoutRepo = new IdbWorkoutSnapshotRepository(this.db);
      const measurementRepo = new IdbMeasurementRepository(this.db);
      const legacyCompatRepo = new IdbLegacyCompatRepository(this.db);

      await exerciseRepo.saveMany(transformed.exercises);
      await routineRepo.saveMany(transformed.routines);
      await workoutRepo.saveMany(transformed.workoutSnapshots);
      await measurementRepo.saveMany(transformed.measurements);

      for (const compat of transformed.legacyCompatRecords) {
        await legacyCompatRepo.save(compat);
      }

      // Record migration status in metadata
      const counts = {
        exercises: transformed.exercises.length,
        routines: transformed.routines.length,
        workoutSnapshots: transformed.workoutSnapshots.length,
        measurements: transformed.measurements.length,
        legacyCompatRecords: transformed.legacyCompatRecords.length,
      };

      await metaRepo.set(MIGRATION_METADATA_KEY, {
        completedAt: new Date().toISOString(),
        counts,
        preSnapshotId: preSnapshot.id,
      });

      return {
        success: true,
        skipped: false,
        snapshotId: preSnapshot.id,
        counts,
      };
    } catch (error) {
      // Automatic rollback on failure!
      try {
        await this.db.restoreSnapshot(preSnapshot.id);
      } catch (rollbackErr) {
        console.error('Critical: Rollback after migration failure failed:', rollbackErr);
      }

      return {
        success: false,
        skipped: false,
        snapshotId: preSnapshot.id,
        error: error instanceof Error ? error.message : String(error),
        counts: emptyCounts,
      };
    }
  }
}
