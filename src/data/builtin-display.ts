import { SEED_EXERCISES } from './seed-exercises.js';
import { SEED_TEMPLATES, type ProgramTemplate } from './seed-templates.js';

const exerciseNames = new Map(SEED_EXERCISES.map((exercise) => [exercise.id, exercise.name]));

const legacyRoutineNames = new Map<string, string>([
  ['Full Body A', 'Corpo inteiro A'],
  ['Full Body B', 'Corpo inteiro B'],
  ['Full Body C', 'Corpo inteiro C'],
  ['Upper A — Força & Peitoral', 'Superior A — Força e peitoral'],
  ['Lower A — Quadríceps & Panturrilha', 'Inferior A — Quadríceps e panturrilha'],
  ['Upper B — Costas & Deltoides', 'Superior B — Costas e deltoides'],
  ['Lower B — Cadeia Posterior & Glúteos', 'Inferior B — Posteriores e glúteos'],
  ['Push A — Peitoral & Tríceps', 'Empurrar A — Peitoral e tríceps'],
  ['Pull A — Costas & Bíceps', 'Puxar A — Costas e bíceps'],
  ['Legs A — Foco Quadríceps', 'Pernas A — Foco em quadríceps'],
  ['Push B — Foco Ombros & Superior Peitoral', 'Empurrar B — Ombros e peitoral superior'],
  ['Pull B — Foco Dorsal & Trapézio', 'Puxar B — Dorsal e trapézio'],
  ['Legs B — Foco Posterior & Glúteos', 'Pernas B — Posteriores e glúteos'],
]);

const weekdays: Record<string, string> = {
  Mon: 'Segunda',
  Tue: 'Terça',
  Wed: 'Quarta',
  Thu: 'Quinta',
  Fri: 'Sexta',
  Sat: 'Sábado',
  Sun: 'Domingo',
};

const routineTypes: Record<string, string> = {
  'Full Body': 'Corpo inteiro',
  Upper: 'Superior',
  Lower: 'Inferior',
  Push: 'Empurrar',
  Pull: 'Puxar',
  Legs: 'Pernas',
};

export function builtinExerciseName(id: string, storedName: string): string {
  return exerciseNames.get(id) ?? storedName;
}

export function builtinRoutineName(templateRef: string | undefined, storedName: string): string {
  if (!templateRef || !SEED_TEMPLATES.some((template) => template.id === templateRef)) {
    return storedName;
  }

  const knownName = legacyRoutineNames.get(storedName);
  if (knownName) return knownName;

  const weekdayRoutine =
    /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Full Body|Upper|Lower|Push|Pull|Legs)(?: ([AB]))?$/.exec(
      storedName,
    );
  if (!weekdayRoutine) return storedName;

  const [, day, type, variant] = weekdayRoutine;
  return `${weekdays[day!]} · ${routineTypes[type!]}${variant ? ` ${variant}` : ''}`;
}

export function builtinSplitLabel(splitType: ProgramTemplate['splitType']): string {
  switch (splitType) {
    case 'Full Body':
      return 'Corpo inteiro';
    case 'Upper / Lower':
      return 'Superior / Inferior';
    case 'Push / Pull / Legs':
      return 'PPL (empurrar / puxar / pernas)';
  }
}
