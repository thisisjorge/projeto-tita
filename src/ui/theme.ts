export type Theme = 'dark' | 'light';

export function readTheme(): Theme {
  try {
    return localStorage.getItem('tita-theme') === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem('tita-theme', theme);
  } catch {
    // The selected theme still works when browser storage is unavailable.
  }
}
