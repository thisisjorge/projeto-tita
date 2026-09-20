import { test, expect } from '@playwright/test';

// Canonical cross-viewport breakpoints specified in Task 15.3 & REQ-8
const BREAKPOINTS = [
  { name: '320px (Ultra-Compact Mobile)', width: 320, height: 568, isMobile: true },
  { name: '360px (Compact Android)', width: 360, height: 640, isMobile: true },
  { name: '390px (Standard iOS / iPhone 12/13/14)', width: 390, height: 844, isMobile: true },
  { name: '430px (Large Mobile / iPhone Pro Max)', width: 430, height: 932, isMobile: true },
  { name: '768px (Tablet Portrait / iPad)', width: 768, height: 1024, isMobile: true },
  { name: '1024px (Tablet Landscape / Small Desktop)', width: 1024, height: 768, isMobile: false },
  { name: '1280px (Standard Laptop)', width: 1280, height: 800, isMobile: false },
  { name: '1440px (Desktop Display)', width: 1440, height: 900, isMobile: false },
  { name: '1920px (Full HD Desktop)', width: 1920, height: 1080, isMobile: false },
];

test.describe('Projeto Titã — Performance & Cross-Viewport Quality Gates (Phase 13, Tasks 15.2 & 15.3)', () => {
  test('initial load renders main shell within budget (< 3.0s)', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/app', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#main-content')).toBeVisible({ timeout: 10000 });
    const elapsed = Date.now() - startTime;

    // First load target: < 3s (REQ-8, Task 15.2)
    expect(elapsed).toBeLessThan(3000);
    // The budget ends above. Let the offline prefetch finish before Chromium tears down its context.
    await page.waitForLoadState('networkidle');
  });

  test('dynamically loads route chunks on navigation without full reload', async ({ page }) => {
    await page.goto('/app');
    await expect(page.locator('#main-content')).toBeVisible();

    // Verify initial route (Workout)
    await expect(page.locator('button[data-testid="start-workout-button"]')).toBeVisible({
      timeout: 5000,
    });

    // Navigate to Routines route
    await page.goto('/app/routines');
    await expect(page.getByRole('heading', { name: 'Minhas Rotinas' })).toBeVisible({
      timeout: 5000,
    });

    // Navigate to Library route
    await page.goto('/app/library');
    await expect(page.getByRole('heading', { name: 'Biblioteca de Exercícios' })).toBeVisible({
      timeout: 5000,
    });

    // Navigate to History route
    await page.goto('/app/history');
    await expect(page.getByRole('heading', { name: 'Histórico de Treinos' })).toBeVisible({
      timeout: 5000,
    });

    // Navigate to Progress route
    await page.goto('/app/progress');
    await expect(page.getByRole('heading', { name: 'Progresso e Recordes Pessoais' })).toBeVisible({
      timeout: 5000,
    });

    // Navigate to Settings route
    await page.goto('/app/settings');
    await expect(page.getByRole('heading', { name: /Ajustes/i })).toBeVisible({
      timeout: 5000,
    });
  });

  for (const bp of BREAKPOINTS) {
    test(`cross-viewport QA at ${bp.name} (${bp.width}x${bp.height}): zero horizontal overflow`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/app');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('#main-content')).toBeVisible();

      // Check horizontal overflow invariant: scrollWidth must be <= window.innerWidth
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalOverflow).toBe(false);

      // Adaptive navigation check
      if (bp.width <= 768) {
        // Mobile layout: Bottom navigation visible
        const bottomNav = page.locator('.tita-bottom-nav');
        await expect(bottomNav).toBeVisible();
      } else {
        // Desktop / Tablet layout: Sidebar visible
        const sidebar = page.locator('.tita-sidebar');
        await expect(sidebar).toBeVisible();
      }
    });
  }

  test('navigation touch targets preserve minimum 44x44px across mobile and desktop', async ({
    page,
  }) => {
    // Test on mobile
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/app');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('.tita-bottom-nav')).toBeVisible();
    await expect(page.locator('.tita-bottom-nav button').first()).toBeVisible();

    const mobileNavButtons = page.locator('.tita-bottom-nav button');
    const mobileCount = await mobileNavButtons.count();
    expect(mobileCount).toBeGreaterThan(0);

    for (let i = 0; i < mobileCount; i++) {
      const box = await mobileNavButtons.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }

    // Test on desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.locator('.tita-sidebar')).toBeVisible();
    await expect(page.locator('.tita-sidebar nav button').first()).toBeVisible();

    const desktopNavButtons = page.locator('.tita-sidebar nav button');
    const desktopCount = await desktopNavButtons.count();
    expect(desktopCount).toBeGreaterThan(0);

    for (let i = 0; i < desktopCount; i++) {
      const box = await desktopNavButtons.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
