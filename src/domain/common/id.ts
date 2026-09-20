import type { EntityId } from './types.js';

/**
 * Generates a stable unique identifier with an optional entity prefix.
 * Uses standard crypto.randomUUID() available across Node.js 18+, browser, and worker runtimes.
 *
 * @param prefix Optional entity prefix (e.g. 'ex', 'set', 'wo')
 * @returns Stable EntityId (e.g. 'ex_123e4567-e89b-12d3-a456-426614174000')
 */
export function generateId(prefix?: string): EntityId {
  let uuid: string;

  if (typeof globalThis.crypto?.randomUUID === 'function') {
    uuid = globalThis.crypto.randomUUID();
  } else {
    // Fallback deterministic RFC-4122 v4 generator using crypto.getRandomValues or Math.random
    const bytes = new Uint8Array(16);
    if (typeof globalThis.crypto?.getRandomValues === 'function') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
    }
    bytes[6] = (bytes[6]! & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8]! & 0x3f) | 0x80; // Variant 10xx
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Generates a stable deterministic identifier derived from a seed string.
 * Guarantees idempotency: same prefix and seed always yield the exact same EntityId.
 */
export function generateDeterministicId(prefix: string, seed: string): EntityId {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  const hex1 = (hash >>> 0).toString(16).padStart(8, '0');

  let hash2 = 0x41c64e6d;
  for (let i = seed.length - 1; i >= 0; i--) {
    hash2 ^= seed.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x000001b3);
  }
  const hex2 = (hash2 >>> 0).toString(16).padStart(8, '0');

  return `${prefix}_det_${hex1}${hex2}`;
}

/**
 * Checks whether a given string is a non-empty, valid entity ID.
 */
export function isValidId(id: unknown): id is EntityId {
  return typeof id === 'string' && id.trim().length > 0;
}
