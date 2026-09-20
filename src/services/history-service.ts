import type { EntityId, ISODateTimeString } from '../domain/common/types.js';
import type { WorkoutSnapshot } from '../domain/entities/workout-snapshot.js';
import {
  ProgressEngine,
  PlateauDetector,
  ReviewEngine,
  type DateRangeFilter,
  type ExerciseProgressSummary,
  type GlobalProgressMetrics,
  type MonthlyReview,
  type MonthlyWorkoutGroup,
  type PaginatedResult,
  type PlateauReport,
  type WeeklyReview,
} from '../domain/analytics/index.js';
import type { TitaDatabase } from '../repositories/interfaces/database.interface.js';
import { IdbWorkoutSnapshotRepository } from '../repositories/indexeddb/idb-workout-repository.js';
import { IdbExerciseRepository } from '../repositories/indexeddb/idb-exercise-repository.js';
import { getAppDatabase } from './db-provider.js';

export type TimeRangePreset = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export interface HistoryQueryOptions {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly startDate?: ISODateTimeString;
  readonly endDate?: ISODateTimeString;
  readonly routineId?: EntityId;
}

export interface HistoryQueryResult {
  readonly groups: readonly MonthlyWorkoutGroup[];
  readonly pagination: PaginatedResult<WorkoutSnapshot>;
}

export class HistoryService {
  private readonly db: TitaDatabase;
  private readonly snapshotRepo: IdbWorkoutSnapshotRepository;
  private readonly exerciseRepo: IdbExerciseRepository;

  constructor(db: TitaDatabase = getAppDatabase()) {
    this.db = db;
    this.snapshotRepo = new IdbWorkoutSnapshotRepository(db);
    this.exerciseRepo = new IdbExerciseRepository(db);
  }

  /**
   * Retrieves paginated, sorted, and optionally filtered workout snapshots with monthly grouping.
   */
  async getHistory(options: HistoryQueryOptions = {}): Promise<HistoryQueryResult> {
    let allSnapshots = await this.snapshotRepo.getAll();

    // Routine filter
    if (options.routineId) {
      allSnapshots = allSnapshots.filter((s) => s.sourceRoutineId === options.routineId);
    }

    // Date range filter
    if (options.startDate || options.endDate) {
      allSnapshots = ProgressEngine.filterByDateRange(allSnapshots, {
        startDate: options.startDate,
        endDate: options.endDate,
      });
    }

    // Text search filter (title or notes or exercise names)
    if (options.search && options.search.trim().length > 0) {
      const q = options.search.trim().toLowerCase();
      allSnapshots = allSnapshots.filter((s) => {
        if (s.title.toLowerCase().includes(q)) return true;
        if (s.notes && s.notes.toLowerCase().includes(q)) return true;
        return s.exercises.some((ex) => ex.exerciseName.toLowerCase().includes(q));
      });
    }

    // Snapshots are already sorted by completedAt desc with ID tiebreak in repo/ProgressEngine
    const sorted = ProgressEngine.sortSnapshots(allSnapshots, 'desc');

    const pagination = ProgressEngine.paginateSnapshots(
      sorted,
      options.page ?? 1,
      options.pageSize ?? 15,
    );

    // Group the paginated page or full filtered set into monthly buckets
    const groups = ProgressEngine.groupSnapshotsByMonth(pagination.items);

    return {
      groups,
      pagination,
    };
  }

  /**
   * Retrieves a single workout snapshot by ID.
   */
  async getSnapshotById(id: EntityId): Promise<WorkoutSnapshot | null> {
    return this.snapshotRepo.getById(id);
  }

  /**
   * Calculates global progress metrics across all recorded workouts for a preset time range.
   */
  async getGlobalMetrics(timeRange: TimeRangePreset = 'ALL'): Promise<GlobalProgressMetrics> {
    const all = await this.snapshotRepo.getAll();
    const filter = this.resolveTimeRangeFilter(timeRange);
    return ProgressEngine.calculateGlobalMetrics(all, filter);
  }

  /**
   * Returns all unique exercises that have been logged in any workout snapshot.
   */
  async getUniqueExercises(): Promise<{ id: EntityId; name: string }[]> {
    const all = await this.snapshotRepo.getAll();
    return ProgressEngine.getUniqueExercises(all);
  }

  /**
   * Calculates progression history and personal records for a specific exercise.
   */
  async getExerciseProgress(
    exerciseId: EntityId,
    timeRange: TimeRangePreset = 'ALL',
  ): Promise<ExerciseProgressSummary> {
    const all = await this.snapshotRepo.getAll();
    const filter = this.resolveTimeRangeFilter(timeRange);
    return ProgressEngine.extractExerciseProgress(all, exerciseId, filter);
  }

  /**
   * Deletes a workout snapshot by ID.
   */
  async deleteSnapshot(id: EntityId): Promise<void> {
    return this.snapshotRepo.delete(id);
  }

  /**
   * Generates a deterministic Weekly Review for the specified week or latest workout.
   */
  async getWeeklyReview(targetWeekOrDate?: string | Date): Promise<WeeklyReview> {
    const all = await this.snapshotRepo.getAll();
    const muscleLookup = await this.getMuscleLookup();
    return ReviewEngine.generateWeeklyReview(all, targetWeekOrDate, muscleLookup);
  }

  /**
   * Generates a deterministic Monthly Review for the specified month or latest workout.
   */
  async getMonthlyReview(targetMonthOrDate?: string | Date): Promise<MonthlyReview> {
    const all = await this.snapshotRepo.getAll();
    const muscleLookup = await this.getMuscleLookup();
    return ReviewEngine.generateMonthlyReview(all, targetMonthOrDate, muscleLookup);
  }

  /**
   * Returns all available calendar weeks that contain at least one workout snapshot.
   */
  async getAvailableReviewWeeks(): Promise<
    readonly { weekKey: string; weekLabel: string; startDate: string; endDate: string }[]
  > {
    const all = await this.snapshotRepo.getAll();
    return ReviewEngine.getAvailableWeeks(all);
  }

  /**
   * Returns all available calendar months that contain at least one workout snapshot.
   */
  async getAvailableReviewMonths(): Promise<readonly { monthKey: string; monthLabel: string }[]> {
    const all = await this.snapshotRepo.getAll();
    return ReviewEngine.getAvailableMonths(all);
  }

  /**
   * Evaluates historical workouts to detect possible performance plateaus and volume anomalies.
   */
  async getPlateauReports(referenceDate?: Date | string): Promise<readonly PlateauReport[]> {
    const all = await this.snapshotRepo.getAll();
    return PlateauDetector.detectPlateausAndAnomalies(all, referenceDate);
  }

  /**
   * Helper to build a muscle lookup from the exercise repository.
   */
  private async getMuscleLookup(): Promise<(id: EntityId, name?: string) => string | undefined> {
    try {
      const exercises = await this.exerciseRepo.getAll(true);
      const map = new Map<string, string>();
      for (const ex of exercises) {
        map.set(ex.id, ex.primaryMuscle);
        map.set(ex.name.toLowerCase(), ex.primaryMuscle);
      }
      return (id: EntityId, name?: string) => {
        return map.get(id) || (name ? map.get(name.toLowerCase()) : undefined);
      };
    } catch {
      return () => undefined;
    }
  }

  /**
   * Helper to convert preset string to DateRangeFilter.
   */
  private resolveTimeRangeFilter(preset: TimeRangePreset): DateRangeFilter | undefined {
    if (preset === 'ALL') return undefined;

    const now = new Date();
    const start = new Date(now);

    switch (preset) {
      case '1M':
        start.setDate(now.getDate() - 30);
        break;
      case '3M':
        start.setDate(now.getDate() - 90);
        break;
      case '6M':
        start.setDate(now.getDate() - 180);
        break;
      case '1Y':
        start.setDate(now.getDate() - 365);
        break;
    }

    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }
}
