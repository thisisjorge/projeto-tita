import type { Exercise } from '../domain/entities/exercise.js';

export function normalizeExerciseQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function nearToken(query: string, target: string): boolean {
  if (target.startsWith(query)) return true;
  if (query.length < 4 || Math.abs(query.length - target.length) > 2) return false;
  let distance = 0;
  const a = query.length <= target.length ? query : target;
  const b = query.length <= target.length ? target : query;
  for (let i = 0, j = 0; i < a.length && j < b.length; i++, j++) {
    if (a[i] !== b[j]) {
      distance++;
      if (a.length !== b.length) j++;
      if (distance > 1) return false;
    }
  }
  return true;
}

export function exerciseSearchScore(exercise: Exercise, query: string): number {
  const q = normalizeExerciseQuery(query);
  if (!q) return 0;
  const name = normalizeExerciseQuery(exercise.name);
  const aliases = exercise.aliases.map(normalizeExerciseQuery);
  if (name === q) return 100;
  if (aliases.includes(q)) return 90;
  if (name.startsWith(q)) return 80;
  if (aliases.some((alias) => alias.startsWith(q))) return 70;
  if (name.includes(q)) return 60;
  if (aliases.some((alias) => alias.includes(q))) return 50;
  const queryTokens = q.split(' ');
  if (
    [name, ...aliases].some((candidate) => {
      const words = candidate.split(' ');
      return queryTokens.every((token) => words.some((word) => nearToken(token, word)));
    })
  )
    return 30;
  return -1;
}
