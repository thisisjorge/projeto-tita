import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

// Rasterize the existing in-app monogram; no external art or runtime dependency.
const svg = await fs.readFile('public/icons/icon.svg', 'utf8');
// The same mark occupies more of the tiny browser-tab canvas.
const favicon = svg.replace('viewBox="0 0 40 40"', 'viewBox="6 6 28 28"');
await fs.writeFile('public/favicon.svg', favicon);
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(file, size, round = false, foreground = false, source = svg) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:100%;height:100%;${round ? 'border-radius:50%;' : ''}}</style>${foreground ? source.replace(/<rect\b[^>]*\/>/, '') : source}`,
  );
  await fs.mkdir(path.dirname(file), { recursive: true });
  const bytes = await page.screenshot({ omitBackground: true });
  const previous = await fs.readFile(file).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (!previous?.equals(bytes)) await fs.writeFile(file, bytes);
}
async function renderSplash(file) {
  const previous = await fs.readFile(file);
  const width = previous.readUInt32BE(16);
  const height = previous.readUInt32BE(20);
  const markSize = Math.round(Math.min(width, height) * 0.24);
  await page.setViewportSize({ width, height });
  await page.setContent(
    `<style>html,body{margin:0;width:100%;height:100%;background:#060709}body{display:grid;place-items:center}svg{width:${markSize}px;height:${markSize}px}</style>${svg.replaceAll('#0f1217', '#060709')}`,
  );
  const bytes = await page.screenshot();
  if (!previous.equals(bytes)) await fs.writeFile(file, bytes);
}
try {
  for (const size of [16, 32])
    await render(`public/icons/favicon-${size}.png`, size, false, false, favicon);
  // ICO container with a PNG entry: supported by current browsers and Windows.
  const png = await fs.readFile('public/icons/favicon-32.png');
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  await fs.writeFile('public/favicon.ico', Buffer.concat([header, png]));
  for (const size of [192, 512]) await render(`public/icons/icon-${size}.png`, size);
  await render('public/icons/icon-maskable-512.png', 512);
  await render('public/icons/apple-touch-icon.png', 180);
  await render('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png', 1024);
  for (const [density, scale] of [
    ['mdpi', 1],
    ['hdpi', 1.5],
    ['xhdpi', 2],
    ['xxhdpi', 3],
    ['xxxhdpi', 4],
  ]) {
    const root = `android/app/src/main/res/mipmap-${density}`;
    await render(`${root}/ic_launcher.png`, 48 * scale);
    await render(`${root}/ic_launcher_round.png`, 48 * scale, true);
    await render(`${root}/ic_launcher_foreground.png`, 108 * scale, false, true);
  }
  for (const entry of await fs.readdir('android/app/src/main/res')) {
    if (!entry.startsWith('drawable')) continue;
    const file = `android/app/src/main/res/${entry}/splash.png`;
    if (await fs.stat(file).catch(() => null)) await renderSplash(file);
  }
  const iosSplash = 'ios/App/App/Assets.xcassets/Splash.imageset';
  for (const file of await fs.readdir(iosSplash)) {
    if (file.endsWith('.png')) await renderSplash(`${iosSplash}/${file}`);
  }
} finally {
  await browser.close();
}
