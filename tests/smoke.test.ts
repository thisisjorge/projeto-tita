import { describe, it, expect } from 'vitest';

describe('Project Titã — Unit Test Setup', () => {
  it('validates basic environment and testing pipeline', () => {
    expect(true).toBe(true);
  });

  it('calculates Epley e1RM formula accurately', () => {
    // Epley: e1RM = weight * (1 + reps / 30)
    const calcEpley1RM = (weight: number, reps: number): number => {
      if (reps <= 0 || weight <= 0) return 0;
      if (reps === 1) return weight;
      return Math.round(weight * (1 + reps / 30));
    };

    expect(calcEpley1RM(100, 1)).toBe(100);
    expect(calcEpley1RM(100, 10)).toBe(133);
    expect(calcEpley1RM(80, 5)).toBe(93);
  });
});
