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
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      'content',
      getComputedStyle(document.documentElement).getPropertyValue('--tita-bg').trim(),
    );
  try {
    localStorage.setItem('tita-theme', theme);
  } catch {
    // The selected theme still works when browser storage is unavailable.
  }
}
