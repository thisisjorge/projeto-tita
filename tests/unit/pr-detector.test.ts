import { describe, it, expect } from 'vitest';
import { detectPersonalRecords } from '../../src/domain/math/pr-detector.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import type { ExerciseSet } from '../../src/domain/entities/exercise-set.js';

describe('Personal Record (PR) Detector', () => {
  const exId = 'ex_bench';

  const history: ExerciseSet[] = [
    // Historical best: 100 kg x 5 reps (e1RM = 116.7, vol = 500)
    {
      id: 'h1',
      setNumber: 1,
      type: SetType.NORMAL,
      weight: 100,
      reps: 5,
      completed: true,
    },
    // Historical best reps at 90kg: 8 reps
    {
      id: 'h2',
      setNumber: 2,
      type: SetType.NORMAL,
      weight: 90,
      reps: 8,
      completed: true,
    },
  ];

  it('detects HEAVIEST_WEIGHT PR when load exceeds all previous history', () => {
    const current: ExerciseSet[] = [
      {
        id: 'c1',
        setNumber: 1,
        type: SetType.TOP_SET,
        weight: 105, // Previous best was 100
        reps: 3,
        completed: true,
      },
    ];

    const prs = detectPersonalRecords(exId, current, history);
    const weightPR = prs.find((p) => p.category === 'HEAVIEST_WEIGHT');

    expect(weightPR).toBeDefined();
    expect(weightPR?.value).toBe(105);
    expect(weightPR?.previousBestValue).toBe(100);
  });

  it('detects ESTIMATED_1RM PR when calculated 1RM beats previous best', () => {
    // 100 x 5 = 116.7 e1RM
    // 95 x 10 = 126.7 e1RM (New 1RM PR even though 95 < 100 kg)
    const current: ExerciseSet[] = [
      {
        id: 'c1',
        setNumber: 1,
        type: SetType.NORMAL,
        weight: 95,
        reps: 10,
        completed: true,
      },
    ];

    const prs = detectPersonalRecords(exId, current, history);
    const e1rmPR = prs.find((p) => p.category === 'ESTIMATED_1RM');

    expect(e1rmPR).toBeDefined();
    expect(e1rmPR?.value).toBe(126.7);
    expect(e1rmPR?.previousBestValue).toBe(116.7);
  });

  it('detects MOST_REPS_AT_WEIGHT PR for a specific load', () => {
    // History has 90kg for 8 reps
    // Today lifter achieves 90kg for 9 reps
    const current: ExerciseSet[] = [
      {
        id: 'c1',
        setNumber: 1,
        type: SetType.NORMAL,
        weight: 90,
        reps: 9,
        completed: true,
      },
    ];

    const prs = detectPersonalRecords(exId, current, history);
    const repsPR = prs.find((p) => p.category === 'MOST_REPS_AT_WEIGHT');

    expect(repsPR).toBeDefined();
    expect(repsPR?.value).toBe(9);
    expect(repsPR?.previousBestValue).toBe(8);
  });

  it('ignores warmups for personal record achievements', () => {
    const current: ExerciseSet[] = [
      {
        id: 'c_warmup',
        setNumber: 1,
        type: SetType.WARMUP,
        weight: 120, // Heaviest weight but marked as WARMUP
        reps: 5,
        completed: true,
      },
    ];

    const prs = detectPersonalRecords(exId, current, history);
    expect(prs).toHaveLength(0);
  });
});
