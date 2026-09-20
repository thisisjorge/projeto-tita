import { describe, it, expect } from 'vitest';
import { SetType } from '../../src/domain/enums/set-type.js';
import { WorkoutStatus } from '../../src/domain/enums/workout-status.js';
import {
  validateExerciseSet,
  validateExercise,
  validateRoutine,
  validateActiveWorkout,
  validateWorkoutFinalization,
  validateActiveWorkoutCount,
} from '../../src/domain/validators/index.js';
import type { ActiveWorkout } from '../../src/domain/entities/active-workout.js';

describe('Domain Validators', () => {
  describe('validateExerciseSet', () => {
    it('validates a correct completed set', () => {
      const res = validateExerciseSet({
        id: 'set_1',
        setNumber: 1,
        type: SetType.NORMAL,
        weight: 100,
        reps: 8,
        completed: true,
        completedAt: new Date().toISOString(),
        rir: 2,
        rpe: 8,
        painLevel: 0,
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('PRESERVES ZERO as a strictly valid value for weight, reps, rir, and painLevel', () => {
      const res = validateExerciseSet({
        id: 'set_bodyweight_zero_reps',
        setNumber: 1,
        type: SetType.NORMAL,
        weight: 0, // bodyweight / unweighted
        reps: 0, // failed attempt
        completed: true,
        completedAt: new Date().toISOString(),
        rir: 0, // 0 RIR = failure
        painLevel: 0, // 0 = pain-free
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('rejects completed sets with negative numbers or missing load/reps', () => {
      const resNegative = validateExerciseSet({
        id: 'set_bad',
        setNumber: 1,
        type: SetType.NORMAL,
        weight: -10,
        reps: -1,
        completed: true,
      });
      expect(resNegative.valid).toBe(false);
      expect(resNegative.errors).toEqual(
        expect.arrayContaining([
          'Completed set must have a valid weight >= 0',
          'Completed set must have a valid integer reps >= 0',
        ]),
      );

      const resMissing = validateExerciseSet({
        id: 'set_missing',
        setNumber: 1,
        type: SetType.NORMAL,
        completed: true,
      });
      expect(resMissing.valid).toBe(false);
    });

    it('validates bounds for RPE, RIR, and painLevel', () => {
      const res = validateExerciseSet({
        id: 'set_bounds',
        setNumber: 1,
        type: SetType.NORMAL,
        completed: false,
        rpe: 12, // invalid: max 10
        rir: -1, // invalid: min 0
        painLevel: 6, // invalid: max 5
      });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Set RPE must be a number between 1.0 and 10.0');
      expect(res.errors).toContain('Set RIR must be a number between 0 and 10');
      expect(res.errors).toContain('Set painLevel must be an integer between 0 and 5');
    });
  });

  describe('validateExercise', () => {
    it('accepts a valid exercise entity', () => {
      const res = validateExercise({
        id: 'ex_bench',
        name: 'Supino Reto',
        primaryMuscle: 'Chest',
        equipment: 'Barbell',
        increment: 2.5,
        defaultRestSeconds: 180,
      });
      expect(res.valid).toBe(true);
    });

    it('rejects invalid or missing required exercise fields', () => {
      const res = validateExercise({
        id: '',
        name: '',
        increment: -2,
      });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Exercise id is required and must be a non-empty string');
      expect(res.errors).toContain('Exercise name is required and must be a non-empty string');
      expect(res.errors).toContain('Exercise primaryMuscle is required');
      expect(res.errors).toContain('Exercise equipment is required');
      expect(res.errors).toContain('Exercise increment must be a positive number > 0');
    });
  });

  describe('validateRoutine', () => {
    it('accepts a valid routine with unique slot IDs', () => {
      const res = validateRoutine({
        id: 'rt_1',
        name: 'Treino A',
        exercises: [
          {
            id: 'slot_1',
            exerciseId: 'ex_1',
            order: 0,
            sets: [{ id: 'tmpl_1', type: SetType.NORMAL }],
          },
          {
            id: 'slot_2',
            exerciseId: 'ex_2',
            order: 1,
            sets: [{ id: 'tmpl_2', type: SetType.NORMAL }],
          },
        ],
      });
      expect(res.valid).toBe(true);
    });

    it('rejects duplicate slot IDs and invalid groups', () => {
      const res = validateRoutine({
        id: 'rt_bad',
        name: 'Treino Inválido',
        exercises: [
          {
            id: 'slot_same',
            exerciseId: 'ex_1',
            order: 0,
            sets: [{ id: 't_1', type: SetType.NORMAL }],
          },
          {
            id: 'slot_same',
            exerciseId: 'ex_2',
            order: 1,
            sets: [{ id: 't_2', type: SetType.NORMAL }],
          },
        ],
        groups: [
          {
            id: 'grp_1',
            type: undefined as any,
            exerciseSlotIds: ['slot_same', 'slot_nonexistent'],
          },
        ],
      });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain("Duplicate exercise slot id 'slot_same' in routine");
      expect(res.errors).toContain(
        "Group 'grp_1' references unknown exercise slot 'slot_nonexistent'",
      );
    });
  });

  describe('validateActiveWorkout and finalization', () => {
    const baseWorkout: ActiveWorkout = {
      id: 'wo_1',
      schemaVersion: 1,
      createdAt: '2026-09-17T10:00:00.000Z',
      updatedAt: '2026-09-17T10:00:00.000Z',
      title: 'Treino de Peito',
      status: WorkoutStatus.IN_PROGRESS,
      startedAt: '2026-09-17T10:00:00.000Z',
      pauseIntervals: [],
      exercises: [
        {
          id: 'slot_1',
          exerciseId: 'ex_bench',
          exerciseName: 'Supino',
          order: 0,
          sets: [
            {
              id: 'set_1',
              setNumber: 1,
              type: SetType.NORMAL,
              weight: 100,
              reps: 8,
              completed: true,
            },
          ],
        },
      ],
    };

    it('accepts a valid active workout', () => {
      const res = validateActiveWorkout(baseWorkout);
      expect(res.valid).toBe(true);
    });

    it('rejects endedAt preceding startedAt', () => {
      const res = validateActiveWorkout({
        ...baseWorkout,
        endedAt: '2026-09-17T09:00:00.000Z', // 1 hour earlier
      });
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Workout endedAt cannot precede startedAt');
    });

    it('allows finalization when in progress and has completed sets', () => {
      const res = validateWorkoutFinalization(baseWorkout);
      expect(res.valid).toBe(true);
    });

    it('rejects finalization when no sets were completed', () => {
      const emptyWorkout: ActiveWorkout = {
        ...baseWorkout,
        exercises: [
          {
            ...baseWorkout.exercises[0]!,
            sets: [
              {
                id: 'set_1',
                setNumber: 1,
                type: SetType.NORMAL,
                completed: false,
              },
            ],
          },
        ],
      };
      const res = validateWorkoutFinalization(emptyWorkout);
      expect(res.valid).toBe(false);
      expect(res.errors).toContain(
        'Workout must contain at least one completed set to finalize into a snapshot',
      );
    });

    it('enforces maximum 1 unfinished workout invariant', () => {
      const w1: ActiveWorkout = { ...baseWorkout, id: 'w1', status: WorkoutStatus.IN_PROGRESS };
      const w2: ActiveWorkout = { ...baseWorkout, id: 'w2', status: WorkoutStatus.PAUSED };
      const w3: ActiveWorkout = { ...baseWorkout, id: 'w3', status: WorkoutStatus.COMPLETED };

      expect(validateActiveWorkoutCount([w1, w3]).valid).toBe(true);
      expect(validateActiveWorkoutCount([w1, w2]).valid).toBe(false);
      expect(validateActiveWorkoutCount([w1, w2]).errors[0]).toMatch(
        /At most 1 workout can be active/,
      );
    });
  });
});
