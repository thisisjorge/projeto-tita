import { describe, it, expect } from 'vitest';
import {
  SetType,
  isWorkingSet,
  ExerciseRole,
  GroupType,
  ProgressionStrategyType,
  WeekPhase,
  WorkoutStatus,
  TimerStatus,
} from '../../src/domain/enums/index.js';

describe('Domain Enums — Canonical Specifications', () => {
  it('defines all required SetType values from TRAINING_MODEL.md', () => {
    const expected = [
      'NORMAL',
      'WARMUP',
      'TOP_SET',
      'BACKOFF',
      'DROP_SET',
      'REST_PAUSE',
      'MYO_REP',
      'AMRAP',
      'FAILURE',
      'CLUSTER',
      'PAUSED',
      'TEMPO',
      'ISOMETRIC',
    ];

    for (const val of expected) {
      expect(Object.values(SetType)).toContain(val);
    }
  });

  it('correctly classifies working sets vs warmups', () => {
    expect(isWorkingSet(SetType.NORMAL)).toBe(true);
    expect(isWorkingSet(SetType.TOP_SET)).toBe(true);
    expect(isWorkingSet(SetType.BACKOFF)).toBe(true);
    expect(isWorkingSet(SetType.WARMUP)).toBe(false);
  });

  it('defines all required ExerciseRole values from TRAINING_MODEL.md', () => {
    const expected = [
      'HORIZONTAL_PRESS',
      'VERTICAL_PRESS',
      'HORIZONTAL_PULL',
      'VERTICAL_PULL',
      'SQUAT_PATTERN',
      'HIP_HINGE',
      'KNEE_FLEXION',
      'ELBOW_FLEXION',
      'ELBOW_EXTENSION',
      'LATERAL_RAISE',
      'CALF',
      'CORE',
    ];

    for (const role of expected) {
      expect(Object.values(ExerciseRole)).toContain(role);
    }
  });

  it('defines all GroupType values', () => {
    expect(GroupType.SUPERSET).toBe('SUPERSET');
    expect(GroupType.TRI_SET).toBe('TRI_SET');
    expect(GroupType.GIANT_SET).toBe('GIANT_SET');
    expect(GroupType.CIRCUIT).toBe('CIRCUIT');
  });

  it('defines all ProgressionStrategyType values', () => {
    const expected = [
      'MANUAL',
      'LINEAR_PROGRESSION',
      'DOUBLE_PROGRESSION',
      'DYNAMIC_DOUBLE_PROGRESSION',
      'REP_GOAL',
      'PERCENTAGE_BASED',
      'RPE_RIR_BASED',
      'TOP_SET_BACKOFF',
      'CUSTOM',
    ];

    for (const strategy of expected) {
      expect(Object.values(ProgressionStrategyType)).toContain(strategy);
    }
  });

  it('defines all WeekPhase values for periodization', () => {
    expect(WeekPhase.NORMAL).toBe('NORMAL');
    expect(WeekPhase.ACCUMULATION).toBe('ACCUMULATION');
    expect(WeekPhase.INTENSIFICATION).toBe('INTENSIFICATION');
    expect(WeekPhase.DELOAD).toBe('DELOAD');
    expect(WeekPhase.TEST).toBe('TEST');
  });

  it('defines all WorkoutStatus values', () => {
    expect(WorkoutStatus.IN_PROGRESS).toBe('IN_PROGRESS');
    expect(WorkoutStatus.PAUSED).toBe('PAUSED');
    expect(WorkoutStatus.COMPLETED).toBe('COMPLETED');
    expect(WorkoutStatus.DISCARDED).toBe('DISCARDED');
  });

  it('defines all TimerStatus values', () => {
    expect(TimerStatus.RUNNING).toBe('RUNNING');
    expect(TimerStatus.PAUSED).toBe('PAUSED');
    expect(TimerStatus.COMPLETED).toBe('COMPLETED');
    expect(TimerStatus.CANCELLED).toBe('CANCELLED');
  });
});
