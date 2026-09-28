import type { Routine } from './entities/routine.js';

export const WEEKDAYS = [
  'SEGUNDA',
  'TERÇA',
  'QUARTA',
  'QUINTA',
  'SEXTA',
  'SÁBADO',
  'DOMINGO',
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  SEGUNDA: 'Seg',
  TERÇA: 'Ter',
  QUARTA: 'Qua',
  QUINTA: 'Qui',
  SEXTA: 'Sex',
  SÁBADO: 'Sáb',
  DOMINGO: 'Dom',
};

export function isWeekday(value: unknown): value is Weekday {
  return typeof value === 'string' && WEEKDAYS.includes(value as Weekday);
}

export function localWeekday(date: Date): Weekday {
  return WEEKDAYS[(date.getDay() + 6) % 7]!;
}

export function isOptionalRoutine(routine: Pick<Routine, 'weekday' | 'optional'>): boolean {
  return routine.optional ?? (routine.weekday === 'SÁBADO' || routine.weekday === 'DOMINGO');
}

export function sortRoutinesByWeekday<T extends Pick<Routine, 'weekday' | 'name' | 'id'>>(
  routines: readonly T[],
): T[] {
  return [...routines].sort((a, b) => {
    const dayA = a.weekday ? WEEKDAYS.indexOf(a.weekday) : 7;
    const dayB = b.weekday ? WEEKDAYS.indexOf(b.weekday) : 7;
    return dayA - dayB || a.id.localeCompare(b.id);
  });
}
