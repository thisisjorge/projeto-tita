import { describe, expect, it } from 'vitest';
import {
  builtinExerciseName,
  builtinRoutineName,
  builtinSplitLabel,
} from '../../src/data/builtin-display.js';
import { SEED_EXERCISES } from '../../src/data/seed-exercises.js';
import { SEED_TEMPLATES } from '../../src/data/seed-templates.js';

describe('Rótulos dos built-ins', () => {
  it('mantém IDs e usa nomes PT-BR em todo o catálogo de exercícios', () => {
    expect(SEED_EXERCISES).toHaveLength(217);
    expect(new Set(SEED_EXERCISES.map((exercise) => exercise.id)).size).toBe(217);
    for (const exercise of SEED_EXERCISES) {
      expect(builtinExerciseName(exercise.id, 'Legacy English Name')).toBe(exercise.name);
    }
    expect(builtinExerciseName('id-personalizado', 'Row Chest')).toBe('Row Chest');
  });

  it('apresenta modelos e divisões em português sem alterar suas chaves', () => {
    expect(SEED_TEMPLATES.map((template) => template.id)).toEqual([
      'template-full-body-3x',
      'template-upper-lower-4x',
      'template-ppl-6x',
    ]);
    expect(SEED_TEMPLATES.map((template) => template.name)).toEqual([
      'Corpo inteiro 3x por semana',
      'Superior / Inferior 4x por semana',
      'PPL 6x por semana (empurrar / puxar / pernas)',
    ]);
    const builtInNames = SEED_TEMPLATES.flatMap((template) => [
      template.name,
      ...template.routines.map((routine) => routine.name),
    ]);
    expect(builtInNames.join(' ')).not.toMatch(
      /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun|Upper|Lower|Full Body)\b/,
    );
    expect(builtinSplitLabel('Upper / Lower')).toBe('Superior / Inferior');
  });

  it('traduz apenas nomes legados ligados a modelos built-in', () => {
    expect(builtinRoutineName('template-upper-lower-4x', 'Thu Upper')).toBe('Quinta · Superior');
    expect(builtinRoutineName('template-ppl-6x', 'Mon Pull')).toBe('Segunda · Puxar');
    expect(builtinRoutineName('template-upper-lower-4x', 'Upper A — Força & Peitoral')).toBe(
      'Superior A — Força e peitoral',
    );
    expect(builtinRoutineName(undefined, 'Mon Pull')).toBe('Mon Pull');
    expect(builtinRoutineName('template-ppl-6x', 'Meu Pull especial')).toBe('Meu Pull especial');
  });
});
