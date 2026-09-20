import { describe, it, expect } from 'vitest';
import {
  ProgramDiscoveryEngine,
  type DiscoveryPreferences,
} from '../../src/domain/discovery/program-discovery-engine.js';

describe('ProgramDiscoveryEngine (REQ-11, Task 7.3)', () => {
  const engine = new ProgramDiscoveryEngine();

  it('ranks Full Body 3x highest for a beginner with 3 days available and 60min sessions', () => {
    const prefs: DiscoveryPreferences = {
      daysPerWeek: 3,
      sessionDurationMinutes: 60,
      experienceLevel: 'beginner',
      goal: 'general_fitness',
      equipment: 'full_gym',
      preferredSplit: 'full_body',
    };

    const report = engine.discover(prefs);

    expect(report.topRecommendation).not.toBeNull();
    expect(report.topRecommendation!.template.id).toBe('template-full-body-3x');
    expect(report.topRecommendation!.compatibilityScore).toBeGreaterThanOrEqual(90);
    expect(report.topRecommendation!.matchReasoning.length).toBeGreaterThan(0);
    expect(report.topRecommendation!.pros.length).toBeGreaterThan(0);
    expect(report.topRecommendation!.tradeoffs.length).toBeGreaterThan(0);
  });

  it('ranks Upper/Lower 4x highest for an intermediate lifter with 4 days available and hypertrophy focus', () => {
    const prefs: DiscoveryPreferences = {
      daysPerWeek: 4,
      sessionDurationMinutes: 60,
      experienceLevel: 'intermediate',
      goal: 'hypertrophy',
      equipment: 'full_gym',
      preferredSplit: 'upper_lower',
    };

    const report = engine.discover(prefs);

    expect(report.topRecommendation).not.toBeNull();
    expect(report.topRecommendation!.template.id).toBe('template-upper-lower-4x');
    expect(report.topRecommendation!.compatibilityScore).toBeGreaterThanOrEqual(90);
  });

  it('ranks Push/Pull/Legs 6x highest for an advanced lifter with 6 days available and hypertrophy focus', () => {
    const prefs: DiscoveryPreferences = {
      daysPerWeek: 6,
      sessionDurationMinutes: 65,
      experienceLevel: 'advanced',
      goal: 'hypertrophy',
      equipment: 'full_gym',
      preferredSplit: 'ppl',
    };

    const report = engine.discover(prefs);

    expect(report.topRecommendation).not.toBeNull();
    expect(report.topRecommendation!.template.id).toBe('template-ppl-6x');
    expect(report.topRecommendation!.compatibilityScore).toBeGreaterThanOrEqual(90);
  });

  it('is completely deterministic: identical preferences produce identical score breakdowns', () => {
    const prefs: DiscoveryPreferences = {
      daysPerWeek: 4,
      sessionDurationMinutes: 45,
      experienceLevel: 'intermediate',
      goal: 'strength',
      equipment: 'full_gym',
    };

    const run1 = engine.discover(prefs);
    const run2 = engine.discover(prefs);

    expect(run1.recommendations.map((r) => r.compatibilityScore)).toEqual(
      run2.recommendations.map((r) => r.compatibilityScore),
    );
    expect(run1.recommendations.map((r) => r.template.id)).toEqual(
      run2.recommendations.map((r) => r.template.id),
    );
  });
});
