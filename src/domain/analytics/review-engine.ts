import type { EntityId, ISODateTimeString } from '../common/types.js';
import type { WorkoutSnapshot } from '../entities/workout-snapshot.js';
import { isWorkingSet } from '../enums/set-type.js';
import { calculateEpley1RM } from '../math/progress-math.js';
import { SEED_EXERCISES } from '../../data/seed-exercises.js';
import { ProgressEngine } from './progress-engine.js';
import { PlateauDetector } from './plateau-detector.js';
import type {
  ExerciseProgressionItem,
  MonthlyConsistencyMetrics,
  MonthlyMetricChange,
  MonthlyReview,
  MuscleVolumeDistribution,
  PeriodComparison,
  PlateauReport,
  PRAchievedSummary,
  WeeklyReview,
} from './types.js';

export type MuscleLookupFn = (exerciseId: EntityId, exerciseName?: string) => string | undefined;

// Prebuild map of seed exercises for ultra-fast, zero-overhead lookup
const SEED_EXERCISE_MUSCLE_MAP = new Map<string, string>();
for (const ex of SEED_EXERCISES) {
  SEED_EXERCISE_MUSCLE_MAP.set(ex.id, ex.primaryMuscle);
  SEED_EXERCISE_MUSCLE_MAP.set(ex.name.toLowerCase(), ex.primaryMuscle);
}

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

export class ReviewEngine {
  /**
   * Resolves the primary muscle group for an exercise deterministically.
   */
  static resolvePrimaryMuscle(
    exerciseId: EntityId,
    exerciseName?: string,
    customLookup?: MuscleLookupFn,
  ): string {
    if (customLookup) {
      const custom = customLookup(exerciseId, exerciseName);
      if (custom) return custom;
    }
    const byId = SEED_EXERCISE_MUSCLE_MAP.get(exerciseId);
    if (byId) return byId;

    if (exerciseName) {
      const byName = SEED_EXERCISE_MUSCLE_MAP.get(exerciseName.toLowerCase());
      if (byName) return byName;
    }

    return 'Geral';
  }

  /**
   * Generates a deterministic Weekly Review for a given week.
   * If targetDateInput is omitted, uses the latest workout or current date.
   */
  static generateWeeklyReview(
    allSnapshots: readonly WorkoutSnapshot[],
    targetDateInput?: Date | string,
    muscleLookup?: MuscleLookupFn,
  ): WeeklyReview {
    const bounds = this.getISOWeekBounds(targetDateInput ?? this.resolveLatestOrNow(allSnapshots));

    const weekSnapshots = allSnapshots.filter((s) => {
      const t = Date.parse(s.completedAt);
      return t >= bounds.startDate.getTime() && t <= bounds.endDate.getTime();
    });

    // Previous week bounds
    const prevMonday = new Date(bounds.startDate);
    prevMonday.setUTCDate(bounds.startDate.getUTCDate() - 7);
    const prevSunday = new Date(bounds.startDate);
    prevSunday.setUTCMilliseconds(-1);

    const prevWeekSnapshots = allSnapshots.filter((s) => {
      const t = Date.parse(s.completedAt);
      return t >= prevMonday.getTime() && t <= prevSunday.getTime();
    });

    // Totals
    let totalWorkingSets = 0;
    let totalVolumeKg = 0;
    let totalDurationMs = 0;

    for (const snap of weekSnapshots) {
      totalDurationMs += snap.activeDurationMs || 0;
      totalVolumeKg += snap.totalVolumeKg || 0;
      for (const ex of snap.exercises) {
        for (const set of ex.sets) {
          if (set.completed && isWorkingSet(set.type)) {
            totalWorkingSets++;
          }
        }
      }
    }

    // Muscle distribution
    const muscleDistribution = this.computeMuscleDistribution(weekSnapshots, muscleLookup);

    // PRs achieved during this week
    const prsAchieved = this.extractPRsInWindow(
      allSnapshots,
      bounds.startDate.getTime(),
      bounds.endDate.getTime(),
    );

    // Exercise progressions (current week vs previous week / baseline)
    const exerciseProgressions = this.extractWeekProgressions(
      allSnapshots,
      bounds.startDate,
      bounds.endDate,
    );

    // Comparison with previous week
    let comparisonWithPreviousWeek: PeriodComparison | null = null;
    if (prevWeekSnapshots.length > 0 || weekSnapshots.length > 0) {
      let prevVolume = 0;
      let prevSets = 0;
      let prevDuration = 0;

      for (const s of prevWeekSnapshots) {
        prevVolume += s.totalVolumeKg || 0;
        prevDuration += s.activeDurationMs || 0;
        for (const ex of s.exercises) {
          for (const set of ex.sets) {
            if (set.completed && isWorkingSet(set.type)) {
              prevSets++;
            }
          }
        }
      }

      const volumeDeltaPercent =
        prevVolume > 0
          ? Math.round(((totalVolumeKg - prevVolume) / prevVolume) * 1000) / 10
          : totalVolumeKg > 0
            ? 100
            : 0;

      const durationDeltaPercent =
        prevDuration > 0
          ? Math.round(((totalDurationMs - prevDuration) / prevDuration) * 1000) / 10
          : totalDurationMs > 0
            ? 100
            : 0;

      comparisonWithPreviousWeek = {
        previousCount: prevWeekSnapshots.length,
        countDelta: weekSnapshots.length - prevWeekSnapshots.length,
        previousVolumeKg: Math.round(prevVolume * 10) / 10,
        volumeDeltaPercent,
        previousSets: prevSets,
        setsDelta: totalWorkingSets - prevSets,
        previousDurationMs: prevDuration,
        durationDeltaPercent,
      };
    }

    return {
      weekKey: bounds.weekKey,
      weekLabel: bounds.weekLabel,
      startDate: bounds.startDate.toISOString(),
      endDate: bounds.endDate.toISOString(),
      year: bounds.year,
      weekNumber: bounds.weekNumber,
      totalWorkouts: weekSnapshots.length,
      totalWorkingSets,
      totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
      totalDurationMs,
      totalPRs: prsAchieved.length,
      prsAchieved,
      muscleDistribution,
      exerciseProgressions,
      comparisonWithPreviousWeek,
    };
  }

  /**
   * Generates a deterministic Monthly Review for a calendar month.
   */
  static generateMonthlyReview(
    allSnapshots: readonly WorkoutSnapshot[],
    targetMonthOrDate?: string | Date,
    muscleLookup?: MuscleLookupFn,
  ): MonthlyReview {
    const { year, month, monthKey, monthLabel, startDate, endDate } = this.getMonthBounds(
      targetMonthOrDate ?? this.resolveLatestOrNow(allSnapshots),
    );

    const monthSnapshots = allSnapshots.filter((s) => {
      const t = Date.parse(s.completedAt);
      return t >= startDate.getTime() && t <= endDate.getTime();
    });

    // Previous month bounds
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevStartDate = new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0, 0));
    const prevEndDate = new Date(Date.UTC(prevYear, prevMonth, 0, 23, 59, 59, 999));

    const prevMonthSnapshots = allSnapshots.filter((s) => {
      const t = Date.parse(s.completedAt);
      return t >= prevStartDate.getTime() && t <= prevEndDate.getTime();
    });

    // Aggregates
    let totalVolumeKg = 0;
    let totalWorkingSets = 0;
    let totalDurationMs = 0;

    for (const snap of monthSnapshots) {
      totalVolumeKg += snap.totalVolumeKg || 0;
      totalDurationMs += snap.activeDurationMs || 0;
      for (const ex of snap.exercises) {
        for (const set of ex.sets) {
          if (set.completed && isWorkingSet(set.type)) {
            totalWorkingSets++;
          }
        }
      }
    }

    // Weekly frequency
    const daysInMonth = (endDate.getTime() - startDate.getTime()) / 86400000;
    const weeksInMonth = Math.max(1, daysInMonth / 7);
    const weeklyFrequency =
      monthSnapshots.length > 0 ? Math.round((monthSnapshots.length / weeksInMonth) * 10) / 10 : 0;

    // Muscle distribution
    const muscleDistribution = this.computeMuscleDistribution(monthSnapshots, muscleLookup);

    // Consistency metrics: active weeks in month
    const consistency = this.computeMonthlyConsistency(monthSnapshots, startDate, endDate);

    // PRs in month
    const prsInMonth = this.extractPRsInWindow(
      allSnapshots,
      startDate.getTime(),
      endDate.getTime(),
    );

    // Largest Changes compared to previous month
    const largestChanges = this.computeMonthOverMonthChanges(
      allSnapshots,
      startDate,
      endDate,
      prevStartDate,
      prevEndDate,
    );

    // Plateau and anomaly detection up to month end
    const possiblePlateaus = PlateauDetector.detectPlateausAndAnomalies(allSnapshots, endDate);

    // Comparison with previous month
    let comparisonWithPreviousMonth: PeriodComparison | null = null;
    if (prevMonthSnapshots.length > 0 || monthSnapshots.length > 0) {
      let prevVol = 0;
      let prevSets = 0;
      let prevDur = 0;

      for (const s of prevMonthSnapshots) {
        prevVol += s.totalVolumeKg || 0;
        prevDur += s.activeDurationMs || 0;
        for (const ex of s.exercises) {
          for (const set of ex.sets) {
            if (set.completed && isWorkingSet(set.type)) {
              prevSets++;
            }
          }
        }
      }

      const volumeDeltaPercent =
        prevVol > 0
          ? Math.round(((totalVolumeKg - prevVol) / prevVol) * 1000) / 10
          : totalVolumeKg > 0
            ? 100
            : 0;

      const durationDeltaPercent =
        prevDur > 0
          ? Math.round(((totalDurationMs - prevDur) / prevDur) * 1000) / 10
          : totalDurationMs > 0
            ? 100
            : 0;

      comparisonWithPreviousMonth = {
        previousCount: prevMonthSnapshots.length,
        countDelta: monthSnapshots.length - prevMonthSnapshots.length,
        previousVolumeKg: Math.round(prevVol * 10) / 10,
        volumeDeltaPercent,
        previousSets: prevSets,
        setsDelta: totalWorkingSets - prevSets,
        previousDurationMs: prevDur,
        durationDeltaPercent,
      };
    }

    return {
      monthKey,
      monthLabel,
      year,
      month,
      totalSessions: monthSnapshots.length,
      weeklyFrequency,
      totalVolumeKg: Math.round(totalVolumeKg * 10) / 10,
      totalWorkingSets,
      totalDurationMs,
      totalPRs: prsInMonth.length,
      muscleDistribution,
      consistency,
      largestChanges,
      possiblePlateaus,
      comparisonWithPreviousMonth,
    };
  }

  /**
   * Computes muscle distribution (sets & volume percentage).
   */
  static computeMuscleDistribution(
    snapshots: readonly WorkoutSnapshot[],
    muscleLookup?: MuscleLookupFn,
  ): MuscleVolumeDistribution[] {
    const muscleMap = new Map<string, { sets: number; volumeKg: number }>();
    let grandTotalSets = 0;

    for (const snap of snapshots) {
      for (const ex of snap.exercises) {
        const muscle = this.resolvePrimaryMuscle(ex.exerciseId, ex.exerciseName, muscleLookup);

        let entry = muscleMap.get(muscle);
        if (!entry) {
          entry = { sets: 0, volumeKg: 0 };
          muscleMap.set(muscle, entry);
        }

        for (const set of ex.sets) {
          if (!set.completed || !isWorkingSet(set.type)) continue;
          const w = set.weight ?? 0;
          const r = set.reps ?? 0;
          entry.sets++;
          entry.volumeKg += w * r;
          grandTotalSets++;
        }
      }
    }

    const result: MuscleVolumeDistribution[] = [];
    for (const [muscle, data] of muscleMap.entries()) {
      const percentage =
        grandTotalSets > 0 ? Math.round((data.sets / grandTotalSets) * 1000) / 10 : 0;
      result.push({
        muscle,
        sets: data.sets,
        volumeKg: Math.round(data.volumeKg * 10) / 10,
        percentage,
      });
    }

    // Sort by sets descending, volume descending
    return result.sort((a, b) => b.sets - a.sets || b.volumeKg - a.volumeKg);
  }

  /**
   * Lists all available calendar weeks that contain at least one workout snapshot.
   */
  static getAvailableWeeks(
    snapshots: readonly WorkoutSnapshot[],
  ): readonly { weekKey: string; weekLabel: string; startDate: string; endDate: string }[] {
    const map = new Map<
      string,
      { weekKey: string; weekLabel: string; startDate: string; endDate: string; time: number }
    >();

    for (const snap of snapshots) {
      const bounds = this.getISOWeekBounds(snap.completedAt);
      if (!map.has(bounds.weekKey)) {
        map.set(bounds.weekKey, {
          weekKey: bounds.weekKey,
          weekLabel: bounds.weekLabel,
          startDate: bounds.startDate.toISOString(),
          endDate: bounds.endDate.toISOString(),
          time: bounds.startDate.getTime(),
        });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.time - a.time)
      .map(({ weekKey, weekLabel, startDate, endDate }) => ({
        weekKey,
        weekLabel,
        startDate,
        endDate,
      }));
  }

  /**
   * Lists all available calendar months that contain at least one workout snapshot.
   */
  static getAvailableMonths(
    snapshots: readonly WorkoutSnapshot[],
  ): readonly { monthKey: string; monthLabel: string }[] {
    const groups = ProgressEngine.groupSnapshotsByMonth(snapshots);
    return groups.map((g) => ({
      monthKey: g.monthKey,
      monthLabel: g.monthLabel,
    }));
  }

  // --- Internal Helpers ---

  private static resolveLatestOrNow(snapshots: readonly WorkoutSnapshot[]): Date {
    if (snapshots.length === 0) return new Date();
    const sorted = ProgressEngine.sortSnapshots(snapshots, 'desc');
    const t = Date.parse(sorted[0].completedAt);
    return isNaN(t) ? new Date() : new Date(t);
  }

  private static getISOWeekBounds(input: Date | string): {
    year: number;
    weekNumber: number;
    weekKey: string;
    weekLabel: string;
    startDate: Date;
    endDate: Date;
  } {
    const d = new Date(input);
    const time = isNaN(d.getTime()) ? new Date() : d;

    // Get Monday 00:00:00.000 UTC
    const day = time.getUTCDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(time);
    monday.setUTCDate(time.getUTCDate() + diffToMonday);
    monday.setUTCHours(0, 0, 0, 0);

    // Get Sunday 23:59:59.999 UTC
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);
    sunday.setUTCHours(23, 59, 59, 999);

    // ISO week number calculation based on Thursday of the week
    const thursday = new Date(monday);
    thursday.setUTCDate(monday.getUTCDate() + 3);
    const firstJan = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
    const firstMon = new Date(firstJan);
    firstMon.setUTCDate(firstJan.getUTCDate() - (firstJan.getUTCDay() || 7) + 1);

    const weekNumber = 1 + Math.round((thursday.getTime() - firstMon.getTime()) / 604800000);
    const year = thursday.getUTCFullYear();
    const weekKey = `${year}-W${String(weekNumber).padStart(2, '0')}`;

    const startStr = `${String(monday.getUTCDate()).padStart(2, '0')}/${String(monday.getUTCMonth() + 1).padStart(2, '0')}`;
    const endStr = `${String(sunday.getUTCDate()).padStart(2, '0')}/${String(sunday.getUTCMonth() + 1).padStart(2, '0')}`;
    const weekLabel = `Semana ${weekNumber} (${startStr} - ${endStr})`;

    return {
      year,
      weekNumber,
      weekKey,
      weekLabel,
      startDate: monday,
      endDate: sunday,
    };
  }

  private static getMonthBounds(input: Date | string): {
    year: number;
    month: number;
    monthKey: string;
    monthLabel: string;
    startDate: Date;
    endDate: Date;
  } {
    if (typeof input === 'string' && /^\d{4}-\d{2}$/.test(input)) {
      const [yStr, mStr] = input.split('-');
      const year = parseInt(yStr, 10);
      const month = parseInt(mStr, 10);
      const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
      return {
        year,
        month,
        monthKey: input,
        monthLabel: `${MONTH_NAMES[month - 1]} de ${year}`,
        startDate,
        endDate,
      };
    }

    const d = new Date(input);
    const date = isNaN(d.getTime()) ? new Date() : d;
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    return {
      year,
      month,
      monthKey,
      monthLabel: `${MONTH_NAMES[month - 1]} de ${year}`,
      startDate,
      endDate,
    };
  }

  private static extractPRsInWindow(
    allSnapshots: readonly WorkoutSnapshot[],
    startMs: number,
    endMs: number,
  ): PRAchievedSummary[] {
    const prs: PRAchievedSummary[] = [];
    const uniqueExercises = ProgressEngine.getUniqueExercises(allSnapshots);

    const categoryLabels: Record<string, { label: string; unit: string }> = {
      HEAVIEST_WEIGHT: { label: 'Maior Carga', unit: 'kg' },
      ESTIMATED_1RM: { label: 'e1RM Estimado', unit: 'kg' },
      BEST_SET_VOLUME: { label: 'Volume de Série', unit: 'kg' },
      BEST_SESSION_VOLUME: { label: 'Volume de Sessão', unit: 'kg' },
      MOST_REPS_AT_WEIGHT: { label: 'Mais Repetições', unit: 'reps' },
    };

    for (const ex of uniqueExercises) {
      const summary = ProgressEngine.extractExerciseProgress(allSnapshots, ex.id);
      for (const pt of summary.historyPoints) {
        const ptTime = Date.parse(pt.date);
        if (ptTime >= startMs && ptTime <= endMs && pt.isPR) {
          for (const cat of pt.prCategories) {
            const meta = categoryLabels[cat] || { label: cat, unit: '' };
            let value = pt.maxWeightKg;
            if (cat === 'ESTIMATED_1RM') value = pt.estimated1RM;
            if (cat === 'BEST_SET_VOLUME') value = pt.totalVolumeKg;
            if (cat === 'MOST_REPS_AT_WEIGHT') value = pt.maxReps;

            prs.push({
              exerciseId: ex.id,
              exerciseName: ex.name,
              category: cat,
              categoryLabel: meta.label,
              value,
              unit: meta.unit,
              date: pt.date,
            });
          }
        }
      }
    }

    return prs;
  }

  private static extractWeekProgressions(
    allSnapshots: readonly WorkoutSnapshot[],
    startDate: Date,
    endDate: Date,
  ): ExerciseProgressionItem[] {
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const uniqueExercises = ProgressEngine.getUniqueExercises(allSnapshots);
    const progressions: ExerciseProgressionItem[] = [];

    for (const ex of uniqueExercises) {
      const summary = ProgressEngine.extractExerciseProgress(allSnapshots, ex.id);
      const pointsInWeek = summary.historyPoints.filter((pt) => {
        const t = Date.parse(pt.date);
        return t >= startMs && t <= endMs;
      });

      if (pointsInWeek.length === 0) continue;

      const currentBestE1RM = Math.max(...pointsInWeek.map((p) => p.estimated1RM));

      // Look for previous best before this week
      const priorPoints = summary.historyPoints.filter((pt) => {
        return Date.parse(pt.date) < startMs;
      });

      if (priorPoints.length > 0) {
        const priorBestE1RM = priorPoints[priorPoints.length - 1].estimated1RM;
        const deltaKg = Math.round((currentBestE1RM - priorBestE1RM) * 10) / 10;
        const deltaPercent =
          priorBestE1RM > 0 ? Math.round((deltaKg / priorBestE1RM) * 1000) / 10 : 0;

        progressions.push({
          exerciseId: ex.id,
          exerciseName: ex.name,
          previousE1RM: priorBestE1RM,
          currentE1RM: currentBestE1RM,
          deltaKg,
          deltaPercent,
        });
      }
    }

    // Sort by delta percent descending
    return progressions.sort((a, b) => b.deltaPercent - a.deltaPercent);
  }

  private static computeMonthlyConsistency(
    monthSnapshots: readonly WorkoutSnapshot[],
    startDate: Date,
    endDate: Date,
  ): MonthlyConsistencyMetrics {
    const totalDays = (endDate.getTime() - startDate.getTime()) / 86400000;
    const totalWeeksInMonth = Math.ceil(totalDays / 7);

    // Check which weeks in this month had >= 1 workout
    const activeWeekSet = new Set<string>();
    for (const s of monthSnapshots) {
      const b = this.getISOWeekBounds(s.completedAt);
      activeWeekSet.add(b.weekKey);
    }

    const activeWeeksCount = activeWeekSet.size;
    const consistencyPercentage =
      totalWeeksInMonth > 0 ? Math.round((activeWeeksCount / totalWeeksInMonth) * 100) : 0;
    const averageSessionsPerActiveWeek =
      activeWeeksCount > 0 ? Math.round((monthSnapshots.length / activeWeeksCount) * 10) / 10 : 0;

    return {
      activeWeeksCount,
      totalWeeksInMonth,
      consistencyPercentage,
      averageSessionsPerActiveWeek,
    };
  }

  private static computeMonthOverMonthChanges(
    allSnapshots: readonly WorkoutSnapshot[],
    curStart: Date,
    curEnd: Date,
    prevStart: Date,
    prevEnd: Date,
  ): MonthlyMetricChange[] {
    const curStartMs = curStart.getTime();
    const curEndMs = curEnd.getTime();
    const prevStartMs = prevStart.getTime();
    const prevEndMs = prevEnd.getTime();

    const uniqueExercises = ProgressEngine.getUniqueExercises(allSnapshots);
    const changes: MonthlyMetricChange[] = [];

    for (const ex of uniqueExercises) {
      const summary = ProgressEngine.extractExerciseProgress(allSnapshots, ex.id);

      const curPoints = summary.historyPoints.filter((p) => {
        const t = Date.parse(p.date);
        return t >= curStartMs && t <= curEndMs;
      });

      const prevPoints = summary.historyPoints.filter((p) => {
        const t = Date.parse(p.date);
        return t >= prevStartMs && t <= prevEndMs;
      });

      if (curPoints.length > 0 && prevPoints.length > 0) {
        const curE1RM = Math.max(...curPoints.map((p) => p.estimated1RM));
        const prevE1RM = Math.max(...prevPoints.map((p) => p.estimated1RM));

        if (prevE1RM > 0 && curE1RM !== prevE1RM) {
          const deltaPercent = Math.round(((curE1RM - prevE1RM) / prevE1RM) * 1000) / 10;
          changes.push({
            exerciseId: ex.id,
            exerciseName: ex.name,
            metric: 'e1RM',
            previousValue: prevE1RM,
            currentValue: curE1RM,
            deltaPercent,
            direction: deltaPercent >= 0 ? 'up' : 'down',
          });
        }
      }
    }

    // Sort by absolute delta percent descending
    return changes.sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent));
  }
}
