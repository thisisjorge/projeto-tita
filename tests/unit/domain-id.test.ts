import { describe, it, expect } from 'vitest';
import { generateId, isValidId } from '../../src/domain/common/id.js';

describe('Domain ID Generation and Validation', () => {
  it('generates unique stable IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
    expect(isValidId(id1)).toBe(true);
    expect(isValidId(id2)).toBe(true);
  });

  it('prefixes IDs when requested', () => {
    const exId = generateId('ex');
    const setId = generateId('set');
    expect(exId.startsWith('ex_')).toBe(true);
    expect(setId.startsWith('set_')).toBe(true);
  });

  it('validates IDs correctly', () => {
    expect(isValidId('abc-123')).toBe(true);
    expect(isValidId('')).toBe(false);
    expect(isValidId('   ')).toBe(false);
    expect(isValidId(null)).toBe(false);
    expect(isValidId(undefined)).toBe(false);
    expect(isValidId(123)).toBe(false);
  });
});
