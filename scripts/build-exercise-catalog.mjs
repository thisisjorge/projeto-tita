import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { format } from 'prettier';
import {
  UPSTREAM_COMMIT,
  LEGACY_SLUGS,
  DUPLICATES,
  MUSCLES,
  EQUIPMENT,
  roleFor,
} from './catalog/config.mjs';

const upstream = JSON.parse(await readFile('scripts/catalog/upstream-manifest.json', 'utf8'));
const tree = JSON.parse(await readFile('scripts/catalog/upstream-tree.json', 'utf8')).tree;
const legacy = JSON.parse(await readFile('scripts/catalog/legacy-exercises.json', 'utf8'));
const names = Object.fromEntries(
  (await readFile('scripts/catalog/names-pt-br.txt', 'utf8'))
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split('|')),
);
const normalize = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
const existing = new Map(LEGACY_SLUGS.map((slug, index) => [slug, legacy[index]]));
const extras = [];
const mapping = {};
const matrix = [];
const selected = [];
const allNames = new Set(legacy.map((e) => normalize(e.name)));
const stableId = (slug) => {
  const hex = createHash('sha256').update(`tita:bryllim:${slug}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
for (const e of upstream) {
  const old = existing.get(e.slug);
  const translated = old?.name ?? names[e.slug];
  if (!translated) throw new Error(`Nome não revisado: ${e.slug}`);
  const muscle = MUSCLES[e.primaryMuscle];
  const equipment = e.slug === 'trap-bar-deadlift' ? 'Barra hexagonal' : EQUIPMENT[e.equipment];
  if (!muscle || !equipment || e.secondaryMuscles.some((m) => !MUSCLES[m]))
    throw new Error(`Metadata não mapeada: ${e.slug}`);
  const available =
    e.frames.length === 3 &&
    e.frames.every(
      (frame) =>
        frame.attribution.license === 'CC BY-SA 4.0' &&
        tree.some((blob) => blob.path === `packages/workout-guide/${frame.path}`),
    );
  let reason = '';
  if (DUPLICATES[e.slug]) reason = `Duplicado de ${DUPLICATES[e.slug]}; mesma execução/equipamento`;
  else if (!old && !['weight_reps', 'bodyweight_reps'].includes(e.exerciseType))
    reason = `Tipo ${e.exerciseType}: sem semântica de conclusão/carga equivalente no fluxo padrão V1`;
  else if (!old && !roleFor(e))
    reason = 'Movimento sem role equivalente nos enums V1; não atribuir substituição incorreta';
  else if (!available) reason = 'Mídia/licença incompleta';
  if (!old && !reason && allNames.has(normalize(translated)))
    throw new Error(`Nome duplicado: ${translated}`);
  const id = old?.id ?? stableId(e.slug);
  if (!reason) {
    mapping[id] = e.slug;
    selected.push(e);
    if (!old) {
      allNames.add(normalize(translated));
      const alias = legacy.some((item) =>
        [item.name, ...item.aliases].some((a) => normalize(a) === normalize(e.name)),
      )
        ? `${e.name} (${e.equipment})`
        : e.name;
      extras.push({
        id,
        schemaVersion: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        name: translated,
        aliases: [alias],
        primaryMuscle: muscle,
        secondaryMuscles: [...new Set(e.secondaryMuscles.map((m) => MUSCLES[m]))].filter(
          (m) => m !== muscle,
        ),
        equipment,
        category: 'Força',
        instructions: [
          'Consulte a demonstração do movimento. O catálogo de origem não fornece instruções técnicas em texto para esta variante.',
        ],
        source: 'system',
        roles: [roleFor(e)],
        defaultRestSeconds: 90,
        mediaRefs: [
          {
            provider: 'bryllim-workout-guide',
            type: 'animation',
            uri: `/media/exercises/${e.slug}/animation.gif`,
            attribution: 'Bryl Lim / Everkinetic · CC BY-SA 4.0',
          },
        ],
        license: 'CC BY-SA 4.0',
        attribution: `Bryl Lim / Everkinetic. Fonte: https://github.com/bryllim/workout-guide/tree/${UPSTREAM_COMMIT}`,
      });
    }
  }
  matrix.push([
    id,
    old?.name ?? translated,
    e.slug,
    available ? 'sim' : 'não',
    DUPLICATES[e.slug] ?? (old ? 'já existente' : 'não'),
    translated,
    muscle,
    equipment,
    reason || (old ? 'preservar ID existente' : 'incluir'),
    '',
  ]);
}
// The legacy Scott barbell entry remains untouched until a faithful source is available.
for (const index of [29, 31]) {
  mapping[legacy[index].id] = '';
  matrix.push([
    legacy[index].id,
    legacy[index].name,
    '',
    'não',
    'não',
    legacy[index].name,
    legacy[index].primaryMuscle,
    legacy[index].equipment,
    'preservar; mídia antiga de equipamento incompatível',
    'Fallback local; dados antigos intactos',
  ]);
}
const check = process.argv.includes('--check');
async function output(file, contents, parser) {
  if (parser)
    contents = await format(contents, {
      parser,
      singleQuote: true,
      printWidth: 100,
      trailingComma: 'all',
    });
  if (check) {
    if ((await readFile(file, 'utf8')) !== contents)
      throw new Error(`Catálogo desatualizado: ${file}`);
  } else await writeFile(file, contents);
}
await mkdir('docs/v1-final', { recursive: true });
await output(
  'src/data/catalog-generated.ts',
  `// Generated by scripts/build-exercise-catalog.mjs. Curated names and exclusions live in scripts/catalog.\nimport type { Exercise } from '../domain/entities/exercise.js';\nexport const EXPANDED_EXERCISES = ${JSON.stringify(extras)} as readonly Exercise[];\nexport const EXERCISE_MEDIA_SLUGS: Record<string, string> = ${JSON.stringify(mapping)};\n`,
  'typescript',
);
await output(
  'scripts/catalog/media-selection.json',
  JSON.stringify(
    selected.map((e) => ({
      slug: e.slug,
      frames: e.frames.map((frame) => ({
        path: frame.path,
        sha: tree.find((blob) => blob.path === `packages/workout-guide/${frame.path}`).sha,
      })),
    })),
  ),
  'json',
);
await output(
  'docs/v1-final/catalog-matrix.md',
  `# Inventário do catálogo\n\nUpstream: ${UPSTREAM_COMMIT}. ${upstream.length} exercícios; 42 legados preservados; ${extras.length} novos.\n\n| Titã ID | Nome Titã | Upstream slug | Disponível | Duplicado | Tradução PT-BR | Músculo | Equipamento | Incluir? | Observação |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${matrix.map((row) => `| ${row.join(' | ')} |`).join('\n')}\n`,
);
console.log(
  JSON.stringify(
    {
      upstream: upstream.length,
      legacy: legacy.length,
      added: extras.length,
      duplicates: Object.keys(DUPLICATES).length,
      excluded: matrix.filter((row) => row[8].startsWith('Tipo') || row[8].startsWith('Movimento'))
        .length,
      catalog: legacy.length + extras.length,
      media: selected.length,
    },
    null,
    2,
  ),
);
