import type { Exercise } from '../domain/entities/exercise.js';
import type { ExerciseMediaProvider, ExerciseMediaAttribution } from './exercise-media-provider.js';

export const LOCAL_MUSCLE_ICONS: Record<string, string> = {
  peito: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="6" y="20" width="36" height="8" rx="2" fill="currentColor" fill-opacity="0.1" />
    <circle cx="16" cy="24" r="5" />
    <circle cx="32" cy="24" r="5" />
    <path d="M21 24h6" />
  </svg>`,
  costas: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 12c4 6 8 8 12 8s8-2 12-8" fill="currentColor" fill-opacity="0.1" />
    <path d="M24 20v18" />
    <path d="M16 26c3 2 5 2 8 2s5 0 8-2" />
    <path d="M18 32c2 1 4 2 6 2s4-1 6-2" />
  </svg>`,
  ombros: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M8 24c4-6 10-8 16-8s12 2 16 8" />
    <circle cx="12" cy="26" r="4" fill="currentColor" fill-opacity="0.2" />
    <circle cx="36" cy="26" r="4" fill="currentColor" fill-opacity="0.2" />
    <path d="M20 30h8" />
  </svg>`,
  quadríceps: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="14" y="10" width="8" height="24" rx="4" fill="currentColor" fill-opacity="0.15" />
    <rect x="26" y="10" width="8" height="24" rx="4" fill="currentColor" fill-opacity="0.15" />
    <circle cx="18" cy="38" r="3" />
    <circle cx="30" cy="38" r="3" />
  </svg>`,
  posteriores: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="14" y="12" width="8" height="22" rx="4" fill="currentColor" fill-opacity="0.15" />
    <rect x="26" y="12" width="8" height="22" rx="4" fill="currentColor" fill-opacity="0.15" />
    <path d="M18 36v4" />
    <path d="M30 36v4" />
  </svg>`,
  glúteos: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M14 20c0 8 4 14 10 14s10-6 10-14" fill="currentColor" fill-opacity="0.1" />
    <path d="M24 20v14" />
  </svg>`,
  panturrilhas: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 12c3 4 5 10 4 18l-2 6" />
    <path d="M32 12c-3 4-5 10-4 18l2 6" />
  </svg>`,
  bíceps: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 32c2-8 6-12 12-10 6 2 8 8 6 14" fill="currentColor" fill-opacity="0.15" />
    <circle cx="26" cy="24" r="5" />
  </svg>`,
  tríceps: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M32 14c-4 2-8 6-8 12 0 6 2 12 4 14" fill="currentColor" fill-opacity="0.15" />
    <path d="M22 20h6" />
  </svg>`,
  abdômen: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="16" y="12" width="7" height="6" rx="1" fill="currentColor" fill-opacity="0.2" />
    <rect x="25" y="12" width="7" height="6" rx="1" fill="currentColor" fill-opacity="0.2" />
    <rect x="16" y="21" width="7" height="6" rx="1" fill="currentColor" fill-opacity="0.2" />
    <rect x="25" y="21" width="7" height="6" rx="1" fill="currentColor" fill-opacity="0.2" />
    <rect x="16" y="30" width="7" height="6" rx="1" fill="currentColor" fill-opacity="0.2" />
    <rect x="25" y="30" width="7" height="6" rx="1" fill="currentColor" fill-opacity="0.2" />
  </svg>`,
  default: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="8" y="22" width="4" height="8" rx="1" />
    <rect x="36" y="22" width="4" height="8" rx="1" />
    <rect x="12" y="18" width="5" height="16" rx="2" fill="currentColor" fill-opacity="0.2" />
    <rect x="31" y="18" width="5" height="16" rx="2" fill="currentColor" fill-opacity="0.2" />
    <line x1="17" y1="26" x2="31" y2="26" />
  </svg>`,
};

export class LocalIconMediaProvider implements ExerciseMediaProvider {
  readonly providerId = 'local-icon-provider';

  isAvailable(): boolean {
    return true; // Always available offline
  }

  getThumbnail(exercise: Exercise): string | null {
    // Returns svg data URI as thumbnail
    const svg = this.getIconSvg(exercise);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }

  getFrames(): readonly string[] | null {
    return null; // Icons do not have multi-frame animations
  }

  getAttribution(): ExerciseMediaAttribution | null {
    return {
      author: 'Projeto Titã',
      license: 'MIT',
      sourceUrl: 'https://github.com/projeto-tita',
      notice: 'Ícones vetoriais locais offline.',
    };
  }

  getIconSvg(exercise: Exercise): string {
    const key = exercise.primaryMuscle.toLowerCase().trim();
    return LOCAL_MUSCLE_ICONS[key] ?? LOCAL_MUSCLE_ICONS.default;
  }
}
