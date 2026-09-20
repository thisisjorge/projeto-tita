import type { EntityId } from '../common/types.js';
import type { ExerciseSet } from '../entities/exercise-set.js';
import { isWorkingSet } from '../enums/set-type.js';
import { calculateEpley1RM, calculateSetVolume } from './progress-math.js';

/** Categories of Personal Records (PRs) */
export type PRCategory =
  'HEAVIEST_WEIGHT' | 'MOST_REPS_AT_WEIGHT' | 'ESTIMATED_1RM' | 'BEST_SET_VOLUME';

/** Information describing an achieved Personal Record */
export interface PRRecord {
  readonly exerciseId: EntityId;
  readonly category: PRCategory;
  readonly value: number;
  readonly previousBestValue: number;
  readonly achievedBySet: ExerciseSet;
}

/**
 * Detects new personal records achieved in a collection of current sets compared against historical performance.
 * Pure deterministic function with zero I/O side-effects.
 *
 * @param exerciseId Target exercise
 * @param currentSets Sets performed in the current session
 * @param historicalSets Historical completed sets for the same exercise
 */
export function detectPersonalRecords(
  exerciseId: EntityId,
  currentSets: readonly ExerciseSet[],
  historicalSets: readonly ExerciseSet[],
): readonly PRRecord[] {
  const completedCurrent = currentSets.filter(
    (s) => s.completed && (s.reps ?? 0) > 0 && isWorkingSet(s.type),
  );

  if (completedCurrent.length === 0) {
    return [];
  }

  const completedHistory = historicalSets.filter(
    (s) => s.completed && (s.reps ?? 0) > 0 && isWorkingSet(s.type),
  );

  // 1. Historical bests
  let histMaxWeight = 0;
  let histMaxE1RM = 0;
  let histMaxSetVolume = 0;
  const histMaxRepsAtWeight = new Map<number, number>();

  for (const s of completedHistory) {
    const w = s.weight ?? 0;
    const r = s.reps ?? 0;
    if (w > histMaxWeight) histMaxWeight = w;

    const e1rm = calculateEpley1RM(w, r);
    if (e1rm > histMaxE1RM) histMaxE1RM = e1rm;

    const vol = calculateSetVolume(s);
    if (vol > histMaxSetVolume) histMaxSetVolume = vol;

    const prevReps = histMaxRepsAtWeight.get(w) ?? 0;
    if (r > prevReps) histMaxRepsAtWeight.set(w, r);
  }

  const newPRs: PRRecord[] = [];

  // Track session running bests to only flag improvements
  let currentMaxWeight = histMaxWeight;
  let currentMaxE1RM = histMaxE1RM;
  let currentMaxSetVolume = histMaxSetVolume;

  for (const set of completedCurrent) {
    const w = set.weight ?? 0;
    const r = set.reps ?? 0;

    // A. Heaviest Weight
    if (w > currentMaxWeight && w > 0) {
      newPRs.push({
        exerciseId,
        category: 'HEAVIEST_WEIGHT',
        value: w,
        previousBestValue: histMaxWeight,
        achievedBySet: set,
      });
      currentMaxWeight = w;
    }

    // B. Estimated 1RM
    const e1rm = calculateEpley1RM(w, r);
    if (e1rm > currentMaxE1RM && e1rm > 0) {
      newPRs.push({
        exerciseId,
        category: 'ESTIMATED_1RM',
        value: e1rm,
        previousBestValue: histMaxE1RM,
        achievedBySet: set,
      });
      currentMaxE1RM = e1rm;
    }

    // C. Best Set Volume
    const setVol = calculateSetVolume(set);
    if (setVol > currentMaxSetVolume && setVol > 0) {
      newPRs.push({
        exerciseId,
        category: 'BEST_SET_VOLUME',
        value: setVol,
        previousBestValue: histMaxSetVolume,
        achievedBySet: set,
      });
      currentMaxSetVolume = setVol;
    }

    // D. Most Reps at Weight
    const prevBestReps = histMaxRepsAtWeight.get(w) ?? 0;
    if (r > prevBestReps && w > 0) {
      newPRs.push({
        exerciseId,
        category: 'MOST_REPS_AT_WEIGHT',
        value: r,
        previousBestValue: prevBestReps,
        achievedBySet: set,
      });
      histMaxRepsAtWeight.set(w, r);
    }
  }

  return newPRs;
}
