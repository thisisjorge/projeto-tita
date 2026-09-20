import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetDir = path.resolve(__dirname, '../public/media/exercises');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Map from internal exercise name to bryllim/workout-guide asset folder
export const EXERCISE_FOLDER_MAP = {
  'Supino Reto com Barra': 'bench-press',
  'Supino Inclinado com Halteres': 'incline-dumbbell-press',
  'Crucifixo com Halteres': 'dumbbell-fly',
  'Crossover na Polia': 'cable-fly',
  'Flexão de Braços': 'push-up',
  'Supino Declinado com Barra': 'decline-bench-press',
  'Puxada Frontal na Polia': 'lat-pulldown',
  'Remada Curvada com Barra': 'barbell-row',
  'Remada Baixa na Polia': 'seated-row',
  'Barra Fixa Pronada': 'pull-up',
  'Remada Unilateral com Halter': 'one-arm-dumbbell-row',
  'Levantamento Terra Convencional': 'deadlift',
  'Desenvolvimento Militar com Barra': 'overhead-press',
  'Desenvolvimento com Halteres': 'seated-dumbbell-press',
  'Elevação Lateral com Halteres': 'lateral-raise',
  'Elevação Lateral na Polia': 'cable-lateral-raise',
  'Face Pull na Polia': 'face-pull',
  'Crucifixo Inverso com Halteres': 'rear-delt-fly',
  'Agachamento Livre com Barra': 'squat',
  'Leg Press 45°': 'leg-press',
  'Cadeira Extensora': 'leg-extension',
  'Agachamento Búlgaro com Halteres': 'bulgarian-split-squat',
  'Agachamento Frontal com Barra': 'front-squat',
  'Levantamento Terra Romeno / Stiff': 'romanian-deadlift',
  'Mesa Flexora': 'lying-leg-curl',
  'Cadeira Flexora': 'seated-leg-curl',
  'Elevação Pélvica com Barra': 'hip-thrust',
  'Panturrilha em Pé na Máquina': 'standing-calf-raise',
  'Panturrilha Sentado na Máquina': 'seated-calf-raise',
  'Rosca Direta com Barra': 'bicep-curl',
  'Rosca Martelo com Halteres': 'hammer-curl',
  'Rosca Scott com Barra W': 'preacher-curl',
  'Rosca Inclinada com Halteres': 'incline-dumbbell-curl',
  'Tríceps Corda na Polia': 'rope-tricep-pushdown',
  'Tríceps Barra Reta na Polia': 'tricep-pushdown',
  'Tríceps Testa com Barra W': 'skull-crusher',
  'Mergulho nas Paralelas': 'dip',
  'Tríceps Francês com Halter': 'dumbbell-overhead-tricep-extension',
  'Abdominal Supra no Solo': 'crunch',
  'Abdominal na Polia com Corda': 'cable-crunch',
  'Prancha Isométrica': 'plank',
  'Elevação de Pernas na Barra': 'hanging-leg-raise',
};

const BASE_URL =
  'https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/assets';

async function downloadExerciseAssets() {
  console.log('Downloading @bryllim/workout-guide vector illustrations...');
  let downloadedCount = 0;

  for (const [exerciseName, folder] of Object.entries(EXERCISE_FOLDER_MAP)) {
    const exerciseDir = path.join(targetDir, folder);
    if (!fs.existsSync(exerciseDir)) {
      fs.mkdirSync(exerciseDir, { recursive: true });
    }

    const filesToDownload = ['frame-1.svg', 'frame-2.svg'];

    for (const file of filesToDownload) {
      const destPath = path.join(exerciseDir, file);
      if (!fs.existsSync(destPath)) {
        const url = `${BASE_URL}/${folder}/${file}`;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const svgContent = await res.text();
            fs.writeFileSync(destPath, svgContent, 'utf-8');
            // If frame-1.svg, also save as thumbnail at parent level for easy reference
            if (file === 'frame-1.svg') {
              fs.writeFileSync(path.join(targetDir, `${folder}.svg`), svgContent, 'utf-8');
            }
            downloadedCount++;
          } else {
            console.warn(`[WARN] Failed to fetch ${url} (HTTP ${res.status})`);
          }
        } catch (err) {
          console.error(`[ERROR] Fetching ${url}:`, err);
        }
      }
    }
    console.log(`✓ Processed: ${exerciseName} (${folder})`);
  }

  console.log(`Done! Total asset files cached locally: ${downloadedCount}`);
}

downloadExerciseAssets();
