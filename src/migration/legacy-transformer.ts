import type { ISODateTimeString } from '../domain/common/types.js';
import { generateDeterministicId } from '../domain/common/id.js';
import type { Exercise } from '../domain/entities/exercise.js';
import type { Routine, RoutineExercise } from '../domain/entities/routine.js';
import type { SetTemplate } from '../domain/entities/set-template.js';
import type { WorkoutSnapshot, SnapshotExercise } from '../domain/entities/workout-snapshot.js';
import type { ExerciseSet } from '../domain/entities/exercise-set.js';
import type { Measurement } from '../domain/entities/measurement.js';
import type { LegacyCompatRecord } from '../repositories/interfaces/database.interface.js';
import type { LegacyState, LegacyWorkoutLog } from './legacy-types.js';
import { calculateSetVolume } from '../domain/math/progress-math.js';
import { SetType } from '../domain/enums/set-type.js';
import { ExerciseRole } from '../domain/enums/exercise-role.js';

export interface TransformedLegacyData {
  readonly exercises: readonly Exercise[];
  readonly routines: readonly Routine[];
  readonly workoutSnapshots: readonly WorkoutSnapshot[];
  readonly measurements: readonly Measurement[];
  readonly legacyCompatRecords: readonly LegacyCompatRecord[];
}

function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isNaN(n) ? undefined : n;
}

function normalizeDateToISO(dateStr: string): ISODateTimeString {
  if (!dateStr) return new Date().toISOString();
  if (dateStr.includes('T')) {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  // Format YYYY-MM-DD
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts.map(Number);
    if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
      const dt = new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0, 0));
      return dt.toISOString();
    }
  }
  return new Date().toISOString();
}

/**
 * Transforms legacy state into pure canonical domain entities.
 * Ensures deterministic IDs, non-destructive parsing, and strict preservation of zero values.
 */
export function transformLegacyState(legacy: LegacyState): TransformedLegacyData {
  const now = new Date().toISOString();
  const exercisesMap = new Map<string, Exercise>();
  const routinesMap = new Map<string, Routine>();
  const workoutSnapshots: WorkoutSnapshot[] = [];
  const measurements: Measurement[] = [];
  const legacyCompatRecords: LegacyCompatRecord[] = [];

  // 1. Extract and transform workouts from workoutLogs
  const workoutLogs: Record<string, LegacyWorkoutLog> = legacy.workoutLogs ?? {};

  for (const [key, log] of Object.entries(workoutLogs)) {
    if (!log || typeof log !== 'object') continue;

    const sessionDate = normalizeDateToISO(log.date);
    const routineKey = log.sessionId || 'default_session';
    const routineId = generateDeterministicId('rt', routineKey);

    // Create routine if not yet created
    if (!routinesMap.has(routineId)) {
      const routineName = routineKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      const plannedExercises: RoutineExercise[] = [];
      let exOrder = 0;

      if (log.exercises) {
        for (const [rawExId] of Object.entries(log.exercises)) {
          const exId = generateDeterministicId('ex', rawExId);
          plannedExercises.push({
            id: generateDeterministicId('rtslot', `${routineId}_${rawExId}`),
            exerciseId: exId,
            order: exOrder++,
            sets: [
              {
                id: generateDeterministicId('set_tmpl', `${routineId}_${rawExId}_0`),
                type: SetType.NORMAL,
                targetReps: 10,
                restSeconds: 90,
              },
            ],
          });
        }
      }

      routinesMap.set(routineId, {
        id: routineId,
        schemaVersion: 1,
        name: routineName,
        createdAt: sessionDate,
        updatedAt: sessionDate,
        exercises: plannedExercises,
      });
    }

    // Process exercises and completed sets in this session
    const snapshotExercises: SnapshotExercise[] = [];
    let sessionTotalVolume = 0;
    let sessionTotalReps = 0;
    let sessionCompletedSetsCount = 0;

    if (log.exercises) {
      let slotIdx = 0;
      for (const [rawExId, exLog] of Object.entries(log.exercises)) {
        const exId = generateDeterministicId('ex', rawExId);

        // Register Exercise entity in exercises map
        if (!exercisesMap.has(exId)) {
          const exDisplayName = rawExId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

          exercisesMap.set(exId, {
            id: exId,
            schemaVersion: 1,
            name: exDisplayName,
            aliases: [rawExId],
            primaryMuscle: 'General',
            secondaryMuscles: [],
            equipment: 'Universal',
            category: 'Strength',
            instructions: [],
            source: 'custom',
            roles: [ExerciseRole.HORIZONTAL_PULL],
            createdAt: sessionDate,
            updatedAt: sessionDate,
          });
        }

        const sets: ExerciseSet[] = [];
        let exVolume = 0;
        let exReps = 0;

        if (exLog.sets && Array.isArray(exLog.sets)) {
          for (let sIdx = 0; sIdx < exLog.sets.length; sIdx++) {
            const rawSet = exLog.sets[sIdx];
            if (!rawSet) continue;

            const loadVal = parseNumber(rawSet.load);
            const repsVal = parseNumber(rawSet.reps);
            const rirVal = parseNumber(rawSet.rir);

            // Valid completed set has done === true and positive reps
            const isCompleted = Boolean(rawSet.done && repsVal !== undefined && repsVal > 0);
            const setId = generateDeterministicId('set', `${key}_${rawExId}_${sIdx}`);

            const completedAt = isCompleted ? sessionDate : undefined;

            const exerciseSet: ExerciseSet = {
              id: setId,
              setNumber: sIdx + 1,
              type: SetType.NORMAL,
              weight: loadVal ?? 0, // Preserve 0 strictly
              reps: repsVal ?? 0,
              completed: isCompleted,
              rpe: rirVal !== undefined ? 10 - rirVal : undefined,
              rir: rirVal,
              painLevel: rawSet.pain,
              completedAt,
              notes: rawSet.note?.trim() || undefined,
            };

            sets.push(exerciseSet);

            if (isCompleted) {
              const vol = calculateSetVolume(exerciseSet);
              exVolume += vol;
              exReps += exerciseSet.reps ?? 0;
              sessionCompletedSetsCount++;
            }
          }
        }

        snapshotExercises.push({
          exerciseId: exId,
          exerciseName: exercisesMap.get(exId)?.name ?? rawExId,
          sets,
          totalVolumeKg: exVolume,
          totalReps: exReps,
        });

        sessionTotalVolume += exVolume;
        sessionTotalReps += exReps;
        slotIdx++;
      }
    }

    // Only create a WorkoutSnapshot if the workout log was marked completed or had completed sets
    if (log.completed || sessionCompletedSetsCount > 0) {
      const snapshotId = generateDeterministicId('snap_wo', key);
      const workoutSnapshot: WorkoutSnapshot = {
        id: snapshotId,
        schemaVersion: 1,
        sourceWorkoutId: generateDeterministicId('active_wo', key),
        sourceRoutineId: routineId,
        title: routinesMap.get(routineId)?.name ?? 'Treino Concluído',
        startedAt: sessionDate,
        completedAt: sessionDate,
        activeDurationMs: 45 * 60 * 1000, // Estimated 45 min for legacy snapshots
        totalDurationMs: 45 * 60 * 1000,
        exercises: snapshotExercises,
        totalVolumeKg: sessionTotalVolume,
        totalReps: sessionTotalReps,
        completedSetsCount: sessionCompletedSetsCount,
        revision: 1,
      };

      workoutSnapshots.push(workoutSnapshot);
    }
  }

  // 2. Transform measurements from legacy.measurements and legacy.daily
  if (legacy.measurements && Array.isArray(legacy.measurements)) {
    for (let i = 0; i < legacy.measurements.length; i++) {
      const m = legacy.measurements[i];
      if (!m || !m.date) continue;

      const capturedAt = normalizeDateToISO(m.date);

      if (m.weight !== undefined && m.weight !== null && m.weight !== '') {
        const weightVal = Number(m.weight);
        if (!Number.isNaN(weightVal)) {
          measurements.push({
            id: generateDeterministicId('meas_weight', `${m.date}_${i}`),
            schemaVersion: 1,
            metric: 'WEIGHT',
            value: weightVal,
            unit: 'kg',
            capturedAt,
            createdAt: capturedAt,
            updatedAt: capturedAt,
          });
        }
      }

      if (m.waist !== undefined && m.waist !== null && m.waist !== '') {
        const waistVal = Number(m.waist);
        if (!Number.isNaN(waistVal)) {
          measurements.push({
            id: generateDeterministicId('meas_waist', `${m.date}_${i}`),
            schemaVersion: 1,
            metric: 'WAIST',
            value: waistVal,
            unit: 'cm',
            capturedAt,
            createdAt: capturedAt,
            updatedAt: capturedAt,
          });
        }
      }
    }
  }

  // Also extract daily weight if not already in measurements
  if (legacy.daily && typeof legacy.daily === 'object') {
    for (const [dateKey, dayEntry] of Object.entries(legacy.daily)) {
      if (!dayEntry || typeof dayEntry !== 'object') continue;
      const weightVal = parseNumber(dayEntry.weight);
      if (weightVal !== undefined) {
        const capturedAt = normalizeDateToISO(dateKey);
        const existingWeight = measurements.some(
          (m) => m.metric === 'WEIGHT' && m.capturedAt.startsWith(dateKey),
        );
        if (!existingWeight) {
          measurements.push({
            id: generateDeterministicId('meas_daily_weight', dateKey),
            schemaVersion: 1,
            metric: 'WEIGHT',
            value: weightVal,
            unit: 'kg',
            capturedAt,
            createdAt: capturedAt,
            updatedAt: capturedAt,
          });
        }
      }
    }
  }

  // 3. Preserve raw unmapped or semi-structured data in legacyCompat
  legacyCompatRecords.push({
    source: 'localStorage:tita_app_v1:raw',
    data: {
      version: legacy.version,
      createdAt: legacy.createdAt,
      daily: legacy.daily,
      photos: legacy.photos,
      history: legacy.history,
      shopping: legacy.shopping,
      ui: legacy.ui,
    },
    migratedAt: now,
  });

  return {
    exercises: Array.from(exercisesMap.values()),
    routines: Array.from(routinesMap.values()),
    workoutSnapshots,
    measurements,
    legacyCompatRecords,
  };
}
