export type PlatformType = 'web' | 'android' | 'ios';

export interface ScheduleNotificationOptions {
  id?: number;
  title: string;
  body: string;
  scheduleAt?: Date;
  sound?: boolean;
}

export type HapticsImpactStyle = 'light' | 'medium' | 'heavy';

export interface ShareFileOptions {
  fileName: string;
  text?: string;
  blob?: Blob;
  dataUrl?: string;
  mimeType?: string;
}

export interface AppState {
  isActive: boolean;
}

export type AppStateChangeListener = (state: AppState) => void;
