import { describe, expect, it } from 'vitest';
import { DoubleProgressionStrategy } from '../../src/domain/progression/progression-strategies.js';
import { SetType } from '../../src/domain/enums/set-type.js';
import type { ExerciseSet } from '../../src/domain/entities/exercise-set.js';

const sets = (reps: number[], rir = 2): ExerciseSet[] =>
  reps.map((value, index) => ({
    id: `set-${index}`,
    setNumber: index + 1,
    type: SetType.NORMAL,
    weight: 70,
    reps: value,
    rir,
    completed: true,
  }));

describe('Double progression com faixa, RIR e histórico recente', () => {
  const strategy = new DoubleProgressionStrategy();
  const plannedSets = Array.from({ length: 4 }, (_, index) => ({
    setNumber: index + 1,
    minReps: 5,
    maxReps: 8,
    targetRir: 2,
  }));

  it('mantém 70 kg em 8/8/7/6 e aumenta só após 8/8/8/8 com RIR adequado', () => {
    const base = { exerciseId: 'bench', plannedSets, incrementKg: 2.5 };
    expect(
      strategy.evaluate({ ...base, previousSets: sets([8, 8, 7, 6]) })?.suggestedSets[0]?.weight,
    ).toBe(70);
    expect(
      strategy.evaluate({ ...base, previousSets: sets([8, 8, 8, 8]) })?.suggestedSets[0]?.weight,
    ).toBe(72.5);
    expect(
      strategy.evaluate({ ...base, previousSets: sets([8, 8, 8, 8], 1) })?.suggestedSets[0]?.weight,
    ).toBe(70);
    expect(
      strategy.evaluate({ ...base, previousSets: sets([8, 8, 8]) })?.suggestedSets[0]?.weight,
    ).toBe(70);
  });

  it('observa queda isolada e sugere revisão só após quedas consecutivas', () => {
    const base = { exerciseId: 'bench', plannedSets, incrementKg: 2.5 };
    expect(
      strategy.evaluate({
        ...base,
        previousSets: sets([7, 6, 6, 5]),
        earlierSessions: [sets([8, 8, 7, 6])],
      })?.title,
    ).toContain('Adicionar Reps');
    const decline = strategy.evaluate({
      ...base,
      previousSets: sets([7, 6, 6, 5]),
      earlierSessions: [sets([8, 8, 7, 6]), sets([8, 8, 8, 7])],
    });
    expect(decline?.title).toContain('Revisar Carga');
    expect(decline?.evidence).toContain('duas sessões consecutivas');
    expect(decline?.status).toBe('PENDING');
  });
});
