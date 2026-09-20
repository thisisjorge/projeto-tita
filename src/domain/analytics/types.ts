import type { EntityId, ISODateTimeString } from '../common/types.js';
import type { PRCategory } from '../math/pr-detector.js';

export interface DateRangeFilter {
  readonly startDate?: ISODateTimeString;
  readonly endDate?: ISODateTimeString;
}

export interface GlobalProgressMetrics {
  readonly totalWorkouts: number;
  readonly totalVolumeKg: number;
  readonly totalReps: number;
  readonly totalSets: number;
  readonly totalActiveDurationMs: number;
  readonly averageDurationMinutes: number;
  readonly weeklyFrequency: number;
  readonly totalPRsCount: number;
}

export interface ExerciseProgressPoint {
  readonly snapshotId: EntityId;
  readonly workoutTitle: string;
  readonly date: ISODateTimeString;
  readonly maxWeightKg: number;
  readonly estimated1RM: number;
  readonly totalVolumeKg: number;
  readonly maxReps: number;
  readonly workingSetsCount: number;
  readonly isPR: boolean;
  readonly prCategories: readonly PRCategory[];
}

export interface ExercisePersonalBests {
  readonly exerciseId: EntityId;
  readonly exerciseName: string;
  readonly heaviestWeightKg: number;
  readonly heaviestWeightDate?: ISODateTimeString;
  readonly bestE1RMKg: number;
  readonly bestE1RMDate?: ISODateTimeString;
  readonly bestSetVolumeKg: number;
  readonly bestSetVolumeDate?: ISODateTimeString;
  readonly bestSessionVolumeKg: number;
  readonly bestSessionVolumeDate?: ISODateTimeString;
  readonly mostRepsAtWeight: {
    readonly weightKg: number;
    readonly reps: number;
    readonly date: ISODateTimeString;
  } | null;
}

export interface ExerciseProgressSummary {
  readonly exerciseId: EntityId;
  readonly exerciseName: string;
  readonly totalSessions: number;
  readonly firstSessionDate?: ISODateTimeString;
  readonly lastSessionDate?: ISODateTimeString;
  readonly personalBests: ExercisePersonalBests;
  readonly historyPoints: readonly ExerciseProgressPoint[];
}

export interface MonthlyWorkoutGroup {
  readonly monthKey: string; // e.g. "2026-09"
  readonly monthLabel: string; // e.g. "Setembro de 2026"
  readonly year: number;
  readonly month: number; // 1-12
  readonly snapshots: readonly import('../entities/workout-snapshot.js').WorkoutSnapshot[];
}

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface MuscleVolumeDistribution {
  readonly muscle: string;
  readonly sets: number;
  readonly volumeKg: number;
  readonly percentage: number;
}

export interface PeriodComparison {
  readonly previousCount: number;
  readonly countDelta: number;
  readonly previousVolumeKg: number;
  readonly volumeDeltaPercent: number;
  readonly previousSets: number;
  readonly setsDelta: number;
  readonly previousDurationMs: number;
  readonly durationDeltaPercent: number;
}

export interface ExerciseProgressionItem {
  readonly exerciseId: EntityId;
  readonly exerciseName: string;
  readonly previousE1RM: number;
  readonly currentE1RM: number;
  readonly deltaKg: number;
  readonly deltaPercent: number;
}

export interface PRAchievedSummary {
  readonly exerciseId: EntityId;
  readonly exerciseName: string;
  readonly category: PRCategory;
  readonly categoryLabel: string;
  readonly value: number;
  readonly unit: string;
  readonly date: ISODateTimeString;
}

export interface WeeklyReview {
  readonly weekKey: string; // e.g. "2026-W38"
  readonly weekLabel: string; // e.g. "Semana 38 (15/09 - 21/09)"
  readonly startDate: ISODateTimeString;
  readonly endDate: ISODateTimeString;
  readonly year: number;
  readonly weekNumber: number;
  readonly totalWorkouts: number;
  readonly totalWorkingSets: number;
  readonly totalVolumeKg: number;
  readonly totalDurationMs: number;
  readonly totalPRs: number;
  readonly prsAchieved: readonly PRAchievedSummary[];
  readonly muscleDistribution: readonly MuscleVolumeDistribution[];
  readonly exerciseProgressions: readonly ExerciseProgressionItem[];
  readonly comparisonWithPreviousWeek: PeriodComparison | null;
}

export type PlateauAnomalyType = 'STAGNANT_LOAD' | 'VOLUME_ANOMALY' | 'EXTENDED_ABSENCE';

export interface PlateauReport {
  readonly exerciseId: EntityId;
  readonly exerciseName: string;
  readonly type: PlateauAnomalyType;
  readonly typeLabel: string;
  readonly exposuresCount: number;
  readonly firstExposureDate?: ISODateTimeString;
  readonly lastExposureDate?: ISODateTimeString;
  readonly benchmarkValue: number;
  readonly currentValue: number;
  readonly changePercent: number;
  readonly reason: string;
  readonly recommendation: string;
  readonly disclaimer: string;
}

export interface MonthlyConsistencyMetrics {
  readonly activeWeeksCount: number;
  readonly totalWeeksInMonth: number;
  readonly consistencyPercentage: number;
  readonly averageSessionsPerActiveWeek: number;
}

export interface MonthlyMetricChange {
  readonly exerciseId: EntityId;
  readonly exerciseName: string;
  readonly metric: 'e1RM' | 'Volume' | 'Carga';
  readonly previousValue: number;
  readonly currentValue: number;
  readonly deltaPercent: number;
  readonly direction: 'up' | 'down';
}

export interface MonthlyReview {
  readonly monthKey: string; // e.g. "2026-09"
  readonly monthLabel: string; // e.g. "Setembro de 2026"
  readonly year: number;
  readonly month: number; // 1-12
  readonly totalSessions: number;
  readonly weeklyFrequency: number;
  readonly totalVolumeKg: number;
  readonly totalWorkingSets: number;
  readonly totalDurationMs: number;
  readonly totalPRs: number;
  readonly muscleDistribution: readonly MuscleVolumeDistribution[];
  readonly consistency: MonthlyConsistencyMetrics;
  readonly largestChanges: readonly MonthlyMetricChange[];
  readonly possiblePlateaus: readonly PlateauReport[];
  readonly comparisonWithPreviousMonth: PeriodComparison | null;
}
