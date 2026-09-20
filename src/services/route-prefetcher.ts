/**
 * Route prefetcher: downloads secondary route chunks asynchronously during idle time
 * to populate the browser cache and Service Worker shell cache for offline readiness (REQ-8).
 */
export const prefetchRouteChunks = async (): Promise<void> => {
  if (typeof window === 'undefined') return;

  await Promise.allSettled([
    import('../features/routines/RoutinesView.js'),
    import('../features/library/LibraryView.js'),
    import('../features/history/HistoryView.js'),
    import('../features/progress/ProgressView.js'),
    import('../features/settings/SettingsView.js'),
  ]);
};
