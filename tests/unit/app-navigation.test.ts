import { describe, it, expect } from 'vitest';
import type { RouteObject } from 'react-router-dom';
import { routeConfig } from '../../src/router.js';

describe('App Navigation and Routing (REQ-8)', () => {
  it('defines all core application routes according to tasks.md Task 4.4', () => {
    expect(routeConfig.length).toBeGreaterThan(0);

    // Root layout route
    const rootRoute = routeConfig.find((r: RouteObject) => r.path === '/');
    expect(rootRoute).toBeDefined();
    expect(rootRoute?.children).toBeDefined();

    const childPaths = rootRoute?.children?.map((child: RouteObject) => child.path ?? '') ?? [];

    // Check all routes specified in Task 4.4:
    // Workout (index), Routines, Library, History, Progress, Settings, Legacy
    expect(childPaths).toContain(''); // Index route (Workout)
    expect(childPaths).toContain('routines');
    expect(childPaths).toContain('library');
    expect(childPaths).toContain('history');
    expect(childPaths).toContain('progress');
    expect(childPaths).toContain('settings');
    expect(childPaths).toContain('legacy');

    // Onboarding route (Task 4.5)
    const onboardingRoute = routeConfig.find((r: RouteObject) => r.path === '/onboarding');
    expect(onboardingRoute).toBeDefined();
  });
});
