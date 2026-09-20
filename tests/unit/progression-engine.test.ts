import { describe, it, expect } from 'vitest';
import { ProgressionStrategyType } from '../../src/domain/enums/progression-strategy-type.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import type { ExerciseSet } from '../../src/domain/entities/exercise-set.js';
import { ProgressionEngine } from '../../src/domain/progression/progression-engine.js';
import {
  LinearProgressionStrategy,
  DoubleProgressionStrategy,
  DynamicDoubleProgressionStrategy,
  RepGoalProgressionStrategy,
  PercentageBasedProgressionStrategy,
  RpeRirProgressionStrategy,
  TopSetBackoffProgressionStrategy,
  CustomProgressionStrategy,
} from '../../src/domain/progression/progression-strategies.js';
import type {
  ProgressionContext,
  ProgressionRuleConfig,
} from '../../src/domain/progression/types.js';

describe('ProgressionEngine & Strategies (Phase 10 / Task 11.3)', () => {
  const createMockSet = (
    setNumber: number,
    weight: number,
    reps: number,
    completed = true,
    type = SetType.NORMAL,
    rpe?: number,
    rir?: number,
  ): ExerciseSet => ({
    id: `set-${setNumber}`,
    setNumber,
    type,
    weight,
    reps,
    completed,
    rpe,
    rir,
    completedAt: '2026-09-17T14:00:00.000Z',
  });

  it('1. Manual strategy produces no automated suggestions', () => {
    const context: ProgressionContext = {
      exerciseId: 'bench-press',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }],
      previousSets: [createMockSet(1, 80, 5), createMockSet(2, 80, 5)],
    };

    const suggestion = ProgressionEngine.evaluate(context, {
      type: ProgressionStrategyType.MANUAL,
    });
    expect(suggestion).toBeNull();
  });

  it('2. Linear progression increases weight when all target reps are met', () => {
    const strategy = new LinearProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'squat',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
      previousSets: [createMockSet(1, 100, 5), createMockSet(2, 100, 5), createMockSet(3, 100, 5)],
    };

    const suggestion = strategy.evaluate(context, { targetReps: 5, incrementKg: 5 });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.title).toContain('Progressão Linear');
    expect(suggestion?.suggestedSets).toHaveLength(3);
    expect(suggestion?.suggestedSets[0]?.weight).toBe(105);
    expect(suggestion?.suggestedSets[0]?.reps).toBe(5);
    expect(suggestion?.status).toBe('PENDING');
  });

  it('2b. Linear progression holds weight when target reps were missed', () => {
    const strategy = new LinearProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'squat',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
      previousSets: [
        createMockSet(1, 100, 5),
        createMockSet(2, 100, 4), // missed 5 reps
        createMockSet(3, 100, 3),
      ],
    };

    const suggestion = strategy.evaluate(context, { targetReps: 5, incrementKg: 5 });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedSets[0]?.weight).toBe(100);
    expect(suggestion?.suggestedSets[0]?.reps).toBe(5);
    expect(suggestion?.evidence).toContain('nem todas as séries completaram');
  });

  it('3. Double progression increases weight and resets reps when ceiling is reached', () => {
    const strategy = new DoubleProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'curls',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
      previousSets: [createMockSet(1, 14, 12), createMockSet(2, 14, 12), createMockSet(3, 14, 12)],
    };

    const suggestion = strategy.evaluate(context, {
      minReps: 8,
      maxReps: 12,
      incrementKg: 2,
    });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedSets[0]?.weight).toBe(16);
    expect(suggestion?.suggestedSets[0]?.reps).toBe(8);
  });

  it('3b. Double progression holds weight and pushes reps when ceiling not yet reached', () => {
    const strategy = new DoubleProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'curls',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
      previousSets: [createMockSet(1, 14, 12), createMockSet(2, 14, 10), createMockSet(3, 14, 8)],
    };

    const suggestion = strategy.evaluate(context, {
      minReps: 8,
      maxReps: 12,
      incrementKg: 2,
    });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedSets[0]?.weight).toBe(14);
    // Suggests targeting maxPrevReps + 1 (capped at 12)
    expect(suggestion?.suggestedSets[0]?.reps).toBe(12);
  });

  it('4. Dynamic double progression promotes completed sets independently', () => {
    const strategy = new DynamicDoubleProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'bench-press',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
      previousSets: [
        createMockSet(1, 80, 10), // Hit ceiling (10)
        createMockSet(2, 80, 8), // Did not hit ceiling
        createMockSet(3, 80, 7), // Did not hit ceiling
      ],
    };

    const suggestion = strategy.evaluate(context, {
      minReps: 6,
      maxReps: 10,
      incrementKg: 2.5,
    });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedSets[0]?.weight).toBe(82.5);
    expect(suggestion?.suggestedSets[0]?.reps).toBe(6);

    expect(suggestion?.suggestedSets[1]?.weight).toBe(80);
    expect(suggestion?.suggestedSets[1]?.reps).toBe(9); // 8 + 1

    expect(suggestion?.suggestedSets[2]?.weight).toBe(80);
    expect(suggestion?.suggestedSets[2]?.reps).toBe(8); // 7 + 1
  });

  it('5. Rep goal increases weight when total reps exceed target threshold', () => {
    const strategy = new RepGoalProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'dips',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
      previousSets: [createMockSet(1, 20, 10), createMockSet(2, 20, 9), createMockSet(3, 20, 8)], // 10 + 9 + 8 = 27 reps
    };

    const suggestion = strategy.evaluate(context, { totalRepGoal: 25, incrementKg: 2.5 });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedSets[0]?.weight).toBe(22.5);
    expect(suggestion?.evidence).toContain('Total acumulado na sessão anterior: 27 reps');
  });

  it('6. Percentage based calculates load from estimated 1RM', () => {
    const strategy = new PercentageBasedProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'deadlift',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
      previousSets: [createMockSet(1, 140, 5)], // e1RM = 140 * (1 + 5/30) = 163.33kg
      estimated1Rm: 160,
    };

    const suggestion = strategy.evaluate(context, {
      targetPercentage: 0.8, // 80% of 160 = 128kg -> 128kg
      targetReps: 5,
    });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedSets[0]?.weight).toBe(128);
    expect(suggestion?.suggestedSets[0]?.reps).toBe(5);
  });

  it('7. RPE/RIR based detects undershooting and suggests load increase', () => {
    const strategy = new RpeRirProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'overhead-press',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }],
      previousSets: [
        createMockSet(1, 50, 8, true, SetType.NORMAL, 6.0), // RPE 6 (target is 8, 2 RPE under)
        createMockSet(2, 50, 8, true, SetType.NORMAL, 6.5),
      ],
    };

    const suggestion = strategy.evaluate(context, { targetRpe: 8.0, incrementKg: 2.5 });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.title).toContain('Aumentar Carga');
    expect(suggestion?.suggestedSets[0]?.weight).toBe(52.5);
  });

  it('8. Top set + Backoff derives backoff load from top set performance', () => {
    const strategy = new TopSetBackoffProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'barbell-row',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }, { setNumber: 3 }],
      previousSets: [
        createMockSet(1, 100, 5, true, SetType.TOP_SET),
        createMockSet(2, 90, 8, true, SetType.BACKOFF),
        createMockSet(3, 90, 8, true, SetType.BACKOFF),
      ],
    };

    const suggestion = strategy.evaluate(context, {
      topSetReps: 5,
      backoffPercentage: 0.9,
      backoffSets: 2,
      backoffReps: 8,
      incrementKg: 2.5,
    });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedSets[0]?.type).toBe(SetType.TOP_SET);
    expect(suggestion?.suggestedSets[0]?.weight).toBe(102.5);
    expect(suggestion?.suggestedSets[1]?.type).toBe(SetType.BACKOFF);
    // 102.5 * 0.9 = 92.25 -> rounded to 92.5
    expect(suggestion?.suggestedSets[1]?.weight).toBe(92.5);
  });

  it('9. Custom strategy evaluates arbitrary step and rep threshold', () => {
    const strategy = new CustomProgressionStrategy();
    const context: ProgressionContext = {
      exerciseId: 'cable-crunches',
      plannedSets: [{ setNumber: 1 }, { setNumber: 2 }],
      previousSets: [createMockSet(1, 40, 15), createMockSet(2, 40, 15)],
    };

    const suggestion = strategy.evaluate(context, {
      stepKg: 3.5,
      repTarget: 15,
      description: 'Abdominal Step',
    });
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedSets[0]?.weight).toBe(43.5);
  });

  it('10. ProgressionEngine evaluates batches deterministically without side effects', () => {
    const items: Array<{
      context: ProgressionContext;
      ruleConfig?: ProgressionRuleConfig;
    }> = [
      {
        context: {
          exerciseId: 'ex-1',
          plannedSets: [{ setNumber: 1 }],
          previousSets: [createMockSet(1, 50, 5)],
        },
        ruleConfig: {
          type: ProgressionStrategyType.LINEAR_PROGRESSION,
          config: { targetReps: 5, incrementKg: 2.5 },
        },
      },
      {
        context: {
          exerciseId: 'ex-2',
          plannedSets: [{ setNumber: 1 }],
          previousSets: [createMockSet(1, 20, 12)],
        },
        ruleConfig: {
          type: ProgressionStrategyType.DOUBLE_PROGRESSION,
          config: { minReps: 8, maxReps: 12, incrementKg: 2 },
        },
      },
    ];

    const results = ProgressionEngine.evaluateBatch(items);
    expect(results).toHaveLength(2);
    expect(results[0]?.suggestedSets[0]?.weight).toBe(52.5);
    expect(results[1]?.suggestedSets[0]?.weight).toBe(22);
  });
});
