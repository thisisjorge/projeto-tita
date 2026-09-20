import { describe, it, expect } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { ActiveWorkoutService } from '../../src/services/active-workout-service.js';
import { WorkoutStatus } from '../../src/domain/enums/workout-status.js';
import { TimerStatus } from '../../src/domain/enums/timer-status.js';

describe('Active Workout Recovery Integration (REQ-4, Task 5.6)', () => {
  it('survives reload during workout: restores identical workout state from IndexedDB', async () => {
    // Shared fake-indexeddb factory to simulate persistent browser storage across "reloads"
    const fakeFactory = new IDBFactory();
    const dbName = 'recovery-test-reload';

    // 1. First session before "reload"
    const db1 = new IndexedDBTitaDatabase({ idbFactory: fakeFactory, dbName, version: 1 });
    await db1.open();
    const service1 = new ActiveWorkoutService(db1);

    const startRes = await service1.startWorkout({ title: 'Treino de Força (Pré-Reload)' });
    if (startRes.type !== 'started') throw new Error('Failed to start');
    const workoutId = startRes.workout.id;

    const withEx = await service1.addExercise(workoutId, {
      exerciseId: 'squat-01',
      exerciseName: 'Agachamento Livre',
      targetRestSeconds: 90,
      initialSetsCount: 2,
    });

    const exId = withEx.exercises[0]!.id;
    const set1Id = withEx.exercises[0]!.sets[0]!.id;

    // Log set 1: 120kg x 5, completed
    await service1.updateSet(
      workoutId,
      exId,
      set1Id,
      { weight: 120, reps: 5, completed: true },
      10000,
    );

    // Simulate page close / unmount
    db1.close();

    // 2. Second session simulating "page reload" (reconnecting to same DB name in IndexedDB)
    const db2 = new IndexedDBTitaDatabase({ idbFactory: fakeFactory, dbName, version: 1 });
    await db2.open();
    const service2 = new ActiveWorkoutService(db2);

    const restoredWorkout = await service2.getActiveWorkout();
    expect(restoredWorkout).not.toBeNull();
    expect(restoredWorkout?.id).toBe(workoutId);
    expect(restoredWorkout?.title).toBe('Treino de Força (Pré-Reload)');
    expect(restoredWorkout?.status).toBe(WorkoutStatus.IN_PROGRESS);

    // Verify sets and loads were durably preserved
    const restoredEx = restoredWorkout?.exercises[0];
    expect(restoredEx?.exerciseName).toBe('Agachamento Livre');
    expect(restoredEx?.sets[0]?.weight).toBe(120);
    expect(restoredEx?.sets[0]?.reps).toBe(5);
    expect(restoredEx?.sets[0]?.completed).toBe(true);
    expect(restoredEx?.sets[0]?.completedAt).toBe(new Date(10000).toISOString());

    // Clean up
    db2.close();
  });

  it('recovers rest timer correctly when deadline passed during background or reload', async () => {
    const fakeFactory = new IDBFactory();
    const dbName = 'recovery-test-timer-deadline';

    // 1. Start workout and timer
    const db1 = new IndexedDBTitaDatabase({ idbFactory: fakeFactory, dbName, version: 1 });
    await db1.open();
    const service1 = new ActiveWorkoutService(db1);

    const startMs = 50000;
    const startRes = await service1.startWorkout({ nowMs: startMs });
    if (startRes.type !== 'started') throw new Error('Failed to start');

    // Start a 60-second rest timer (deadline = 50000 + 60000 = 110000)
    await service1.startRestTimer(60, startRes.workout.id, startMs);

    db1.close();

    // 2. Reload after 90 seconds (t = 140000, well past the deadline of 110000)
    const db2 = new IndexedDBTitaDatabase({ idbFactory: fakeFactory, dbName, version: 1 });
    await db2.open();
    const service2 = new ActiveWorkoutService(db2);

    const restoredTimer = await service2.getActiveTimer(140000);
    expect(restoredTimer).not.toBeNull();
    expect(restoredTimer?.status).toBe(TimerStatus.COMPLETED);

    db2.close();
  });

  it('correctly calculates active duration excluding open pause intervals across reload', async () => {
    const fakeFactory = new IDBFactory();
    const dbName = 'recovery-test-pause';

    // 1. Start workout at t = 1000, pause at t = 5000
    const db1 = new IndexedDBTitaDatabase({ idbFactory: fakeFactory, dbName, version: 1 });
    await db1.open();
    const service1 = new ActiveWorkoutService(db1);

    const startRes = await service1.startWorkout({ nowMs: 1000 });
    if (startRes.type !== 'started') throw new Error('Start failed');
    const workoutId = startRes.workout.id;

    const withEx = await service1.addExercise(workoutId, {
      exerciseId: 'press',
      exerciseName: 'Press',
      initialSetsCount: 1,
    });
    await service1.updateSet(
      workoutId,
      withEx.exercises[0]!.id,
      withEx.exercises[0]!.sets[0]!.id,
      { weight: 60, reps: 5, completed: true },
      2000,
    );

    // Pause workout at t = 5000
    await service1.pauseWorkout(workoutId, 5000);
    db1.close();

    // 2. Resume workout on new connection at t = 15000 (10s paused)
    const db2 = new IndexedDBTitaDatabase({ idbFactory: fakeFactory, dbName, version: 1 });
    await db2.open();
    const service2 = new ActiveWorkoutService(db2);

    await service2.resumeWorkout(workoutId, 15000);

    // Conclude session at t = 20000
    // Total wall clock: 20000 - 1000 = 19000ms
    // Paused duration: 15000 - 5000 = 10000ms
    // Active duration: 19000 - 10000 = 9000ms
    const snapshot = await service2.finalizeWorkout(workoutId, 20000);
    expect(snapshot.totalDurationMs).toBe(19000);
    expect(snapshot.activeDurationMs).toBe(9000);

    db2.close();
  });

  it('safely handles finalize retries across connection recreation', async () => {
    const fakeFactory = new IDBFactory();
    const dbName = 'recovery-test-finalize-retry';

    const db1 = new IndexedDBTitaDatabase({ idbFactory: fakeFactory, dbName, version: 1 });
    await db1.open();
    const service1 = new ActiveWorkoutService(db1);

    const startRes = await service1.startWorkout({ nowMs: 1000 });
    if (startRes.type !== 'started') throw new Error('Failed to start');
    const workoutId = startRes.workout.id;

    const withEx = await service1.addExercise(workoutId, {
      exerciseId: 'ex1',
      exerciseName: 'Ex1',
      initialSetsCount: 1,
    });
    await service1.updateSet(
      workoutId,
      withEx.exercises[0]!.id,
      withEx.exercises[0]!.sets[0]!.id,
      { weight: 80, reps: 6, completed: true },
      2000,
    );

    const snapshot1 = await service1.finalizeWorkout(workoutId, 10000);
    db1.close();

    // Reopen in fresh connection and attempt to finalize same workoutId again
    const db2 = new IndexedDBTitaDatabase({ idbFactory: fakeFactory, dbName, version: 1 });
    await db2.open();
    const service2 = new ActiveWorkoutService(db2);

    const snapshot2 = await service2.finalizeWorkout(workoutId, 15000);
    expect(snapshot2.id).toBe(snapshot1.id);
    expect(snapshot2.completedAt).toBe(snapshot1.completedAt);
    expect(snapshot2.totalVolumeKg).toBe(snapshot1.totalVolumeKg);

    db2.close();
  });
});
