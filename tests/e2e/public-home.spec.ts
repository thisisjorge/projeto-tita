import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test.use({ serviceWorkers: 'block' });

test('public Home leads to the existing workout without losing local data', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Seu treino, seus dados, sua evolução.' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Home' }).first()).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('link', { name: 'Começar a treinar' }).first().click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId('start-workout-button')).toBeEnabled();
  await page.getByRole('button', { name: 'Home' }).first().click();
  await expect(page).toHaveURL(/\/app\/home$/);
  await expect(
    page.getByRole('heading', { name: 'Seu treino, seus dados, sua evolução.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Treino' }).first().click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByTestId('start-workout-button')).toBeEnabled();
});

for (const width of [320, 390, 1440]) {
  test(`Home remains accessible and fits ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Seu treino, seus dados, sua evolução.' }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    const links = page.getByRole('link', { name: 'Começar a treinar' });
    await expect(links.first()).toBeInViewport();
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });
}
