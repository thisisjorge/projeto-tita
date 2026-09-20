/**
 * Settings configuration for progressive disclosure of advanced workout logging fields.
 * Conforms to REQ-10 and TRAINING_MODEL.md: by default, all advanced fields remain
 * disabled so lifters can log workouts with extreme speed and simplicity.
 */
export interface AdvancedTrackingSettings {
  /** Master toggle to activate advanced tracking columns and controls */
  readonly enabled: boolean;
  /** Allow selecting set type (WARMUP, TOP_SET, BACKOFF, DROP_SET, etc.) */
  readonly showSetType: boolean;
  /** Rating of Perceived Exertion (RPE 6-10) */
  readonly showRpe: boolean;
  /** Reps In Reserve (RIR 0-5) */
  readonly showRir: boolean;
  /** Execution tempo notation (e.g. 3-1-1-0) */
  readonly showTempo: boolean;
  /** Target rest duration per set */
  readonly showRest: boolean;
  /** Per-set notes / technique cues */
  readonly showNotes: boolean;
  /** Set duration in seconds (for timed or isometric sets) */
  readonly showDuration: boolean;
  /** Distance in meters (for sled or cardio intervals) */
  readonly showDistance: boolean;
}

/**
 * Default settings: completely clean, basic tracking by default.
 */
export const DEFAULT_ADVANCED_TRACKING_SETTINGS: AdvancedTrackingSettings = {
  enabled: false,
  showSetType: false,
  showRpe: false,
  showRir: false,
  showTempo: false,
  showRest: false,
  showNotes: false,
  showDuration: false,
  showDistance: false,
};

/**
 * Presets for lifters who opt into advanced tracking.
 */
export const RECOMMENDED_ADVANCED_SETTINGS: AdvancedTrackingSettings = {
  enabled: true,
  showSetType: true,
  showRpe: true,
  showRir: true,
  showTempo: false,
  showRest: true,
  showNotes: true,
  showDuration: false,
  showDistance: false,
};
