/**
 * Type definitions representing the legacy monolithic state stored in localStorage.
 * Keys: 'tita_app_v1' or 'jorge_titan_app_v1'.
 */

export interface LegacySet {
  readonly load?: string | number;
  readonly reps?: string | number;
  readonly rir?: string | number;
  readonly pain?: number;
  readonly done?: boolean;
  readonly note?: string;
}

export interface LegacyExerciseLog {
  readonly completed?: boolean;
  readonly note?: string;
  readonly sets?: readonly LegacySet[];
}

export interface LegacyWorkoutLog {
  readonly date: string;
  readonly sessionId: string;
  readonly completed?: boolean;
  readonly exercises?: Record<string, LegacyExerciseLog>;
}

export interface LegacyDailyEntry {
  readonly weight?: string | number;
  readonly calories?: string | number;
  readonly protein?: string | number;
  readonly carbs?: string | number;
  readonly fat?: string | number;
  readonly water?: string | number;
  readonly steps?: string | number;
  readonly sleep?: string | number;
  readonly meals?: Record<string, number | boolean>;
  readonly recovery?: { readonly score?: number; readonly jointPain?: number } | null;
  readonly notes?: string;
  readonly foodNotes?: string;
}

export interface LegacyMeasurement {
  readonly date: string;
  readonly weight?: number | string;
  readonly waist?: number | string;
  readonly chest?: number | string;
  readonly arm?: number | string;
  readonly [key: string]: unknown;
}

export interface LegacyHistoryEntry {
  readonly date: string;
  readonly type: string;
  readonly text: string;
}

export interface LegacyState {
  readonly version?: string;
  readonly createdAt?: string;
  readonly daily?: Record<string, LegacyDailyEntry>;
  readonly workoutLogs?: Record<string, LegacyWorkoutLog>;
  readonly measurements?: readonly LegacyMeasurement[];
  readonly photos?: readonly unknown[];
  readonly history?: readonly LegacyHistoryEntry[];
  readonly shopping?: Record<string, boolean>;
  readonly ui?: Record<string, unknown>;
  readonly [key: string]: unknown;
}
