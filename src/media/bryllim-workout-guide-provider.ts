import type { Exercise } from '../domain/entities/exercise.js';
import type { ExerciseMediaProvider, ExerciseMediaAttribution } from './exercise-media-provider.js';

const LOCAL_EXERCISES_BASE_URL = '/media/exercises';

// Normalized name or alias to workout-guide asset slug mapping
export const BRYLLIM_SLUG_MAP: Record<string, string> = {
  // Peito
  'supino reto com barra': 'bench-press',
  'bench press': 'bench-press',
  'barbell bench press': 'bench-press',
  'supino inclinado com halteres': 'incline-dumbbell-press',
  'incline dumbbell press': 'incline-dumbbell-press',
  'crucifixo com halteres': 'dumbbell-fly',
  'crossover na polia': 'cable-fly',
  'flexão de braços': 'push-up',
  'push-up': 'push-up',
  'supino declinado com barra': 'decline-bench-press',

  // Costas
  'puxada frontal na polia': 'lat-pulldown',
  'lat pulldown': 'lat-pulldown',
  'remada curvada com barra': 'barbell-row',
  'remada baixa na polia': 'seated-row',
  'barra fixa pronada': 'pull-up',
  'pull-up': 'pull-up',
  'remada unilateral com halter': 'one-arm-dumbbell-row',
  'levantamento terra convencional': 'deadlift',
  deadlift: 'deadlift',

  // Ombros
  'desenvolvimento militar com barra': 'overhead-press',
  'overhead press': 'overhead-press',
  'desenvolvimento com halteres': 'seated-dumbbell-press',
  'elevação lateral com halteres': 'lateral-raise',
  'elevação lateral na polia': 'cable-lateral-raise',
  'face pull na polia': 'face-pull',
  'crucifixo inverso com halteres': 'rear-delt-fly',

  // Pernas / Quads
  'agachamento livre com barra': 'squat',
  'barbell squat': 'squat',
  'leg press 45°': 'leg-press',
  'leg press': 'leg-press',
  'cadeira extensora': 'leg-extension',
  'agachamento búlgaro com halteres': 'bulgarian-split-squat',
  'agachamento frontal com barra': 'front-squat',

  // Posteriores & Glúteos
  'levantamento terra romeno / stiff': 'romanian-deadlift',
  'romanian deadlift': 'romanian-deadlift',
  'mesa flexora': 'lying-leg-curl',
  'cadeira flexora': 'seated-leg-curl',
  'elevação pélvica com barra': 'hip-thrust',

  // Panturrilhas
  'panturrilha em pé na máquina': 'standing-calf-raise',
  'panturrilha sentado na máquina': 'seated-calf-raise',

  // Bíceps
  'rosca direta com barra': 'bicep-curl',
  'barbell curl': 'bicep-curl',
  'rosca martelo com halteres': 'hammer-curl',
  'rosca scott com barra w': 'preacher-curl',
  'rosca inclinada com halteres': 'incline-dumbbell-curl',

  // Tríceps
  'tríceps corda na polia': 'rope-tricep-pushdown',
  'tríceps barra reta na polia': 'tricep-pushdown',
  'tríceps testa com barra w': 'skull-crusher',
  'mergulho nas paralelas': 'dip',
  'tríceps francês com halter': 'dumbbell-overhead-tricep-extension',

  // Abdômen
  'abdominal supra no solo': 'crunch',
  'abdominal na polia com corda': 'cable-crunch',
  'prancha isométrica': 'plank',
  'elevação de pernas na barra': 'hanging-leg-raise',
};

export class BryllimWorkoutGuideMediaProvider implements ExerciseMediaProvider {
  readonly providerId = 'bryllim-workout-guide';

  private resolveSlug(exercise: Exercise): string | null {
    const directName = exercise.name.trim().toLowerCase();
    if (BRYLLIM_SLUG_MAP[directName]) {
      return BRYLLIM_SLUG_MAP[directName];
    }
    for (const alias of exercise.aliases) {
      const aliasLower = alias.trim().toLowerCase();
      if (BRYLLIM_SLUG_MAP[aliasLower]) {
        return BRYLLIM_SLUG_MAP[aliasLower];
      }
    }
    return null;
  }

  isAvailable(exercise: Exercise): boolean {
    return this.resolveSlug(exercise) !== null;
  }

  getThumbnail(exercise: Exercise): string | null {
    const slug = this.resolveSlug(exercise);
    if (!slug) return null;
    return `${LOCAL_EXERCISES_BASE_URL}/${slug}.svg`;
  }

  getFrames(exercise: Exercise): readonly string[] | null {
    const slug = this.resolveSlug(exercise);
    if (!slug) return null;
    return [
      `${LOCAL_EXERCISES_BASE_URL}/${slug}/frame-1.svg`,
      `${LOCAL_EXERCISES_BASE_URL}/${slug}/frame-2.svg`,
    ];
  }

  getAttribution(exercise: Exercise): ExerciseMediaAttribution | null {
    if (!this.isAvailable(exercise)) return null;
    return {
      author: 'Bryllim',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://github.com/bryllim/workout-guide',
      notice: 'Ilustrações vetoriais do projeto @bryllim/workout-guide sob licença CC BY-SA 4.0.',
    };
  }
}
