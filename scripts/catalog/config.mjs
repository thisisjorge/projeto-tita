export const UPSTREAM_COMMIT = 'aac599224bb9780305239607ef98540b7e0ce389';
// Existing IDs are fixed. The last two curl mappings are corrected by equipment.
export const LEGACY_SLUGS = [
  'bench-press',
  'incline-dumbbell-press',
  'dumbbell-fly',
  'cable-fly',
  'push-up',
  'decline-bench-press',
  'lat-pulldown',
  'barbell-row',
  'seated-row',
  'pull-up',
  'one-arm-dumbbell-row',
  'deadlift',
  'overhead-press',
  'seated-dumbbell-press',
  'lateral-raise',
  'cable-lateral-raise',
  'face-pull',
  'rear-delt-fly',
  'squat',
  'leg-press',
  'leg-extension',
  'bulgarian-split-squat',
  'front-squat',
  'romanian-deadlift',
  'lying-leg-curl',
  'seated-leg-curl',
  'hip-thrust',
  'standing-calf-raise',
  'seated-calf-raise',
  null,
  'hammer-curl',
  null,
  'incline-dumbbell-curl',
  'rope-tricep-pushdown',
  'tricep-pushdown',
  'skull-crusher',
  'dip',
  'dumbbell-overhead-tricep-extension',
  'crunch',
  'cable-crunch',
  'plank',
  'hanging-leg-raise',
];
export const DUPLICATES = {
  'leg-curl': 'lying-leg-curl',
  'bent-over-rear-delt-raise': 'rear-delt-fly',
  'wide-grip-lat-pulldown': 'lat-pulldown',
  'side-lying-leg-raise': 'side-lying-hip-abduction',
  'chair-dip': 'bench-dip',
};
export const MUSCLES = {
  Grip: 'Pegada',
  Cardio: 'Condicionamento cardiovascular',
  Groin: 'Adutores',
  Chest: 'Peito',
  Shoulders: 'Ombros',
  'Rear Delts': 'Ombros',
  'Upper Back': 'Costas',
  'Posterior Chain': 'Posteriores de Coxa',
  Hamstrings: 'Posteriores de Coxa',
  Back: 'Costas',
  Lats: 'Costas',
  Biceps: 'Bíceps',
  Quads: 'Quadríceps',
  Glutes: 'Glúteos',
  Calves: 'Panturrilhas',
  Forearms: 'Antebraços',
  Triceps: 'Tríceps',
  Core: 'Abdômen',
  Legs: 'Pernas',
  'Lower Back': 'Lombar',
  Adductors: 'Adutores',
  Mobility: 'Mobilidade',
  Hips: 'Quadril',
};
export const EQUIPMENT = {
  Barbell: 'Barra',
  Dumbbell: 'Halteres',
  Machine: 'Máquina',
  Cable: 'Polia',
  Bodyweight: 'Peso Corporal',
  Cardio: 'Equipamento cardiovascular',
  Plate: 'Anilha',
  Kettlebell: 'Kettlebell',
  'Pull-up Bar': 'Barra fixa',
  Bench: 'Banco',
  Wall: 'Parede',
  Chair: 'Cadeira',
  Doorway: 'Batente de porta',
  Towel: 'Toalha',
  Box: 'Caixa',
  'Stability Ball': 'Bola suíça',
  'Resistance Band': 'Elástico',
};
export function roleFor(e) {
  // These actions have no faithful equivalent in the current substitution enums.
  if (
    /abduction|adduction|clamshell|fire-hydrant|hip-airplane|lateral-walk|monster-walk|shrug|wrist-|scapular|prone-y|reverse-snow|wall-walk|burpee|sprawl|skater-hop|front-raise|squat-thrust/.test(
      e.slug,
    )
  )
    return null;
  if (/pull-up|chin-up|pulldown/.test(e.slug)) return 'VERTICAL_PULL';
  if (/lunge|squat|step-up|step-down/.test(e.slug)) return 'SQUAT_PATTERN';
  if (/lateral-raise/.test(e.slug)) return 'LATERAL_RAISE';
  if (e.slug === 'upright-row') return 'VERTICAL_PULL';
  if (/push-up-shoulder-tap/.test(e.slug)) return 'HORIZONTAL_PRESS';
  if (/pike|handstand/.test(e.slug)) return 'VERTICAL_PRESS';
  if (/hamstring-curl|leg-curl/.test(e.slug)) return 'KNEE_FLEXION';
  if (/reverse-curl/.test(e.slug)) return 'ELBOW_FLEXION';
  return (
    {
      Chest: 'HORIZONTAL_PRESS',
      Shoulders: 'VERTICAL_PRESS',
      'Rear Delts': 'HORIZONTAL_PULL',
      'Upper Back': 'HORIZONTAL_PULL',
      Back: 'HORIZONTAL_PULL',
      Lats: 'VERTICAL_PULL',
      Biceps: 'ELBOW_FLEXION',
      Triceps: 'ELBOW_EXTENSION',
      Quads: 'SQUAT_PATTERN',
      Hamstrings: 'HIP_HINGE',
      'Posterior Chain': 'HIP_HINGE',
      Glutes: 'HIP_HINGE',
      'Lower Back': 'HIP_HINGE',
      Calves: 'CALF',
      Core: 'CORE',
    }[e.primaryMuscle] ?? null
  );
}
