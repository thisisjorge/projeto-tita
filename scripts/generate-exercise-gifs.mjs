import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import gifenc from 'gifenc';

// Local, CC BY-SA 4.0 source frames only. No downloads, canvas or system fonts.
const root = fileURLToPath(new URL('../public/media/exercises/', import.meta.url));
const check = process.argv.includes('--check');
let total = 0;
let count = 0;
const selection = JSON.parse(
  await readFile(new URL('./catalog/media-selection.json', import.meta.url), 'utf8'),
);
for (const exercise of selection) {
  const folder = path.join(root, exercise.slug);
  const names = ['frame-1.svg', 'frame-2.svg', 'frame-3.svg'];
  const gif = gifenc.GIFEncoder();
  for (const name of names) {
    const svg = await readFile(path.join(folder, name));
    const rendered = new Resvg(svg, {
      fitTo: { mode: 'width', value: 256 },
      font: { loadSystemFonts: false },
    }).render();
    const pixels = rendered.pixels;
    // The source is a white silhouette; a shared transparent/white palette avoids
    // palette flicker, background flashes and theme-specific duplicate GIFs.
    const indexed = new Uint8Array(rendered.width * rendered.height);
    for (let i = 0; i < indexed.length; i++) indexed[i] = pixels[i * 4 + 3] >= 96 ? 1 : 0;
    gif.writeFrame(indexed, rendered.width, rendered.height, {
      palette: [
        [0, 0, 0],
        [255, 255, 255],
      ],
      transparent: true,
      transparentIndex: 0,
      dispose: 2,
      repeat: 0,
      delay: 900,
    });
  }
  gif.finish();
  const bytes = Buffer.from(gif.bytes());
  const output = path.join(folder, 'animation.gif');
  if (check) {
    if (!bytes.equals(await readFile(output))) throw new Error(`GIF out of date: ${exercise.slug}`);
  } else await writeFile(output, bytes);
  total += bytes.length;
  count++;
}
console.log(
  `${count} GIFs, ${total} bytes (${(total / 1024).toFixed(1)} KiB), 256px, 3 frames, loop 2700ms.`,
);
