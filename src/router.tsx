import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppShell } from './ui/layout/AppShell.js';
import { LoadingFallback } from './ui/components/LoadingFallback.js';

// Route-level code splitting via dynamic imports (Task 15.2)
const WorkoutView = lazy(() =>
  import('./features/workout/WorkoutView.js').then((m) => ({ default: m.WorkoutView })),
);
const RoutinesView = lazy(() =>
  import('./features/routines/RoutinesView.js').then((m) => ({ default: m.RoutinesView })),
);
const LibraryView = lazy(() =>
  import('./features/library/LibraryView.js').then((m) => ({ default: m.LibraryView })),
);
const HistoryView = lazy(() =>
  import('./features/history/HistoryView.js').then((m) => ({ default: m.HistoryView })),
);
const ProgressView = lazy(() =>
  import('./features/progress/ProgressView.js').then((m) => ({ default: m.ProgressView })),
);
const SettingsView = lazy(() =>
  import('./features/settings/SettingsView.js').then((m) => ({ default: m.SettingsView })),
);
const LegacyView = lazy(() =>
  import('./features/legacy/LegacyView.js').then((m) => ({ default: m.LegacyView })),
);
const OnboardingView = lazy(() =>
  import('./features/onboarding/OnboardingView.js').then((m) => ({ default: m.OnboardingView })),
);

const withSuspense = (Component: React.ComponentType, message?: string): React.ReactElement => (
  <Suspense fallback={<LoadingFallback message={message} />}>
    <Component />
  </Suspense>
);

/**
 * Pre-fetches secondary route modules in the background to ensure they are
 * cached by the Service Worker for offline readiness (REQ-8).
 */
export const prefetchRoutes = (): void => {
  if (typeof window === 'undefined') return;
  import('./features/routines/RoutinesView.js').catch(() => {});
  import('./features/library/LibraryView.js').catch(() => {});
  import('./features/history/HistoryView.js').catch(() => {});
  import('./features/progress/ProgressView.js').catch(() => {});
  import('./features/settings/SettingsView.js').catch(() => {});
};

export const routeConfig: RouteObject[] = [
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: withSuspense(WorkoutView, 'Carregando treino...'),
      },
      {
        path: 'routines',
        element: withSuspense(RoutinesView, 'Carregando rotinas...'),
      },
      {
        path: 'library',
        element: withSuspense(LibraryView, 'Carregando exercícios...'),
      },
      {
        path: 'history',
        element: withSuspense(HistoryView, 'Carregando histórico...'),
      },
      {
        path: 'progress',
        element: withSuspense(ProgressView, 'Carregando progresso...'),
      },
      {
        path: 'settings',
        element: withSuspense(SettingsView, 'Carregando ajustes...'),
      },
      {
        path: 'legacy',
        element: withSuspense(LegacyView, 'Carregando versão anterior...'),
      },
    ],
  },
  {
    path: '/onboarding',
    element: withSuspense(OnboardingView, 'Carregando inicialização...'),
  },
];

const getBasename = (): string => {
  if (typeof window === 'undefined') return '/';
  if (window.location.pathname.startsWith('/v2')) return '/v2';
  if (window.location.pathname.startsWith('/app')) return '/app';
  return '/';
};

export const router =
  typeof window !== 'undefined'
    ? createBrowserRouter(routeConfig, { basename: getBasename() })
    : (null as unknown as ReturnType<typeof createBrowserRouter>);
