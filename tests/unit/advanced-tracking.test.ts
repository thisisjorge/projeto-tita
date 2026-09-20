import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestDatabase } from '../helpers/test-db.js';
import type { IndexedDBTitaDatabase } from '../../src/repositories/indexeddb/tita-database.js';
import { SettingsService } from '../../src/services/settings-service.js';
import { ActiveWorkoutService } from '../../src/services/active-workout-service.js';
import { GroupType } from '../../src/domain/enums/group-type.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import type { ActiveWorkoutExercise } from '../../src/domain/entities/active-workout.js';

describe('Advanced Tracking & Grouped Work (Phase 10 / Tasks 11.1 - 11.2)', () => {
  let db: IndexedDBTitaDatabase;

  beforeEach(async () => {
    db = createTestDatabase();
    await db.open();
  });

  afterEach(async () => {
    if (db && db.isOpen()) {
      db.close();
    }
  });

  describe('SettingsService (Task 11.1)', () => {
    it('returns default clean settings when unconfigured', async () => {
      const settingsService = new SettingsService(db);
      const settings = await settingsService.getAdvancedTrackingSettings();

      expect(settings.enabled).toBe(false);
      expect(settings.showSetType).toBe(false);
      expect(settings.showRpe).toBe(false);
      expect(settings.showRir).toBe(false);
      expect(settings.showTempo).toBe(false);
      expect(settings.showRest).toBe(false);
      expect(settings.showNotes).toBe(false);
    });

    it('persists and retrieves updated advanced settings', async () => {
      const settingsService = new SettingsService(db);
      await settingsService.saveAdvancedTrackingSettings({
        enabled: true,
        showSetType: true,
        showRpe: true,
        showRir: true,
        showTempo: true,
        showRest: true,
        showNotes: true,
        showDuration: true,
        showDistance: false,
      });

      const updated = await settingsService.getAdvancedTrackingSettings();
      expect(updated.enabled).toBe(true);
      expect(updated.showSetType).toBe(true);
      expect(updated.showRpe).toBe(true);
      expect(updated.showRir).toBe(true);
      expect(updated.showTempo).toBe(true);
      expect(updated.showRest).toBe(true);
      expect(updated.showNotes).toBe(true);
      expect(updated.showDuration).toBe(true);
      expect(updated.showDistance).toBe(false);
    });
  });

  describe('ActiveWorkoutService Advanced Logging & Grouped Work (Tasks 11.1 - 11.2)', () => {
    const defaultExercises: ActiveWorkoutExercise[] = [
      {
        id: 'slot-1',
        exerciseId: 'bench-press',
        exerciseName: 'Supino Reto',
        order: 1,
        sets: [
          { id: 'set-1', setNumber: 1, type: SetType.NORMAL, completed: false },
          { id: 'set-2', setNumber: 2, type: SetType.NORMAL, completed: false },
        ],
      },
      {
        id: 'slot-2',
        exerciseId: 'lat-pulldown',
        exerciseName: 'Puxada Alta',
        order: 2,
        sets: [
          { id: 'set-3', setNumber: 1, type: SetType.NORMAL, completed: false },
          { id: 'set-4', setNumber: 2, type: SetType.NORMAL, completed: false },
        ],
      },
      {
        id: 'slot-3',
        exerciseId: 'biceps-curl',
        exerciseName: 'Rosca Direta',
        order: 3,
        sets: [{ id: 'set-5', setNumber: 1, type: SetType.NORMAL, completed: false }],
      },
    ];

    it('logs advanced fields (RPE, RIR, tempo, notes, setType) on individual sets', async () => {
      const workoutService = new ActiveWorkoutService(db);
      const startResult = await workoutService.startWorkout({
        title: 'Treino Avançado',
        exercises: defaultExercises,
      });

      expect(startResult.type).toBe('started');
      if (startResult.type !== 'started') return;

      const updated = await workoutService.updateSet(startResult.workout.id, 'slot-1', 'set-1', {
        weight: 90,
        reps: 5,
        completed: true,
        type: SetType.TOP_SET,
        rpe: 9.0,
        rir: 1,
        tempo: '3-1-1-0',
        notes: 'Boa velocidade concêntrica',
        restTargetSeconds: 120,
      });

      const updatedSet = updated.exercises[0]?.sets[0];
      expect(updatedSet?.weight).toBe(90);
      expect(updatedSet?.reps).toBe(5);
      expect(updatedSet?.completed).toBe(true);
      expect(updatedSet?.type).toBe(SetType.TOP_SET);
      expect(updatedSet?.rpe).toBe(9.0);
      expect(updatedSet?.rir).toBe(1);
      expect(updatedSet?.tempo).toBe('3-1-1-0');
      expect(updatedSet?.notes).toBe('Boa velocidade concêntrica');
      expect(updatedSet?.restTargetSeconds).toBe(120);
    });

    it('creates a superset group linking exercises while preserving their identity', async () => {
      const workoutService = new ActiveWorkoutService(db);
      const startResult = await workoutService.startWorkout({
        title: 'Treino Superset',
        exercises: defaultExercises,
      });

      expect(startResult.type).toBe('started');
      if (startResult.type !== 'started') return;

      const updatedWorkout = await workoutService.createExerciseGroup(
        startResult.workout.id,
        ['slot-1', 'slot-2'],
        GroupType.SUPERSET,
        60,
      );

      expect(updatedWorkout.groups).toBeDefined();
      expect(updatedWorkout.groups).toHaveLength(1);
      const group = updatedWorkout.groups![0]!;
      expect(group.type).toBe(GroupType.SUPERSET);
      expect(group.exerciseSlotIds).toEqual(['slot-1', 'slot-2']);
      expect(group.restAfterSeconds).toBe(60);

      // Exercises retain individual IDs and names
      expect(updatedWorkout.exercises[0]?.id).toBe('slot-1');
      expect(updatedWorkout.exercises[0]?.exerciseName).toBe('Supino Reto');
      expect(updatedWorkout.exercises[1]?.id).toBe('slot-2');
      expect(updatedWorkout.exercises[1]?.exerciseName).toBe('Puxada Alta');

      // Sets now carry the groupId
      expect(updatedWorkout.exercises[0]?.sets[0]?.groupId).toBe(group.id);
      expect(updatedWorkout.exercises[1]?.sets[0]?.groupId).toBe(group.id);
      // slot-3 was not in group
      expect(updatedWorkout.exercises[2]?.sets[0]?.groupId).toBeUndefined();
    });

    it('requires at least 2 exercise slots to form a group', async () => {
      const workoutService = new ActiveWorkoutService(db);
      const startResult = await workoutService.startWorkout({
        title: 'Treino Teste',
        exercises: defaultExercises,
      });

      if (startResult.type !== 'started') return;

      await expect(
        workoutService.createExerciseGroup(startResult.workout.id, ['slot-1'], GroupType.SUPERSET),
      ).rejects.toThrow('A group requires at least two exercise slots.');
    });

    it('removes an exercise group and clears groupId from sets cleanly', async () => {
      const workoutService = new ActiveWorkoutService(db);
      const startResult = await workoutService.startWorkout({
        title: 'Treino Desagrupar',
        exercises: defaultExercises,
      });

      if (startResult.type !== 'started') return;

      const grouped = await workoutService.createExerciseGroup(
        startResult.workout.id,
        ['slot-1', 'slot-2'],
        GroupType.SUPERSET,
      );

      const groupId = grouped.groups![0]!.id;

      const ungrouped = await workoutService.removeExerciseGroup(startResult.workout.id, groupId);
      expect(ungrouped.groups).toHaveLength(0);
      expect(ungrouped.exercises[0]?.sets[0]?.groupId).toBeUndefined();
      expect(ungrouped.exercises[1]?.sets[0]?.groupId).toBeUndefined();
    });
  });
});
