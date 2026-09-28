import type { Exercise } from '../domain/entities/exercise.js';

// Display and search enrichment keyed by stable native IDs. Stored records and history stay intact.
const enhancements: Record<string, { name?: string; aliases: readonly string[] }> = {
  '3f353d81-231a-52ea-a84d-36ae89aee8b5': {
    name: 'Remada Apoiada na Máquina',
    aliases: [
      'remada apoiada',
      'remada máquina',
      'remada na máquina',
      'machine row',
      'chest supported row',
      'chest-supported row',
      'chest supported machine row',
      'row chest',
    ],
  },
  '50ab9e26-6a58-5b72-a424-c928b9f05cfe': {
    aliases: [
      'posterior de ombro',
      'deltoide posterior',
      'rear delt',
      'rear delt fly',
      'reverse fly',
      'reverse pec deck',
      'crucifixo inverso',
    ],
  },
  '00000000-0000-4000-8000-000000000018': {
    aliases: [
      'posterior de ombro com halteres',
      'rear delt fly',
      'reverse fly',
      'crucifixo inverso',
    ],
  },
  'a58a507a-92fd-5422-a7e4-63b0845af613': {
    name: 'Supino Inclinado com Barra',
    aliases: [
      'supino inclinado',
      'incline bench',
      'incline bench press',
      'incline barbell press',
      'barbell incline press',
      'incline press barbell',
      'incline bar',
    ],
  },
  '00000000-0000-4000-8000-000000000002': {
    aliases: ['supino inclinado', 'incline db', 'incline dumbbell', 'incline dumbbell press'],
  },
  '8a7f4d2d-1a6d-56b1-a4ca-3d453eb8950c': {
    name: 'Tríceps Francês na Polia',
    aliases: [
      'tríceps francês polia',
      'tríceps francês na polia',
      'cable overhead triceps extension',
      'overhead cable triceps extension',
      'triceps overhead cable',
      'overhead triceps cable',
      'frances polia',
      'tríceps overhead',
    ],
  },
  '00000000-0000-4000-8000-000000000038': { aliases: ['tríceps overhead', 'frances halter'] },
  '72c3b52f-674d-50ea-a2e4-37cd8f365d01': {
    aliases: ['puxada neutra', 'neutral pulldown', 'neutral grip lat pulldown'],
  },
  '0c6a4cc3-b8f1-5250-a1cf-9bef09231875': {
    aliases: ['máquina convergente', 'chest press', 'supino máquina convergente'],
  },
  '00000000-0000-4000-8000-000000000034': { aliases: ['pressdown', 'triceps pressdown'] },
  '00000000-0000-4000-8000-000000000024': { aliases: ['RDL', 'stiff', 'romanian deadlift'] },
};

export function enhanceExercise(exercise: Exercise): Exercise {
  if (exercise.source !== 'system') return exercise;
  const enhancement = enhancements[exercise.id];
  if (!enhancement) return exercise;
  return {
    ...exercise,
    name: enhancement.name ?? exercise.name,
    aliases: [...new Set([...exercise.aliases, ...enhancement.aliases])],
  };
}
