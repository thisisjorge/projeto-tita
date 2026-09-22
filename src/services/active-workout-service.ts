import { generateId } from '../domain/common/id.js';
import type { EntityId, ISODateTimeString } from '../domain/common/types.js';
import type {
  ActiveWorkout,
  ActiveWorkoutExercise,
  PauseInterval,
} from '../domain/entities/active-workout.js';
import type { ExerciseSet } from '../domain/entities/exercise-set.js';
import type { RestTimer } from '../domain/entities/rest-timer.js';
import type { WorkoutSnapshot, SnapshotExercise } from '../domain/entities/workout-snapshot.js';
import { SetType } from '../domain/enums/set-type.js';
import { TimerStatus } from '../domain/enums/timer-status.js';
import { WorkoutStatus } from '../domain/enums/workout-status.js';
import {
  calculateActiveDurationMs,
  calculateWorkoutSummary,
} from '../domain/math/progress-math.js';
import {
  calculateRemainingMs,
  createRestTimer,
  pauseRestTimer,
  resumeRestTimer,
  addTimerSeconds,
} from '../domain/math/timer-math.js';
import {
  validateActiveWorkout,
  validateWorkoutFinalization,
} from '../domain/validators/workout-validator.js';
import { validateExerciseSet } from '../domain/validators/set-validator.js';
import type { TitaDatabase } from '../repositories/interfaces/database.interface.js';
import { IdbActiveWorkoutRepository } from '../repositories/indexeddb/idb-workout-repository.js';
import { IdbMetadataRepository } from '../repositories/indexeddb/idb-metadata-repository.js';

import type { RoutineGroup } from '../domain/entities/routine.js';
import { GroupType } from '../domain/enums/group-type.js';
import type { Exercise } from '../domain/entities/exercise.js';
import {
  substituteFutureSets,
  substitutionCatalogId,
  type SubstitutionReason,
} from '../domain/workout/substitution.js';

export const ACTIVE_TIMER_KEY = 'active_rest_timer';

export type StartWorkoutResult =
  | { type: 'started'; workout: ActiveWorkout }
  | { type: 'mustResume'; existing: ActiveWorkout }
  | { type: 'failed'; error: Error };

export interface StartWorkoutOptions {
  title?: string;
  sourceRoutineId?: EntityId;
  exercises?: readonly ActiveWorkoutExercise[];
  groups?: readonly RoutineGroup[];
  nowMs?: number;
}

export class ActiveWorkoutService {
  private activeRepo: IdbActiveWorkoutRepository;
  private metaRepo: IdbMetadataRepository;
  private setWriteQueue: Promise<void> = Promise.resolve();

  constructor(private readonly db: TitaDatabase) {
    this.activeRepo = new IdbActiveWorkoutRepository(db);
    this.metaRepo = new IdbMetadataRepository(db);
  }

  /**
   * Starts a new active workout session.
   * Enforces invariant: At most one unfinished workout (IN_PROGRESS or PAUSED) may exist.
   * If an unfinished workout already exists, returns { type: 'mustResume', existing }.
   */
  async startWorkout(options: StartWorkoutOptions = {}): Promise<StartWorkoutResult> {
    try {
      const existing = await this.activeRepo.getActive();
      if (existing) {
        return { type: 'mustResume', existing };
      }

      const nowMs = options.nowMs ?? Date.now();
      const startedAt = new Date(nowMs).toISOString();
      const id = generateId('workout');
      const title = options.title?.trim() ? options.title.trim() : 'Treino do Dia';

      const workout: ActiveWorkout = {
        id,
        schemaVersion: 1,
        title,
        sourceRoutineId: options.sourceRoutineId,
        status: WorkoutStatus.IN_PROGRESS,
        startedAt,
        createdAt: startedAt,
        updatedAt: startedAt,
        pauseIntervals: [],
        exercises: options.exercises ?? [],
        groups: options.groups ?? [],
        notes: '',
      };

      const validation = validateActiveWorkout(workout);
      if (!validation.valid) {
        return {
          type: 'failed',
          error: new Error(`Invalid active workout: ${validation.errors.join(', ')}`),
        };
      }

      await this.activeRepo.save(workout);
      return { type: 'started', workout };
    } catch (err) {
      return {
        type: 'failed',
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }
  }

  /**
   * Retrieves the currently unfinished workout, if any.
   */
  async getActiveWorkout(): Promise<ActiveWorkout | null> {
    return this.activeRepo.getActive();
  }

  /**
   * Retrieves a workout session by its ID.
   */
  async getWorkoutById(id: EntityId): Promise<ActiveWorkout | null> {
    return this.activeRepo.getById(id);
  }

  /**
   * Resumes a paused workout session, recording the resume timestamp.
   */
  async resumeWorkout(workoutId: EntityId, nowMs = Date.now()): Promise<ActiveWorkout> {
    const workout = await this.activeRepo.getById(workoutId);
    if (!workout) {
      throw new Error(`Workout not found: ${workoutId}`);
    }

    if (workout.status === WorkoutStatus.COMPLETED) {
      throw new Error(`Cannot resume completed workout: ${workoutId}`);
    }

    let updatedIntervals = [...workout.pauseIntervals];
    if (workout.status === WorkoutStatus.PAUSED && updatedIntervals.length > 0) {
      const last = updatedIntervals[updatedIntervals.length - 1];
      if (last && !last.resumedAt) {
        updatedIntervals[updatedIntervals.length - 1] = {
          ...last,
          resumedAt: new Date(nowMs).toISOString(),
        };
      }
    }

    const updated: ActiveWorkout = {
      ...workout,
      status: WorkoutStatus.IN_PROGRESS,
      pauseIntervals: updatedIntervals,
      updatedAt: new Date(nowMs).toISOString(),
    };

    await this.activeRepo.save(updated);

    // Also resume active timer if currently paused
    await this.resumeTimer(nowMs);

    return updated;
  }

  /**
   * Pauses an active workout session, opening a new pause interval.
   */
  async pauseWorkout(workoutId: EntityId, nowMs = Date.now()): Promise<ActiveWorkout> {
    const workout = await this.activeRepo.getById(workoutId);
    if (!workout) {
      throw new Error(`Workout not found: ${workoutId}`);
    }

    if (workout.status !== WorkoutStatus.IN_PROGRESS) {
      return workout;
    }

    const newPause: PauseInterval = {
      pausedAt: new Date(nowMs).toISOString(),
    };

    const updated: ActiveWorkout = {
      ...workout,
      status: WorkoutStatus.PAUSED,
      pauseIntervals: [...workout.pauseIntervals, newPause],
      updatedAt: new Date(nowMs).toISOString(),
    };

    await this.activeRepo.save(updated);

    // Also pause active timer if running
    await this.pauseTimer(nowMs);

    return updated;
  }

  /**
   * Discards an active workout and cleans up any running timer.
   */
  async discardWorkout(workoutId: EntityId): Promise<void> {
    await this.activeRepo.delete(workoutId);
    await this.metaRepo.delete(ACTIVE_TIMER_KEY);
  }

  /**
   * Updates an individual set in the active workout.
   * Persists immediately to IndexedDB.
   * Preserves 0 as a valid numeric value (0 !== undefined).
   * Ensures completedAt uniqueness: only registered on initial completion.
   * Automatically triggers RestTimer if targetRestSeconds is defined.
   */
  updateSet(
    workoutId: EntityId,
    exerciseId: EntityId,
    setId: EntityId,
    updates: Partial<ExerciseSet>,
    nowMs = Date.now(),
  ): Promise<ActiveWorkout> {
    // Each read must see the preceding edit, including rapid changes across fields.
    const result = this.setWriteQueue.then(() =>
      this.persistSetUpdate(workoutId, exerciseId, setId, updates, nowMs),
    );
    this.setWriteQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  private async persistSetUpdate(
    workoutId: EntityId,
    exerciseId: EntityId,
    setId: EntityId,
    updates: Partial<ExerciseSet>,
    nowMs = Date.now(),
  ): Promise<ActiveWorkout> {
    const workout = await this.activeRepo.getById(workoutId);
    if (!workout) {
      throw new Error(`Workout not found: ${workoutId}`);
    }

    const exerciseIndex = workout.exercises.findIndex(
      (e) => e.id === exerciseId || e.exerciseId === exerciseId,
    );
    if (exerciseIndex === -1) {
      throw new Error(`Exercise not found in workout: ${exerciseId}`);
    }

    const exercise = workout.exercises[exerciseIndex];
    if (!exercise) {
      throw new Error(`Exercise undefined at index ${exerciseIndex}`);
    }

    const setIndex = exercise.sets.findIndex((s) => s.id === setId);
    if (setIndex === -1) {
      throw new Error(`Set not found in exercise: ${setId}`);
    }

    const existingSet = exercise.sets[setIndex];
    if (!existingSet) {
      throw new Error(`Set undefined at index ${setIndex}`);
    }

    // Determine completion and completedAt
    let completed = updates.completed !== undefined ? updates.completed : existingSet.completed;
    let completedAt = existingSet.completedAt;

    if (completed && !existingSet.completed) {
      // First time completing set -> record unique completedAt
      completedAt = new Date(nowMs).toISOString();
    } else if (!completed && existingSet.completed) {
      // Uncompleting set -> clear completedAt
      completedAt = undefined;
    }

    const mergedSet: ExerciseSet = {
      ...existingSet,
      ...updates,
      completed,
      completedAt,
    };

    // Validate the updated set
    const validation = validateExerciseSet(mergedSet);
    if (!validation.valid) {
      throw new Error(`Invalid exercise set: ${validation.errors.join(', ')}`);
    }

    const updatedSets = [...exercise.sets];
    updatedSets[setIndex] = mergedSet;

    const updatedExercises = [...workout.exercises];
    updatedExercises[exerciseIndex] = {
      ...exercise,
      sets: updatedSets,
    };

    const updatedWorkout: ActiveWorkout = {
      ...workout,
      exercises: updatedExercises,
      updatedAt: new Date(nowMs).toISOString(),
    };

    await this.activeRepo.save(updatedWorkout);

    // If set was just completed, trigger deadline rest timer if target is defined
    if (completed && !existingSet.completed) {
      const restTarget =
        mergedSet.restTargetSeconds ?? exercise.targetRestSeconds ?? updates.restTargetSeconds ?? 0;
      if (restTarget > 0) {
        await this.startRestTimer(restTarget, workout.id, nowMs);
      }
    }

    return updatedWorkout;
  }

  /**
   * Appends an exercise slot to the active workout.
   */
  async addExercise(
    workoutId: EntityId,
    exercise: {
      exerciseId: EntityId;
      exerciseName: string;
      targetRestSeconds?: number;
      initialSetsCount?: number;
      initialSets?: readonly Partial<ExerciseSet>[];
    },
  ): Promise<ActiveWorkout> {
    const workout = await this.activeRepo.getById(workoutId);
    if (!workout) {
      throw new Error(`Workout not found: ${workoutId}`);
    }

    const slotId = generateId('slot');
    const order = workout.exercises.length + 1;
    const initialSetsCount = exercise.initialSetsCount ?? 3;

    const sets: ExerciseSet[] = [];
    for (let i = 1; i <= initialSetsCount; i++) {
      const init = exercise.initialSets?.[i - 1];
      sets.push({
        id: generateId('set'),
        setNumber: i,
        type: init?.type ?? SetType.NORMAL,
        weight: init?.weight,
        reps: init?.reps,
        completed: false,
      });
    }

    const newExerciseSlot: ActiveWorkoutExercise = {
      id: slotId,
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseName,
      order,
      sets,
      targetRestSeconds: exercise.targetRestSeconds ?? 90,
    };

    const updated: ActiveWorkout = {
      ...workout,
      exercises: [...workout.exercises, newExerciseSlot],
      updatedAt: new Date().toISOString(),
    };

    await this.activeRepo.save(updated);
    return updated;
  }

  /**
   * Adds an additional set to an exercise in the active workout.
   */
  async addSet(
    workoutId: EntityId,
    exerciseId: EntityId,
    type: SetType = SetType.NORMAL,
  ): Promise<ActiveWorkout> {
    const workout = await this.activeRepo.getById(workoutId);
    if (!workout) throw new Error(`Workout not found: ${workoutId}`);

    const exIndex = workout.exercises.findIndex(
      (e) => e.id === exerciseId || e.exerciseId === exerciseId,
    );
    if (exIndex === -1) throw new Error(`Exercise not found: ${exerciseId}`);

    const exercise = workout.exercises[exIndex]!;
    const nextSetNumber = exercise.sets.length + 1;

    // Inherit previous set's load and reps if present for convenience
    const lastSet = exercise.sets[exercise.sets.length - 1];
    const inheritedWeight = lastSet?.weight;
    const inheritedReps = lastSet?.reps;

    const newSet: ExerciseSet = {
      id: generateId('set'),
      setNumber: nextSetNumber,
      type,
      weight: inheritedWeight,
      reps: inheritedReps,
      completed: false,
    };

    const updatedExercises = [...workout.exercises];
    updatedExercises[exIndex] = {
      ...exercise,
      sets: [...exercise.sets, newSet],
    };

    const updated: ActiveWorkout = {
      ...workout,
      exercises: updatedExercises,
      updatedAt: new Date().toISOString(),
    };

    await this.activeRepo.save(updated);
    return updated;
  }

  /**
   * Removes a set from an exercise, re-indexing remaining setNumbers.
   */
  async removeSet(
    workoutId: EntityId,
    exerciseId: EntityId,
    setId: EntityId,
  ): Promise<ActiveWorkout> {
    const workout = await this.activeRepo.getById(workoutId);
    if (!workout) throw new Error(`Workout not found: ${workoutId}`);

    const exIndex = workout.exercises.findIndex(
      (e) => e.id === exerciseId || e.exerciseId === exerciseId,
    );
    if (exIndex === -1) throw new Error(`Exercise not found: ${exerciseId}`);

    const exercise = workout.exercises[exIndex]!;
    const filteredSets = exercise.sets
      .filter((s) => s.id !== setId)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));

    const updatedExercises = [...workout.exercises];
    updatedExercises[exIndex] = {
      ...exercise,
      sets: filteredSets,
    };

    const updated: ActiveWorkout = {
      ...workout,
      exercises: updatedExercises,
      updatedAt: new Date().toISOString(),
    };

    await this.activeRepo.save(updated);
    return updated;
  }

  /**
   * Finalizes an active workout into an immutable WorkoutSnapshot.
   * Transactional & Idempotent: If a snapshot for this workout already exists,
   * it returns the existing snapshot without duplicating records.
   * If finalization fails validation, the ActiveWorkout remains untouched and recoverable.
   */
  async finalizeWorkout(workoutId: EntityId, nowMs = Date.now()): Promise<WorkoutSnapshot> {
    return this.db.transaction(
      ['activeWorkouts', 'workoutSnapshots', 'metadata'],
      'readwrite',
      async (tx) => {
        const snapshotsStore = tx.getStore<WorkoutSnapshot>('workoutSnapshots');
        const activeStore = tx.getStore<ActiveWorkout>('activeWorkouts');
        const metaStore = tx.getStore<{ key: string; value: unknown }>('metadata');

        // 1. Idempotency check: Look up existing snapshot by sourceWorkoutId or id
        const allSnapshots = await snapshotsStore.getAll();
        const existingSnapshot = allSnapshots.find(
          (s) => s.id === workoutId || s.sourceWorkoutId === workoutId,
        );
        if (existingSnapshot) {
          return existingSnapshot;
        }

        // 2. Fetch active workout
        const active = await activeStore.get(workoutId);
        if (!active) {
          throw new Error(`WORKOUT_NOT_FOUND: ${workoutId}`);
        }

        // 3. Validate finalization prerequisites
        const validation = validateWorkoutFinalization(active);
        if (!validation.valid) {
          throw new Error(`FINALIZATION_FAILED: ${validation.errors.join(', ')}`);
        }

        // 4. Calculate metrics using pure domain math
        const completedAt = new Date(nowMs).toISOString();
        const activeDurationMs = calculateActiveDurationMs(active, nowMs);
        const startMs = Date.parse(active.startedAt);
        const totalDurationMs = Math.max(0, nowMs - (isNaN(startMs) ? nowMs : startMs));
        const summary = calculateWorkoutSummary(active.exercises);

        // 5. Freeze snapshot exercises
        const snapshotExercises: SnapshotExercise[] = active.exercises.map((ex) => {
          let exVolume = 0;
          let exReps = 0;
          for (const s of ex.sets) {
            if (s.completed) {
              exReps += s.reps ?? 0;
              if (s.weight !== undefined && s.reps !== undefined) {
                exVolume += s.weight * s.reps;
              }
            }
          }
          return {
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            sets: [...ex.sets],
            totalVolumeKg: Math.round(exVolume * 10) / 10,
            totalReps: exReps,
          };
        });

        // 6. Construct immutable WorkoutSnapshot
        const snapshot: WorkoutSnapshot = {
          id: generateId('snapshot'),
          schemaVersion: 1,
          sourceWorkoutId: active.id,
          sourceRoutineId: active.sourceRoutineId,
          title: active.title,
          startedAt: active.startedAt,
          completedAt,
          activeDurationMs,
          totalDurationMs,
          exercises: snapshotExercises,
          totalVolumeKg: summary.totalVolumeKg,
          totalReps: summary.totalReps,
          completedSetsCount: summary.completedSetsCount,
          notes: active.notes,
          revision: 1,
          substitutions: active.substitutions?.map((event) => ({ ...event })),
        };

        // 7. Write snapshot and update active workout status atomically
        await snapshotsStore.put(snapshot);
        await activeStore.put({
          ...active,
          status: WorkoutStatus.COMPLETED,
          endedAt: completedAt,
          updatedAt: completedAt,
        });

        // Clean up active rest timer
        await metaStore.delete(ACTIVE_TIMER_KEY);

        return snapshot;
      },
    );
  }

  /** Read and replace atomically, including any set completed while the chooser was open. */
  async substituteExercise(
    workoutId: string,
    slotId: string,
    replacementId: string,
    reason: SubstitutionReason,
    nowMs = Date.now(),
  ): Promise<ActiveWorkout> {
    return this.db.transaction(
      ['activeWorkouts', 'exercises', 'workoutSnapshots'],
      'readwrite',
      async (tx) => {
        const store = tx.getStore<ActiveWorkout>('activeWorkouts');
        const workout = await store.get(workoutId);
        const slot = workout?.exercises.find((s) => s.id === slotId);
        const catalog = tx.getStore<Exercise>('exercises');
        const current = slot ? await catalog.get(substitutionCatalogId(slot.exerciseId)) : null;
        const replacement = await catalog.get(replacementId);
        if (!workout || !current || !replacement)
          throw new Error('Exercício indisponível no catálogo local.');
        const snapshots = await tx.getStore<WorkoutSnapshot>('workoutSnapshots').getAll();
        snapshots.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
        const previousSets =
          snapshots
            .flatMap((s) => s.exercises)
            .find((e) => e.exerciseId === replacementId && e.sets.some((s) => s.completed))?.sets ??
          [];
        const updated = substituteFutureSets(
          workout,
          slotId,
          { ...current, id: slot!.exerciseId },
          replacement,
          reason,
          previousSets,
          nowMs,
        );
        await store.put(updated);
        return updated;
      },
    );
  }

  // --- Deadline-Based Rest Timer Management ---

  /**
   * Starts or restarts the rest timer with a target duration.
   * Persists absolute deadlineAt = now + seconds.
   */
  async startRestTimer(
    durationSeconds: number,
    workoutId?: EntityId,
    nowMs = Date.now(),
  ): Promise<RestTimer> {
    const timer = createRestTimer(durationSeconds, workoutId, nowMs);
    await this.metaRepo.set(ACTIVE_TIMER_KEY, timer);
    return timer;
  }

  /**
   * Retrieves current RestTimer, evaluating remainingMs against nowMs.
   */
  async getActiveTimer(nowMs = Date.now()): Promise<RestTimer | null> {
    const timer = await this.metaRepo.get<RestTimer>(ACTIVE_TIMER_KEY);
    if (!timer) return null;

    // Check if running timer has expired
    if (timer.status === TimerStatus.RUNNING) {
      const remaining = calculateRemainingMs(timer, nowMs);
      if (remaining <= 0) {
        const completedTimer: RestTimer = {
          ...timer,
          status: TimerStatus.COMPLETED,
        };
        await this.metaRepo.set(ACTIVE_TIMER_KEY, completedTimer);
        return completedTimer;
      }
    }

    return timer;
  }

  /**
   * Pauses the active rest timer.
   */
  async pauseTimer(nowMs = Date.now()): Promise<RestTimer | null> {
    const timer = await this.metaRepo.get<RestTimer>(ACTIVE_TIMER_KEY);
    if (!timer || timer.status !== TimerStatus.RUNNING) return timer;

    const paused = pauseRestTimer(timer, nowMs);
    await this.metaRepo.set(ACTIVE_TIMER_KEY, paused);
    return paused;
  }

  /**
   * Resumes the paused rest timer.
   */
  async resumeTimer(nowMs = Date.now()): Promise<RestTimer | null> {
    const timer = await this.metaRepo.get<RestTimer>(ACTIVE_TIMER_KEY);
    if (!timer || timer.status !== TimerStatus.PAUSED) return timer;

    const resumed = resumeRestTimer(timer, nowMs);
    await this.metaRepo.set(ACTIVE_TIMER_KEY, resumed);
    return resumed;
  }

  /**
   * Adds additional seconds to the rest timer.
   */
  async addTimerSeconds(additionalSeconds: number, nowMs = Date.now()): Promise<RestTimer | null> {
    const timer = await this.metaRepo.get<RestTimer>(ACTIVE_TIMER_KEY);
    if (!timer) {
      return this.startRestTimer(additionalSeconds, undefined, nowMs);
    }

    const updated = addTimerSeconds(timer, additionalSeconds, nowMs);
    await this.metaRepo.set(ACTIVE_TIMER_KEY, updated);
    return updated;
  }

  /**
   * Skips and clears the active rest timer.
   */
  async skipTimer(): Promise<void> {
    await this.metaRepo.delete(ACTIVE_TIMER_KEY);
  }

  /**
   * Retrieves previous performance for an exercise from recent snapshots.
   * Returns formatted string like "80kg x 8" or null if no prior record.
   */
  async getPreviousPerformance(exerciseId: EntityId): Promise<string | null> {
    return this.db.transaction(['workoutSnapshots'], 'readonly', async (tx) => {
      const snapshots = await tx.getStore<WorkoutSnapshot>('workoutSnapshots').getAll();
      // Sort snapshots by completedAt descending
      snapshots.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );

      for (const snapshot of snapshots) {
        const ex = snapshot.exercises.find((e) => e.exerciseId === exerciseId);
        if (ex && ex.sets.length > 0) {
          const completedWorkingSets = ex.sets.filter((s) => s.completed && s.weight !== undefined);
          if (completedWorkingSets.length > 0) {
            const bestSet = completedWorkingSets[0]!;
            return `${bestSet.weight}kg x ${bestSet.reps ?? 0}`;
          }
        }
      }
      return null;
    });
  }

  /**
   * Retrieves previous performance sets for an exercise from the most recent snapshot.
   */
  async getPreviousExerciseSets(exerciseId: EntityId): Promise<readonly ExerciseSet[] | null> {
    return this.db.transaction(['workoutSnapshots'], 'readonly', async (tx) => {
      const snapshots = await tx.getStore<WorkoutSnapshot>('workoutSnapshots').getAll();
      snapshots.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
      );

      for (const snapshot of snapshots) {
        const ex = snapshot.exercises.find((e) => e.exerciseId === exerciseId);
        if (ex && ex.sets.length > 0) {
          const completed = ex.sets.filter((s) => s.completed);
          if (completed.length > 0) {
            return completed;
          }
        }
      }
      return null;
    });
  }

  /**
   * Groups exercise slots into a superset, tri-set, giant set, or circuit.
   * Exercises maintain their individual identities, PR tracking, and analytics.
   */
  async createExerciseGroup(
    workoutId: EntityId,
    exerciseSlotIds: readonly EntityId[],
    type: GroupType = GroupType.SUPERSET,
    restAfterSeconds?: number,
    nowMs = Date.now(),
  ): Promise<ActiveWorkout> {
    const workout = await this.activeRepo.getById(workoutId);
    if (!workout) {
      throw new Error(`Workout not found: ${workoutId}`);
    }

    if (!exerciseSlotIds || exerciseSlotIds.length < 2) {
      throw new Error('A group requires at least two exercise slots.');
    }

    // Verify all slot IDs exist in this workout
    for (const slotId of exerciseSlotIds) {
      const found = workout.exercises.some((e) => e.id === slotId);
      if (!found) {
        throw new Error(`Exercise slot ${slotId} not found in workout ${workoutId}`);
      }
    }

    const groupId = generateId('group');
    const newGroup: RoutineGroup = {
      id: groupId,
      type,
      exerciseSlotIds,
      restAfterSeconds,
    };

    // Update sets in the grouped exercise slots to carry the groupId
    const updatedExercises = workout.exercises.map((slot) => {
      if (exerciseSlotIds.includes(slot.id)) {
        return {
          ...slot,
          sets: slot.sets.map((s) => ({ ...s, groupId })),
        };
      }
      return slot;
    });

    const existingGroups = workout.groups ? [...workout.groups] : [];
    // Remove slots from any previous group to prevent invalid nested memberships
    const cleanedGroups = existingGroups.filter(
      (g) => !g.exerciseSlotIds.some((id) => exerciseSlotIds.includes(id)),
    );

    const updatedWorkout: ActiveWorkout = {
      ...workout,
      exercises: updatedExercises,
      groups: [...cleanedGroups, newGroup],
      updatedAt: new Date(nowMs).toISOString(),
    };

    await this.activeRepo.save(updatedWorkout);
    return updatedWorkout;
  }

  /**
   * Removes a group from an active workout and clears group associations on its sets.
   */
  async removeExerciseGroup(
    workoutId: EntityId,
    groupId: EntityId,
    nowMs = Date.now(),
  ): Promise<ActiveWorkout> {
    const workout = await this.activeRepo.getById(workoutId);
    if (!workout) {
      throw new Error(`Workout not found: ${workoutId}`);
    }

    const existingGroups = workout.groups ? [...workout.groups] : [];
    const groupToRemove = existingGroups.find((g) => g.id === groupId);
    if (!groupToRemove) {
      return workout;
    }

    const remainingGroups = existingGroups.filter((g) => g.id !== groupId);

    const updatedExercises = workout.exercises.map((slot) => {
      if (groupToRemove.exerciseSlotIds.includes(slot.id)) {
        return {
          ...slot,
          sets: slot.sets.map((s) => (s.groupId === groupId ? { ...s, groupId: undefined } : s)),
        };
      }
      return slot;
    });

    const updatedWorkout: ActiveWorkout = {
      ...workout,
      exercises: updatedExercises,
      groups: remainingGroups,
      updatedAt: new Date(nowMs).toISOString(),
    };

    await this.activeRepo.save(updatedWorkout);
    return updatedWorkout;
  }
}
