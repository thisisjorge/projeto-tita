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

const DAY_PREFIXES: ReadonlyArray<readonly [Weekday, readonly string[]]> = [
  ['SEGUNDA', ['segunda', 'seg', 'monday', 'mon']],
  ['TERÇA', ['terca', 'ter', 'tuesday', 'tue']],
  ['QUARTA', ['quarta', 'qua', 'wednesday', 'wed']],
  ['QUINTA', ['quinta', 'qui', 'thursday', 'thu']],
  ['SEXTA', ['sexta', 'sex', 'friday', 'fri']],
  ['SÁBADO', ['sabado', 'sab', 'saturday', 'sat']],
  ['DOMINGO', ['domingo', 'dom', 'sunday', 'sun']],
];

/** Suggest only when a day explicitly begins the routine name. Never persist here. */
export function inferWeekdayFromRoutineName(name: string): Weekday | null {
  const normalized = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  for (const [day, prefixes] of DAY_PREFIXES) {
    if (prefixes.some((prefix) => new RegExp(`^${prefix}(?:\\s|[-–—:|])`).test(normalized))) {
      return day;
    }
  }
  return null;
}

export function routineDisplayTitle(name: string, weekday?: Weekday): string {
  if (!weekday || inferWeekdayFromRoutineName(name) !== weekday) return name;
  const title =
    name
      .replace(
        /^\s*(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|seg|ter|qua|qui|sex|sáb|sab|dom|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)(?:-feira)?\s*(?:[-–—:]\s*|\s+)/iu,
        '',
      )
      .trim() || name;
  if (title !== title.toLocaleUpperCase('pt-BR')) return title;
  return title
    .toLocaleLowerCase('pt-BR')
    .replace(
      /(^|[\s+])(\p{L})/gu,
      (_, before: string, letter: string) => before + letter.toLocaleUpperCase('pt-BR'),
    );
}

export function isOptionalRoutine(routine: Pick<Routine, 'weekday' | 'optional'>): boolean {
  return routine.optional === true;
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
