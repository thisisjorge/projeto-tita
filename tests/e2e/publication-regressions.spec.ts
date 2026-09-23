import { test, expect, type Page } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function expectThemeInViewport(page: Page) {
  const toggle = page.getByRole('button', { name: 'Alternar tema claro e escuro' });
  await expect(toggle).toHaveCount(1);
  await expect(toggle).toBeInViewport({ ratio: 1 });
  const box = await toggle.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  return toggle;
}

for (const width of [320, 360, 390, 834, 1440]) {
  test(`Treino theme stays reachable and persists at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/app');
    await page.getByTestId('start-workout-button').waitFor();
    await expectThemeInViewport(page);
    await page.getByTestId('start-workout-button').click();
    await expect(page.getByTestId('active-workout-session')).toBeVisible();
    await expect(page.locator('body')).toHaveAttribute('data-tita-focus-mode', 'true');
    await expectThemeInViewport(page);
    await page.locator('.tita-set-row').last().scrollIntoViewIfNeeded();
    await (await expectThemeInViewport(page)).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.getByTestId('active-workout-session')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expectThemeInViewport(page);
    await page.goto('/app/library');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.goto('/app');
    await expect(page.getByTestId('active-workout-session')).toBeVisible();
    await (await expectThemeInViewport(page)).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
}

for (const theme of ['light', 'dark']) {
  test(`exercise animation, pause, resume and reduced motion in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('tita-theme', value), theme);
    await page.goto('/app/library');
    const card = page.locator('[data-testid^="exercise-card-"]').first();
    await expect(card).toContainText('Ver animação');
    await card.click();
    const frame = page.locator('.tita-exercise-media img').first();
    await expect(frame).toBeVisible();
    const initial = await frame.getAttribute('src');
    expect(initial).toMatch(/\/animation\.gif$/);
    const response = await page.request.get(initial!);
    expect(response.headers()['content-type']).toContain('image/gif');
    expect((await response.body()).subarray(0, 6).toString()).toBe('GIF89a');
    await expect(frame).toHaveJSProperty('naturalWidth', 256);
    await page.getByRole('button', { name: 'Pausar animação' }).click();
    const paused = await frame.getAttribute('src');
    expect(paused).toMatch(/\.svg$/);
    await page.clock.install();
    await page.clock.runFor(1600);
    await expect(frame).toHaveAttribute('src', paused!);
    await page.getByRole('button', { name: 'Reproduzir animação' }).click();
    await page.clock.runFor(800);
    await expect(frame).not.toHaveAttribute('src', paused!);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.getByRole('button', { name: 'Reproduzir animação' })).toBeVisible();
    const reduced = await frame.getAttribute('src');
    await page.clock.runFor(1600);
    await expect(frame).toHaveAttribute('src', reduced!);
    await page.clock.resume();
  });

  test(`exercise image failure keeps a visible fallback in ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('tita-theme', value), theme);
    await page.route('**/media/exercises/**', (route) => route.abort());
    await page.goto('/app/library');
    await page.locator('[data-testid^="exercise-card-"]').first().click();
    await expect(page.getByTestId('exercise-media-fallback').locator('svg')).toBeVisible();
  });
}

test('served HTML, favicon family and PWA manifest resolve real assets', async ({
  page,
  request,
}) => {
  await page.goto('/app');
  const icons = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((links) => links.map((link) => (link as HTMLLinkElement).href));
  expect(icons.length).toBeGreaterThanOrEqual(4);
  for (const icon of icons) {
    const response = await request.get(icon);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).not.toContain('text/html');
  }
  const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute('href');
  const response = await request.get(manifestUrl!);
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.icons.length).toBeGreaterThan(0);
  for (const icon of manifest.icons) {
    const asset = await request.get(icon.src);
    expect(asset.status()).toBe(200);
    expect(asset.headers()['content-type']).toContain('image/');
  }
});
