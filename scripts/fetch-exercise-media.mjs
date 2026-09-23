import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { UPSTREAM_COMMIT } from './catalog/config.mjs';

const selected = JSON.parse(await readFile('scripts/catalog/media-selection.json', 'utf8'));
const jobs = selected.flatMap((exercise) =>
  exercise.frames.map((frame) => ({ ...frame, slug: exercise.slug })),
);
const blobHash = (data) =>
  createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
let downloaded = 0;
let verified = 0;
// Bounded concurrency; blobs are verified against the pinned Git tree before writing.
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (;;) {
      const job = jobs.shift();
      if (!job) return;
      if (!/^assets\/[a-z0-9-]+\/frame-[123]\.svg$/.test(job.path))
        throw new Error('Unexpected asset path');
      const target = `public/media/exercises/${job.slug}/${job.path.split('/').at(-1)}`;
      let data;
      try {
        data = await readFile(target);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
      if (data && blobHash(data) === job.sha) {
        verified++;
        continue;
      }
      if (process.argv.includes('--check'))
        throw new Error(`Missing or modified upstream frame: ${target}`);
      const response = await fetch(
        `https://raw.githubusercontent.com/bryllim/workout-guide/${UPSTREAM_COMMIT}/packages/workout-guide/${job.path}`,
        { signal: AbortSignal.timeout(30000) },
      );
      if (!response.ok) throw new Error(`Asset HTTP ${response.status}: ${job.path}`);
      data = Buffer.from(await response.arrayBuffer());
      if (blobHash(data) !== job.sha) throw new Error(`Asset checksum mismatch: ${job.path}`);
      if (
        /<script|<foreignObject|\bon\w+=|(?:href|src)=["'](?:https?:|data:|javascript:)/i.test(
          data.toString(),
        )
      )
        throw new Error(`Non-static SVG: ${job.path}`);
      await mkdir(`public/media/exercises/${job.slug}`, { recursive: true });
      await writeFile(target, data);
      downloaded++;
    }
  }),
);
console.log(
  `${downloaded} SVGs downloaded; ${verified} already verified. Commit ${UPSTREAM_COMMIT}.`,
);
