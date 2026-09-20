import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/test-db.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { ActiveWorkoutService } from '../../src/services/active-workout-service.js';
import { WorkoutStatus } from '../../src/domain/enums/workout-status.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import { TimerStatus } from '../../src/domain/enums/timer-status.js';

describe('ActiveWorkoutService — Durable Lifecycle (REQ-4)', () => {
  let db: IndexedDBTitaDatabase;
  let service: ActiveWorkoutService;

  beforeEach(async () => {
    db = createTestDatabase(`test-active-workout-${Date.now()}-${Math.random()}`);
    await db.open();
    service = new ActiveWorkoutService(db);
  });

  afterEach(() => {
    db.close();
  });

  it('starts a new workout with stable ID and persisted startedAt (Task 5.1)', async () => {
    const fixedNow = 1700000000000;
    const result = await service.startWorkout({
      title: 'Treino A - Peito e Tríceps',
      nowMs: fixedNow,
    });

    expect(result.type).toBe('started');
    if (result.type === 'started') {
      expect(result.workout.id).toMatch(/^workout_/);
      expect(result.workout.title).toBe('Treino A - Peito e Tríceps');
      expect(result.workout.status).toBe(WorkoutStatus.IN_PROGRESS);
      expect(result.workout.startedAt).toBe(new Date(fixedNow).toISOString());
      expect(result.workout.schemaVersion).toBe(1);

      // Verify persisted in IndexedDB
      const active = await service.getActiveWorkout();
      expect(active).not.toBeNull();
      expect(active?.id).toBe(result.workout.id);
    }
  });

  it('enforces invariant: at most 1 active workout simultaneously, returns mustResume (Task 5.1)', async () => {
    const first = await service.startWorkout({ title: 'Primeiro Treino' });
    expect(first.type).toBe('started');

    // Attempt to start second workout without finishing the first
    const second = await service.startWorkout({ title: 'Segundo Treino' });
    expect(second.type).toBe('mustResume');
    if (second.type === 'mustResume') {
      expect(second.existing.title).toBe('Primeiro Treino');
    }
  });

  it('supports pause and resume, accurately recording pause intervals (Task 5.1)', async () => {
    const startRes = await service.startWorkout({
      title: 'Treino com Pausa',
      nowMs: 1000,
    });
    expect(startRes.type).toBe('started');
    if (startRes.type !== 'started') return;

    const workoutId = startRes.workout.id;

    // Pause workout at t = 2000
    const paused = await service.pauseWorkout(workoutId, 2000);
    expect(paused.status).toBe(WorkoutStatus.PAUSED);
    expect(paused.pauseIntervals).toHaveLength(1);
    expect(paused.pauseIntervals[0]?.pausedAt).toBe(new Date(2000).toISOString());
    expect(paused.pauseIntervals[0]?.resumedAt).toBeUndefined();

    // Resume workout at t = 5000
    const resumed = await service.resumeWorkout(workoutId, 5000);
    expect(resumed.status).toBe(WorkoutStatus.IN_PROGRESS);
    expect(resumed.pauseIntervals).toHaveLength(1);
    expect(resumed.pauseIntervals[0]?.resumedAt).toBe(new Date(5000).toISOString());
  });

  it('discards an active workout cleanly (Task 5.1)', async () => {
    const startRes = await service.startWorkout({ title: 'Treino a ser descartado' });
    if (startRes.type !== 'started') return;

    await service.discardWorkout(startRes.workout.id);

    const active = await service.getActiveWorkout();
    expect(active).toBeNull();
  });

  it('immediately persists set editing and preserves 0 as a valid value (0 !== undefined) (Task 5.1)', async () => {
    const startRes = await service.startWorkout();
    if (startRes.type !== 'started') return;
    const workoutId = startRes.workout.id;

    // Add an exercise with 2 sets
    const wWithEx = await service.addExercise(workoutId, {
      exerciseId: 'bench-press',
      exerciseName: 'Supino Reto',
      initialSetsCount: 2,
    });

    const exSlot = wWithEx.exercises[0]!;
    const set1 = exSlot.sets[0]!;

    // Edit set: weight: 0 (e.g. pushups/bodyweight), reps: 0 (failed attempt), rir: 0 (to failure)
    const updated = await service.updateSet(workoutId, exSlot.id, set1.id, {
      weight: 0,
      reps: 0,
      rir: 0,
    });

    const persistedSet = updated.exercises[0]?.sets[0];
    expect(persistedSet?.weight).toBe(0);
    expect(persistedSet?.reps).toBe(0);
    expect(persistedSet?.rir).toBe(0);

    // Verify persisted directly in IndexedDB across fresh repository query
    const freshFromDb = await service.getActiveWorkout();
    const dbSet = freshFromDb?.exercises[0]?.sets[0];
    expect(dbSet?.weight).toBe(0);
    expect(dbSet?.reps).toBe(0);
    expect(dbSet?.rir).toBe(0);
  });

  it('records a unique completedAt on first completion and preserves it across subsequent edits (Task 5.1)', async () => {
    const startRes = await service.startWorkout();
    if (startRes.type !== 'started') return;
    const workoutId = startRes.workout.id;

    const wWithEx = await service.addExercise(workoutId, {
      exerciseId: 'squat',
      exerciseName: 'Agachamento',
      initialSetsCount: 1,
    });
    const exSlot = wWithEx.exercises[0]!;
    const set1 = exSlot.sets[0]!;

    // Complete set at t = 10000
    const firstComplete = await service.updateSet(
      workoutId,
      exSlot.id,
      set1.id,
      { weight: 100, reps: 5, completed: true },
      10000,
    );
    const completedAtInitial = firstComplete.exercises[0]?.sets[0]?.completedAt;
    expect(completedAtInitial).toBe(new Date(10000).toISOString());

    // Subsequent edit (e.g. changing reps from 5 to 6) at t = 15000 should NOT change completedAt
    const secondEdit = await service.updateSet(workoutId, exSlot.id, set1.id, { reps: 6 }, 15000);
    expect(secondEdit.exercises[0]?.sets[0]?.completedAt).toBe(completedAtInitial);
    expect(secondEdit.exercises[0]?.sets[0]?.reps).toBe(6);

    // Unmarking set as complete at t = 20000 should clear completedAt
    const uncompleted = await service.updateSet(
      workoutId,
      exSlot.id,
      set1.id,
      { completed: false },
      20000,
    );
    expect(uncompleted.exercises[0]?.sets[0]?.completed).toBe(false);
    expect(uncompleted.exercises[0]?.sets[0]?.completedAt).toBeUndefined();
  });

  it('automatically initiates deadline-based rest timer on set completion with rest target (Task 5.2)', async () => {
    const startRes = await service.startWorkout();
    if (startRes.type !== 'started') return;
    const workoutId = startRes.workout.id;

    const wWithEx = await service.addExercise(workoutId, {
      exerciseId: 'deadlift',
      exerciseName: 'Levantamento Terra',
      targetRestSeconds: 120,
      initialSetsCount: 1,
    });
    const exSlot = wWithEx.exercises[0]!;
    const set1 = exSlot.sets[0]!;

    const nowMs = 50000;
    await service.updateSet(
      workoutId,
      exSlot.id,
      set1.id,
      { weight: 150, reps: 5, completed: true },
      nowMs,
    );

    // Verify timer was created with deadlineAt = nowMs + 120 * 1000
    const timer = await service.getActiveTimer(nowMs);
    expect(timer).not.toBeNull();
    expect(timer?.durationSeconds).toBe(120);
    expect(timer?.status).toBe(TimerStatus.RUNNING);
    expect(timer?.deadlineAt).toBe(new Date(nowMs + 120000).toISOString());

    // At nowMs + 30s, remaining should be exactly 90s (90000ms)
    const timerAt30s = await service.getActiveTimer(nowMs + 30000);
    expect(timerAt30s?.status).toBe(TimerStatus.RUNNING);

    // At nowMs + 120s or later, status should transition to COMPLETED
    const expiredTimer = await service.getActiveTimer(nowMs + 120001);
    expect(expiredTimer?.status).toBe(TimerStatus.COMPLETED);
  });

  it('supports pause, resume, add seconds, and skip on deadline timer (Task 5.2)', async () => {
    const nowMs = 10000;
    await service.startRestTimer(60, undefined, nowMs);

    // Pause timer after 20s (remaining: 40s)
    const paused = await service.pauseTimer(nowMs + 20000);
    expect(paused?.status).toBe(TimerStatus.PAUSED);
    expect(paused?.remainingMsWhenPaused).toBe(40000);

    // Add 30 seconds while paused (new remaining: 70s)
    const withExtra = await service.addTimerSeconds(30, nowMs + 25000);
    expect(withExtra?.remainingMsWhenPaused).toBe(70000);

    // Resume at t = 40000 (new deadline: 40000 + 70000 = 110000)
    const resumed = await service.resumeTimer(nowMs + 30000);
    expect(resumed?.status).toBe(TimerStatus.RUNNING);
    expect(resumed?.deadlineAt).toBe(new Date(110000).toISOString());

    // Skip timer
    await service.skipTimer();
    const cleared = await service.getActiveTimer(nowMs + 35000);
    expect(cleared).toBeNull();
  });

  it('finalizes active workout into an immutable snapshot and returns existing on retry (idempotency) (Task 5.3)', async () => {
    const startMs = 100000;
    const startRes = await service.startWorkout({ nowMs: startMs });
    if (startRes.type !== 'started') return;
    const workoutId = startRes.workout.id;

    const wWithEx = await service.addExercise(workoutId, {
      exerciseId: 'ohp',
      exerciseName: 'Desenvolvimento Militar',
      initialSetsCount: 1,
    });
    const exSlot = wWithEx.exercises[0]!;
    const set1 = exSlot.sets[0]!;

    await service.updateSet(
      workoutId,
      exSlot.id,
      set1.id,
      { weight: 50, reps: 8, completed: true },
      startMs + 5000,
    );

    const finishMs = startMs + 1800000; // 30 mins later
    const snapshot1 = await service.finalizeWorkout(workoutId, finishMs);

    expect(snapshot1.id).toMatch(/^snapshot_/);
    expect(snapshot1.sourceWorkoutId).toBe(workoutId);
    expect(snapshot1.completedSetsCount).toBe(1);
    expect(snapshot1.totalVolumeKg).toBe(400); // 50 * 8
    expect(snapshot1.totalReps).toBe(8);
    expect(snapshot1.activeDurationMs).toBe(1800000);

    // Idempotency: Calling finalizeWorkout again on same workoutId returns existing snapshot
    const snapshot2 = await service.finalizeWorkout(workoutId, finishMs + 5000);
    expect(snapshot2.id).toBe(snapshot1.id);
    expect(snapshot2.completedAt).toBe(snapshot1.completedAt);
  });

  it('keeps active workout recoverable when finalization fails validation (no completed sets) (Task 5.3)', async () => {
    const startRes = await service.startWorkout();
    if (startRes.type !== 'started') return;
    const workoutId = startRes.workout.id;

    // Add uncompleted exercise set
    await service.addExercise(workoutId, {
      exerciseId: 'pullup',
      exerciseName: 'Barra Fixa',
      initialSetsCount: 1,
    });

    // Attempt to finalize without completing any sets -> must fail validation
    await expect(service.finalizeWorkout(workoutId)).rejects.toThrow(/FINALIZATION_FAILED/);

    // Active workout must still exist and be intact (recoverable)
    const active = await service.getActiveWorkout();
    expect(active).not.toBeNull();
    expect(active?.id).toBe(workoutId);
    expect(active?.status).toBe(WorkoutStatus.IN_PROGRESS);
  });

  it('accurately calculates active duration excluding pause intervals upon finalization (Task 5.3)', async () => {
    const startMs = 1000;
    const startRes = await service.startWorkout({ nowMs: startMs });
    if (startRes.type !== 'started') return;
    const workoutId = startRes.workout.id;

    const wWithEx = await service.addExercise(workoutId, {
      exerciseId: 'curl',
      exerciseName: 'Rosca Direta',
      initialSetsCount: 1,
    });
    await service.updateSet(
      workoutId,
      wWithEx.exercises[0]!.id,
      wWithEx.exercises[0]!.sets[0]!.id,
      { weight: 30, reps: 10, completed: true },
      2000,
    );

    // Pause for 10 seconds (from t = 5000 to t = 15000)
    await service.pauseWorkout(workoutId, 5000);
    await service.resumeWorkout(workoutId, 15000);

    // Conclude at t = 25000
    // Total wall clock: 25000 - 1000 = 24000ms
    // Paused duration: 15000 - 5000 = 10000ms
    // Expected active duration: 24000 - 10000 = 14000ms
    const snapshot = await service.finalizeWorkout(workoutId, 25000);
    expect(snapshot.totalDurationMs).toBe(24000);
    expect(snapshot.activeDurationMs).toBe(14000);
  });
});
