import type { TitaDatabase } from '../repositories/interfaces/database.interface.js';
import { IdbMetadataRepository } from '../repositories/indexeddb/idb-metadata-repository.js';
import {
  type AdvancedTrackingSettings,
  DEFAULT_ADVANCED_TRACKING_SETTINGS,
} from '../domain/settings/advanced-tracking-settings.js';

export const ADVANCED_TRACKING_SETTINGS_KEY = 'settings:advanced_tracking';

export class SettingsService {
  private metaRepo?: IdbMetadataRepository;

  constructor(db?: TitaDatabase) {
    if (db) {
      this.metaRepo = new IdbMetadataRepository(db);
    }
  }

  /**
   * Retrieves current advanced tracking settings from IndexedDB,
   * falling back to localStorage or domain defaults.
   */
  async getAdvancedTrackingSettings(): Promise<AdvancedTrackingSettings> {
    try {
      if (this.metaRepo) {
        const stored = await this.metaRepo.get<AdvancedTrackingSettings>(
          ADVANCED_TRACKING_SETTINGS_KEY,
        );
        if (stored) {
          return { ...DEFAULT_ADVANCED_TRACKING_SETTINGS, ...stored };
        }
      }
    } catch {
      // IndexedDB query failed, fallback to localStorage
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const item = window.localStorage.getItem(ADVANCED_TRACKING_SETTINGS_KEY);
        if (item) {
          const parsed = JSON.parse(item) as AdvancedTrackingSettings;
          return { ...DEFAULT_ADVANCED_TRACKING_SETTINGS, ...parsed };
        }
      }
    } catch {
      // LocalStorage unavailable
    }

    return DEFAULT_ADVANCED_TRACKING_SETTINGS;
  }

  /**
   * Saves updated advanced tracking settings to IndexedDB and mirrors in localStorage.
   */
  async saveAdvancedTrackingSettings(settings: AdvancedTrackingSettings): Promise<void> {
    const sanitized: AdvancedTrackingSettings = {
      enabled: Boolean(settings.enabled),
      showSetType: Boolean(settings.showSetType),
      showRpe: Boolean(settings.showRpe),
      showRir: Boolean(settings.showRir),
      showTempo: Boolean(settings.showTempo),
      showRest: Boolean(settings.showRest),
      showNotes: Boolean(settings.showNotes),
      showDuration: Boolean(settings.showDuration),
      showDistance: Boolean(settings.showDistance),
    };

    try {
      if (this.metaRepo) {
        await this.metaRepo.set(ADVANCED_TRACKING_SETTINGS_KEY, sanitized);
      }
    } catch {
      // Fallback
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(ADVANCED_TRACKING_SETTINGS_KEY, JSON.stringify(sanitized));
      }
    } catch {
      // LocalStorage error
    }
  }
}
