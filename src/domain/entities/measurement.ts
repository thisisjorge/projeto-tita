import type { BaseEntity, ISODateTimeString } from '../common/types.js';

/**
 * Standard measurement metric types supported for tracking body composition and progress.
 */
export type MeasurementMetricType =
  | 'WEIGHT'
  | 'BODY_FAT'
  | 'WAIST'
  | 'CHEST'
  | 'ARM_LEFT'
  | 'ARM_RIGHT'
  | 'THIGH_LEFT'
  | 'THIGH_RIGHT'
  | 'CALF'
  | 'HIP'
  | 'SKINFOLD_CHEST'
  | 'SKINFOLD_ABDOMEN'
  | 'SKINFOLD_THIGH'
  | 'SKINFOLD_TRICEPS'
  | 'CUSTOM';

/**
 * Measurement entity capturing body composition, circumferences, and progress metrics.
 *
 * CRITICAL RULE: Zero is a valid measurement value (e.g. delta changes, baseline offsets).
 * Never treat 0 as missing or falsy.
 */
export interface Measurement extends BaseEntity {
  /** Metric identifier (e.g. 'WEIGHT', 'WAIST', or custom name) */
  readonly metric: MeasurementMetricType | string;
  /**
   * Numeric measurement value.
   * NOTE: 0 is a strictly valid number.
   */
  readonly value: number;
  /** Measurement unit (e.g. 'kg', 'cm', '%', 'mm') */
  readonly unit: string;
  /** ISO-8601 UTC date or datetime when the measurement was taken */
  readonly capturedAt: ISODateTimeString;
  /** Context notes (e.g. 'Em jejum logo após acordar') */
  readonly notes?: string;
}
