import type { ISODateTimeString } from '../domain/common/types.js';
import type { DatabaseStoreName } from '../repositories/interfaces/database.interface.js';

export const BACKUP_FORMAT_IDENTIFIER = 'tita-backup-v1';
export const CURRENT_BACKUP_SCHEMA_VERSION = 1;

export const DEFAULT_BACKUP_STORES: readonly DatabaseStoreName[] = [
  'exercises',
  'routines',
  'workoutSnapshots',
  'measurements',
  'programs',
  'metadata',
  'legacyCompat',
] as const;

export interface BackupManifest {
  readonly format: typeof BACKUP_FORMAT_IDENTIFIER;
  readonly schemaVersion: number;
  readonly exportedAt: ISODateTimeString;
  readonly categories: readonly string[];
  readonly counts: Record<string, number>;
  readonly checksum: string;
}

export interface BackupV1 {
  readonly manifest: BackupManifest;
  readonly records: Record<string, readonly unknown[]>;
}

/**
 * Recursively sorts all object keys lexicographically and preserves arrays.
 */
export function sortKeysRecursively(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortKeysRecursively);
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    sortedObj[key] = sortKeysRecursively(obj[key]);
  }

  return sortedObj;
}

/**
 * Deterministically serializes any JavaScript structure to UTF-8 JSON with LF line endings.
 */
export function serializeDeterministicJson(value: unknown): string {
  const sorted = sortKeysRecursively(value);
  return JSON.stringify(sorted, null, 2).replace(/\r\n/g, '\n') + '\n';
}

/**
 * Computes the hexadecimal SHA-256 checksum across string content.
 * Works seamlessly across both Browser Web Crypto and Node.js.
 */
export async function calculateSha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  if (typeof globalThis.crypto?.subtle?.digest === 'function') {
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  try {
    const nodeCrypto = await import('node:crypto');
    return nodeCrypto.createHash('sha256').update(data).digest('hex');
  } catch {
    throw new Error('No cryptographic SHA-256 implementation available.');
  }
}
