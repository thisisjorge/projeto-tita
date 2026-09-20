import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Design Tokens (REQ-8, REQ-19)', () => {
  const tokensDir = path.resolve(process.cwd(), 'src/ui/tokens');

  it('provides all core token stylesheet files', () => {
    const expectedFiles = [
      'colors.css',
      'typography.css',
      'spacing.css',
      'animations.css',
      'index.css',
    ];
    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(tokensDir, file))).toBe(true);
    }
  });

  it('defines dark and light mode color schemes and semantic surface tokens', () => {
    const colorsCss = fs.readFileSync(path.join(tokensDir, 'colors.css'), 'utf-8');

    // Default dark theme variables (Athletic OLED Stealth & Emerald - Palette B)
    expect(colorsCss).toContain('--tita-bg: #060709');
    expect(colorsCss).toContain('--tita-surface: #0f1217');
    expect(colorsCss).toContain('--tita-text: #f8fafc');
    expect(colorsCss).toContain('--tita-primary: #10b981');
    expect(colorsCss).toContain('--tita-border: #212833');
    expect(colorsCss).toContain('--tita-success: #10b981');
    expect(colorsCss).toContain('--tita-error: #ef4444');

    // Light theme override
    expect(colorsCss).toContain("[data-theme='light']");
    expect(colorsCss).toContain('--tita-bg: #f8fafc');
    expect(colorsCss).toContain('--tita-surface: #ffffff');
  });

  it('defines typography scale and accessible font stacks', () => {
    const typographyCss = fs.readFileSync(path.join(tokensDir, 'typography.css'), 'utf-8');

    expect(typographyCss).toContain('--tita-font-sans');
    expect(typographyCss).toContain('--tita-font-mono');
    expect(typographyCss).toContain('--tita-text-xs');
    expect(typographyCss).toContain('--tita-text-sm');
    expect(typographyCss).toContain('--tita-text-base');
    expect(typographyCss).toContain('--tita-text-lg');
    expect(typographyCss).toContain('--tita-text-xl');
    expect(typographyCss).toContain('--tita-text-2xl');
    expect(typographyCss).toContain('--tita-weight-regular');
    expect(typographyCss).toContain('--tita-weight-semibold');
    expect(typographyCss).toContain('--tita-weight-bold');
  });

  it('enforces min 44x44px touch targets and layout spacing (REQ-8)', () => {
    const spacingCss = fs.readFileSync(path.join(tokensDir, 'spacing.css'), 'utf-8');

    expect(spacingCss).toContain('--tita-touch-min: 44px');
    expect(spacingCss).toContain('--tita-space-1');
    expect(spacingCss).toContain('--tita-space-4');
    expect(spacingCss).toContain('--tita-space-8');
    expect(spacingCss).toContain('--tita-radius-sm');
    expect(spacingCss).toContain('--tita-radius-md');
    expect(spacingCss).toContain('--tita-radius-full');
  });

  it('suppresses non-essential animations when prefers-reduced-motion is active (REQ-8, REQ-19)', () => {
    const animationsCss = fs.readFileSync(path.join(tokensDir, 'animations.css'), 'utf-8');

    expect(animationsCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(animationsCss).toContain('animation-duration: 0.001s !important');
    expect(animationsCss).toContain('transition-duration: 0.001s !important');
  });
});
