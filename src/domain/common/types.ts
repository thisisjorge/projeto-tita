/**
 * Base types and interfaces for Projeto Titã Domain Model.
 * Pure TypeScript, zero external/DOM/React/platform dependencies.
 */

/** ISO-8601 UTC Date-Time string */
export type ISODateTimeString = string;

/** Stable unique identifier */
export type EntityId = string;

/**
 * Base interface for all mutable domain entities.
 * Includes audit timestamps and soft deletion support.
 */
export interface BaseEntity {
  /** Stable unique identifier */
  readonly id: EntityId;
  /** Schema version for forward/backward compatibility */
  readonly schemaVersion: number;
  /** UTC creation timestamp (ISO-8601) */
  readonly createdAt: ISODateTimeString;
  /** UTC last update timestamp (ISO-8601) */
  readonly updatedAt: ISODateTimeString;
  /** Optional UTC deletion timestamp for soft-deletes */
  readonly deletedAt?: ISODateTimeString | null;
}

/** Result of a domain validation check */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}
