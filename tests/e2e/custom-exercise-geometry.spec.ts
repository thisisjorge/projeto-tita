import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

for (const theme of ['dark', 'light']) {
  for (const width of [320, 360, 375, 390, 430, 768, 834, 1024, 1440]) {
    test(`custom exercise ${theme} ${width}px aligns both paired rows`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.addInitScript((theme) => localStorage.setItem('tita-theme', theme), theme);
      await page.goto('/app/library');
      await page.getByTestId('create-custom-exercise-btn').click();
      const name = page.getByLabel('Nome do Exercício *', { exact: true });
      const muscle = page.getByLabel('Músculo Principal *', { exact: true });
      const equipment = page.getByLabel('Equipamento *', { exact: true });
      const rest = page.getByLabel('Descanso Padrão (segundos)', { exact: true });
      const increment = page.getByLabel('Incremento Mínimo (kg)', { exact: true });
      const [full, left, right, lowerLeft, lowerRight] = await Promise.all(
        [name, muscle, equipment, rest, increment].map((field) => field.boundingBox()),
      );
      for (const [a, b] of [
        [left, lowerLeft],
        [right, lowerRight],
      ]) {
        expect(Math.abs(a!.x - b!.x)).toBeLessThan(0.5);
        expect(Math.abs(a!.width - b!.width)).toBeLessThan(0.5);
      }
      expect(Math.abs(left!.y - right!.y)).toBeLessThan(0.5);
      expect(Math.abs(lowerLeft!.y - lowerRight!.y)).toBeLessThan(0.5);
      expect(Math.abs(full!.x - left!.x)).toBeLessThan(0.5);
      expect(Math.abs(full!.x + full!.width - right!.x - right!.width)).toBeLessThan(0.5);
      for (const box of [left, right, lowerLeft, lowerRight]) {
        expect(box!.height).toBeGreaterThanOrEqual(44);
        expect(box!.x).toBeGreaterThanOrEqual(full!.x);
        expect(box!.x + box!.width).toBeLessThanOrEqual(full!.x + full!.width + 0.5);
      }
      const audit = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(audit.violations).toEqual([]);
      await page
        .getByRole('dialog')
        .locator('.tita-dialog')
        .evaluate((el) => el.scrollTo(0, 0));
      if (process.env.RC_MODAL_CAPTURE_DIR) {
        await fs.mkdir(process.env.RC_MODAL_CAPTURE_DIR, { recursive: true });
        await page.screenshot({
          path: path.join(
            process.env.RC_MODAL_CAPTURE_DIR,
            `${theme}-${width}-custom-exercise.png`,
          ),
        });
      }
      await name.fill(`Exercício QA ${width}`);
      await increment.click();
      await increment.fill('2.5');
      await page
        .getByRole('dialog')
        .getByRole('button', { name: 'Criar Exercício', exact: true })
        .click();
      await expect(page.getByRole('dialog')).toBeHidden();
    });
  }
}
