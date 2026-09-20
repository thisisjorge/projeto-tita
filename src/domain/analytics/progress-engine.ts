import type { EntityId, ISODateTimeString } from '../common/types.js';
import type { WorkoutSnapshot } from '../entities/workout-snapshot.js';
import { isWorkingSet } from '../enums/set-type.js';
import { calculateEpley1RM, calculateSetVolume } from '../math/progress-math.js';
import type { PRCategory } from '../math/pr-detector.js';
import type {
  DateRangeFilter,
  ExercisePersonalBests,
  ExerciseProgressPoint,
  ExerciseProgressSummary,
  GlobalProgressMetrics,
  MonthlyWorkoutGroup,
  PaginatedResult,
} from './types.js';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/**
 * Pure deterministic functions to derive historical progress and analytics.
 * Raw workout snapshots are the single source of truth.
 * Zero AI or external network dependencies.
 */
export class ProgressEngine {
  /**
   * Sorts workout snapshots chronologically with strict deterministic tiebreak.
   * Default: descending (newest first).
   */
  static sortSnapshots(
    snapshots: readonly WorkoutSnapshot[],
    direction: 'asc' | 'desc' = 'desc',
  ): WorkoutSnapshot[] {
    return [...snapshots].sort((a, b) => {
      const timeA = Date.parse(a.completedAt) || 0;
      const timeB = Date.parse(b.completedAt) || 0;

      if (direction === 'desc') {
        if (timeB !== timeA) return timeB - timeA;
        return b.id.localeCompare(a.id);
      } else {
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      }
    });
  }

  /**
   * Filters snapshots by a date range (inclusive).
   */
  static filterByDateRange(
    snapshots: readonly WorkoutSnapshot[],
    filter?: DateRangeFilter,
  ): WorkoutSnapshot[] {
    if (!filter || (!filter.startDate && !filter.endDate)) {
      return [...snapshots];
    }

    const startMs = filter.startDate ? Date.parse(filter.startDate) : -Infinity;
    const endMs = filter.endDate ? Date.parse(filter.endDate) : Infinity;

    return snapshots.filter((s) => {
      const time = Date.parse(s.completedAt);
      if (isNaN(time)) return false;
      return time >= startMs && time <= endMs;
    });
  }

  /**
   * Computes high-level aggregated global progress metrics over a collection of snapshots.
   */
  static calculateGlobalMetrics(
    snapshots: readonly WorkoutSnapshot[],
    filter?: DateRangeFilter,
  ): GlobalProgressMetrics {
    const filtered = this.filterByDateRange(snapshots, filter);

    if (filtered.length === 0) {
      return {
        totalWorkouts: 0,
        totalVolumeKg: 0,
        totalReps: 0,
        totalSets: 0,
        totalActiveDurationMs: 0,
        averageDurationMinutes: 0,
        weeklyFrequency: 0,
        totalPRsCount: 0,
      };
    }

    let totalVolumeKg = 0;
    let totalReps = 0;
    let totalSets = 0;
    let totalActiveDurationMs = 0;

    for (const s of filtered) {
      totalVolumeKg += s.totalVolumeKg || 0;
      totalReps += s.totalReps || 0;
      totalSets += s.completedSetsCount || 0;
      totalActiveDurationMs += s.activeDurationMs || 0;
    }

    const averageDurationMinutes =
      filtered.length > 0
        ? Math.round((totalActiveDurationMs / (filtered.length * 60000)) * 10) / 10
        : 0;

    // Calculate weekly frequency: span between oldest and newest workout
    const sortedAsc = this.sortSnapshots(filtered, 'asc');
    const firstTime = Date.parse(sortedAsc[0].completedAt);
    const lastTime = Date.parse(sortedAsc[sortedAsc.length - 1].completedAt);

    let spanWeeks = 1;
    if (!isNaN(firstTime) && !isNaN(lastTime) && lastTime > firstTime) {
      const diffDays = (lastTime - firstTime) / (1000 * 60 * 60 * 24);
      spanWeeks = Math.max(1, Math.ceil(diffDays / 7));
    }

    const weeklyFrequency = Math.round((filtered.length / spanWeeks) * 10) / 10;

    // Count all distinct PR events achieved across all exercises in this range
    const uniqueExercises = this.getUniqueExercises(filtered);
    let totalPRsCount = 0;

    for (const ex of uniqueExercises) {
      const summary = this.extractExerciseProgress(snapshots, ex.id, filter);
      for (const pt of summary.historyPoints) {
        if (pt.isPR) {
          totalPRsCount += pt.prCategories.length;
        }
      }
    }

    return {
      totalWorkouts: filtered.length,
      totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
      totalReps,
      totalSets,
      totalActiveDurationMs,
      averageDurationMinutes,
      weeklyFrequency,
      totalPRsCount,
    };
  }

  /**
   * Returns a list of unique exercises performed across the given snapshots.
   */
  static getUniqueExercises(
    snapshots: readonly WorkoutSnapshot[],
  ): { id: EntityId; name: string }[] {
    const map = new Map<EntityId, string>();

    for (const s of snapshots) {
      for (const ex of s.exercises) {
        if (!map.has(ex.exerciseId)) {
          map.set(ex.exerciseId, ex.exerciseName);
        }
      }
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Extracts chronological progression data for a specific exercise across all snapshots.
   * Tracks progressive personal records (PRs) accurately from session to session.
   */
  static extractExerciseProgress(
    allSnapshots: readonly WorkoutSnapshot[],
    exerciseId: EntityId,
    filter?: DateRangeFilter,
  ): ExerciseProgressSummary {
    // Sort all snapshots chronologically ascending to evaluate chronological PRs
    const sortedAsc = this.sortSnapshots(allSnapshots, 'asc');

    let exerciseName = 'Exercício';
    let runningMaxWeight = 0;
    let runningMaxE1RM = 0;
    let runningMaxSetVolume = 0;
    let runningMaxSessionVolume = 0;
    const runningRepsAtWeight = new Map<number, number>();

    let bestWeightKg = 0;
    let bestWeightDate: ISODateTimeString | undefined;
    let bestE1RMKg = 0;
    let bestE1RMDate: ISODateTimeString | undefined;
    let bestSetVolumeKg = 0;
    let bestSetVolumeDate: ISODateTimeString | undefined;
    let bestSessionVolumeKg = 0;
    let bestSessionVolumeDate: ISODateTimeString | undefined;
    let mostRepsAtWeight: { weightKg: number; reps: number; date: ISODateTimeString } | null = null;

    const allPoints: ExerciseProgressPoint[] = [];

    for (const snap of sortedAsc) {
      const snapEx = snap.exercises.find((e) => e.exerciseId === exerciseId);
      if (!snapEx) continue;

      exerciseName = snapEx.exerciseName;

      let sessionMaxWeight = 0;
      let sessionMaxE1RM = 0;
      let sessionMaxReps = 0;
      let sessionWorkingSetsCount = 0;
      let sessionTotalVolume = 0;

      const sessionPRCategories: PRCategory[] = [];

      for (const set of snapEx.sets) {
        if (!set.completed) continue;
        const w = set.weight ?? 0;
        const r = set.reps ?? 0;

        if (isWorkingSet(set.type)) {
          sessionWorkingSetsCount++;
          const setVol = calculateSetVolume(set);
          sessionTotalVolume += setVol;

          if (w > sessionMaxWeight) sessionMaxWeight = w;
          if (r > sessionMaxReps) sessionMaxReps = r;

          const e1rm = calculateEpley1RM(w, r);
          if (e1rm > sessionMaxE1RM) sessionMaxE1RM = e1rm;

          // Check if this set sets a new all-time Heaviest Weight PR
          if (w > runningMaxWeight && w > 0) {
            if (!sessionPRCategories.includes('HEAVIEST_WEIGHT')) {
              sessionPRCategories.push('HEAVIEST_WEIGHT');
            }
            runningMaxWeight = w;
            bestWeightKg = w;
            bestWeightDate = snap.completedAt;
          }

          // Check if this set sets a new all-time e1RM PR
          if (e1rm > runningMaxE1RM && e1rm > 0) {
            if (!sessionPRCategories.includes('ESTIMATED_1RM')) {
              sessionPRCategories.push('ESTIMATED_1RM');
            }
            runningMaxE1RM = e1rm;
            bestE1RMKg = e1rm;
            bestE1RMDate = snap.completedAt;
          }

          // Check if this set sets a new all-time Set Volume PR
          if (setVol > runningMaxSetVolume && setVol > 0) {
            if (!sessionPRCategories.includes('BEST_SET_VOLUME')) {
              sessionPRCategories.push('BEST_SET_VOLUME');
            }
            runningMaxSetVolume = setVol;
            bestSetVolumeKg = setVol;
            bestSetVolumeDate = snap.completedAt;
          }

          // Check if this set sets a new Most Reps at Weight PR
          const prevReps = runningRepsAtWeight.get(w) ?? 0;
          if (r > prevReps && w > 0) {
            if (!sessionPRCategories.includes('MOST_REPS_AT_WEIGHT')) {
              sessionPRCategories.push('MOST_REPS_AT_WEIGHT');
            }
            runningRepsAtWeight.set(w, r);
            if (!mostRepsAtWeight || r > mostRepsAtWeight.reps) {
              mostRepsAtWeight = { weightKg: w, reps: r, date: snap.completedAt };
            }
          }
        }
      }

      // Check session volume best
      if (sessionTotalVolume > runningMaxSessionVolume && sessionTotalVolume > 0) {
        runningMaxSessionVolume = sessionTotalVolume;
        bestSessionVolumeKg = sessionTotalVolume;
        bestSessionVolumeDate = snap.completedAt;
      }

      allPoints.push({
        snapshotId: snap.id,
        workoutTitle: snap.title,
        date: snap.completedAt,
        maxWeightKg: sessionMaxWeight,
        estimated1RM: sessionMaxE1RM,
        totalVolumeKg: Math.round(sessionTotalVolume * 10) / 10,
        maxReps: sessionMaxReps,
        workingSetsCount: sessionWorkingSetsCount,
        isPR: sessionPRCategories.length > 0,
        prCategories: sessionPRCategories,
      });
    }

    // Filter points by requested date range filter if provided
    let filteredPoints = allPoints;
    if (filter && (filter.startDate || filter.endDate)) {
      const startMs = filter.startDate ? Date.parse(filter.startDate) : -Infinity;
      const endMs = filter.endDate ? Date.parse(filter.endDate) : Infinity;
      filteredPoints = allPoints.filter((pt) => {
        const t = Date.parse(pt.date);
        return t >= startMs && t <= endMs;
      });
    }

    const personalBests: ExercisePersonalBests = {
      exerciseId,
      exerciseName,
      heaviestWeightKg: bestWeightKg,
      heaviestWeightDate: bestWeightDate,
      bestE1RMKg: bestE1RMKg,
      bestE1RMDate: bestE1RMDate,
      bestSetVolumeKg: bestSetVolumeKg,
      bestSetVolumeDate: bestSetVolumeDate,
      bestSessionVolumeKg: bestSessionVolumeKg,
      bestSessionVolumeDate: bestSessionVolumeDate,
      mostRepsAtWeight,
    };

    return {
      exerciseId,
      exerciseName,
      totalSessions: filteredPoints.length,
      firstSessionDate: filteredPoints.length > 0 ? filteredPoints[0].date : undefined,
      lastSessionDate:
        filteredPoints.length > 0 ? filteredPoints[filteredPoints.length - 1].date : undefined,
      personalBests,
      historyPoints: filteredPoints,
    };
  }

  /**
   * Groups snapshots into monthly buckets for easy display in History headers.
   * Ordered newest month first.
   */
  static groupSnapshotsByMonth(snapshots: readonly WorkoutSnapshot[]): MonthlyWorkoutGroup[] {
    const sorted = this.sortSnapshots(snapshots, 'desc');
    const groupMap = new Map<string, WorkoutSnapshot[]>();

    for (const snap of sorted) {
      const date = new Date(snap.completedAt);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // 1-12
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;

      const existing = groupMap.get(monthKey);
      if (existing) {
        existing.push(snap);
      } else {
        groupMap.set(monthKey, [snap]);
      }
    }

    const groups: MonthlyWorkoutGroup[] = [];
    for (const [monthKey, groupSnapshots] of groupMap.entries()) {
      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const monthLabel = `${MONTH_NAMES[month - 1]} de ${year}`;

      groups.push({
        monthKey,
        monthLabel,
        year,
        month,
        snapshots: groupSnapshots,
      });
    }

    return groups;
  }

  /**
   * Paginates an array of snapshots safely.
   */
  static paginateSnapshots(
    snapshots: readonly WorkoutSnapshot[],
    page = 1,
    pageSize = 15,
  ): PaginatedResult<WorkoutSnapshot> {
    const safePage = Math.max(1, page);
    const safePageSize = Math.max(1, pageSize);
    const totalItems = snapshots.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));

    const adjustedPage = Math.min(safePage, totalPages);
    const startIndex = (adjustedPage - 1) * safePageSize;
    const items = snapshots.slice(startIndex, startIndex + safePageSize);

    return {
      items,
      page: adjustedPage,
      pageSize: safePageSize,
      totalItems,
      totalPages,
    };
  }
}
