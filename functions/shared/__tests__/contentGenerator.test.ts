import { describe, it, expect } from 'vitest';
import {
  UNMASTERED_WEIGHT,
  MASTERED_WEIGHT,
  generateWeightedPool,
  generateRandomSequence,
  generateWeightedSequence
} from '../contentGenerator';

describe('contentGenerator', () => {
  describe('Constants', () => {
    it('should have UNMASTERED_WEIGHT = 2', () => {
      expect(UNMASTERED_WEIGHT).toBe(2);
    });

    it('should have MASTERED_WEIGHT = 1', () => {
      expect(MASTERED_WEIGHT).toBe(1);
    });
  });

  describe('generateWeightedPool', () => {
    it('should create pool with mastered chars appearing once', () => {
      const mastered = new Set(['K', 'M']);
      const unMastered = new Set<string>();

      const pool = generateWeightedPool(mastered, unMastered);

      expect(pool).toHaveLength(2);
      expect(pool.filter(c => c === 'K')).toHaveLength(1);
      expect(pool.filter(c => c === 'M')).toHaveLength(1);
    });

    it('should create pool with un-mastered chars appearing twice', () => {
      const mastered = new Set<string>();
      const unMastered = new Set(['R', 'S']);

      const pool = generateWeightedPool(mastered, unMastered);

      expect(pool).toHaveLength(4);
      expect(pool.filter(c => c === 'R')).toHaveLength(2);
      expect(pool.filter(c => c === 'S')).toHaveLength(2);
    });

    it('should create pool with mixed mastery', () => {
      const mastered = new Set(['K', 'M']);
      const unMastered = new Set(['R', 'S']);

      const pool = generateWeightedPool(mastered, unMastered);

      expect(pool).toHaveLength(6); // 2 * 1 + 2 * 2 = 6
      expect(pool.filter(c => c === 'K')).toHaveLength(1);
      expect(pool.filter(c => c === 'M')).toHaveLength(1);
      expect(pool.filter(c => c === 'R')).toHaveLength(2);
      expect(pool.filter(c => c === 'S')).toHaveLength(2);
    });

    it('should handle empty sets', () => {
      const mastered = new Set<string>();
      const unMastered = new Set<string>();

      const pool = generateWeightedPool(mastered, unMastered);

      expect(pool).toHaveLength(0);
    });

    it('should handle only mastered characters', () => {
      const mastered = new Set(['K', 'M', 'R', 'S']);
      const unMastered = new Set<string>();

      const pool = generateWeightedPool(mastered, unMastered);

      expect(pool).toHaveLength(4);
    });

    it('should handle only un-mastered characters', () => {
      const mastered = new Set<string>();
      const unMastered = new Set(['K', 'M', 'R', 'S']);

      const pool = generateWeightedPool(mastered, unMastered);

      expect(pool).toHaveLength(8); // 4 * 2
    });

    it('should create correct weighting for Level 5 example', () => {
      // Level 5: K M R S U A P T
      // Mastered: K, M, S, U (weight 1 each)
      // Un-mastered: R, A, P, T (weight 2 each)
      const mastered = new Set(['K', 'M', 'S', 'U']);
      const unMastered = new Set(['R', 'A', 'P', 'T']);

      const pool = generateWeightedPool(mastered, unMastered);

      expect(pool).toHaveLength(12); // 4 * 1 + 4 * 2 = 12
      expect(pool.filter(c => c === 'K')).toHaveLength(1);
      expect(pool.filter(c => c === 'R')).toHaveLength(2);
      expect(pool.filter(c => c === 'A')).toHaveLength(2);
      expect(pool.filter(c => c === 'T')).toHaveLength(2);
    });
  });

  describe('generateRandomSequence', () => {
    it('should generate correct number of characters', () => {
      const pool = ['K', 'M', 'R', 'S'];

      const sequence = generateRandomSequence(pool, 50, 12345);

      expect(sequence).toHaveLength(50);
    });

    it('should only select from pool characters', () => {
      const pool = ['K', 'M'];

      const sequence = generateRandomSequence(pool, 100, 12345);

      for (const char of sequence) {
        expect(pool).toContain(char);
      }
    });

    it('should be reproducible with same seed', () => {
      const pool = ['K', 'M', 'R', 'S'];

      const sequence1 = generateRandomSequence(pool, 50, 12345);
      const sequence2 = generateRandomSequence(pool, 50, 12345);

      expect(sequence1).toEqual(sequence2);
    });

    it('should be different with different seeds', () => {
      const pool = ['K', 'M', 'R', 'S'];

      const sequence1 = generateRandomSequence(pool, 50, 12345);
      const sequence2 = generateRandomSequence(pool, 50, 54321);

      expect(sequence1).not.toEqual(sequence2);
    });

    it('should use Math.random when no seed provided', () => {
      const pool = ['K', 'M', 'R', 'S'];

      // Should not throw
      const sequence = generateRandomSequence(pool, 50);

      expect(sequence).toHaveLength(50);
      for (const char of sequence) {
        expect(pool).toContain(char);
      }
    });

    it('should handle count = 0', () => {
      const pool = ['K', 'M'];

      const sequence = generateRandomSequence(pool, 0, 12345);

      expect(sequence).toHaveLength(0);
    });

    it('should throw error for empty pool', () => {
      const pool: string[] = [];

      expect(() => generateRandomSequence(pool, 10, 12345)).toThrow(
        'Cannot generate sequence from empty pool'
      );
    });

    it('should throw error for negative count', () => {
      const pool = ['K', 'M'];

      expect(() => generateRandomSequence(pool, -1, 12345)).toThrow(
        'Count must be non-negative'
      );
    });

    it('should allow consecutive duplicates', () => {
      const pool = ['K']; // Only one character

      const sequence = generateRandomSequence(pool, 10, 12345);

      expect(sequence).toHaveLength(10);
      expect(sequence.every(c => c === 'K')).toBe(true);
    });

    it('should have reasonable distribution over many iterations', () => {
      const pool = ['K', 'M']; // Equal weight

      const sequence = generateRandomSequence(pool, 1000, 12345);

      const kCount = sequence.filter(c => c === 'K').length;
      const mCount = sequence.filter(c => c === 'M').length;

      // Should be roughly 50/50 (allow 40-60% range for randomness)
      expect(kCount).toBeGreaterThan(400);
      expect(kCount).toBeLessThan(600);
      expect(mCount).toBeGreaterThan(400);
      expect(mCount).toBeLessThan(600);
    });

    it('should reflect weighted pool distribution', () => {
      // Pool with 2x R and 1x K (R should appear roughly twice as often)
      const pool = ['K', 'R', 'R'];

      const sequence = generateRandomSequence(pool, 900, 12345);

      const kCount = sequence.filter(c => c === 'K').length;
      const rCount = sequence.filter(c => c === 'R').length;

      // R should be roughly 2x K (allow some variance)
      // Expected: K=300, R=600
      expect(kCount).toBeGreaterThan(200); // 20-40%
      expect(kCount).toBeLessThan(400);
      expect(rCount).toBeGreaterThan(500); // 60-80%
      expect(rCount).toBeLessThan(700);
    });
  });

  describe('generateWeightedSequence', () => {
    it('should generate correct number of characters', () => {
      const mastered = new Set(['K', 'M']);
      const unMastered = new Set(['R', 'S']);

      const sequence = generateWeightedSequence(mastered, unMastered, 50, 12345);

      expect(sequence).toHaveLength(50);
    });

    it('should only select from provided character sets', () => {
      const mastered = new Set(['K', 'M']);
      const unMastered = new Set(['R', 'S']);

      const sequence = generateWeightedSequence(mastered, unMastered, 100, 12345);

      const allChars = new Set([...mastered, ...unMastered]);
      for (const char of sequence) {
        expect(allChars.has(char)).toBe(true);
      }
    });

    it('should favor un-mastered characters in distribution', () => {
      const mastered = new Set(['K']);
      const unMastered = new Set(['R']);

      const sequence = generateWeightedSequence(mastered, unMastered, 900, 12345);

      const kCount = sequence.filter(c => c === 'K').length;
      const rCount = sequence.filter(c => c === 'R').length;

      // R (un-mastered, weight=2) should appear roughly 2x K (mastered, weight=1)
      // Expected: K≈300, R≈600
      expect(kCount).toBeGreaterThan(200);
      expect(kCount).toBeLessThan(400);
      expect(rCount).toBeGreaterThan(500);
      expect(rCount).toBeLessThan(700);
    });

    it('should throw error for empty character sets', () => {
      const mastered = new Set<string>();
      const unMastered = new Set<string>();

      expect(() => generateWeightedSequence(mastered, unMastered, 50, 12345)).toThrow(
        'Cannot generate sequence: no characters available'
      );
    });

    it('should throw error for negative count', () => {
      const mastered = new Set(['K']);
      const unMastered = new Set(['R']);

      expect(() => generateWeightedSequence(mastered, unMastered, -1, 12345)).toThrow(
        'Count must be non-negative'
      );
    });

    it('should be reproducible with same seed', () => {
      const mastered = new Set(['K', 'M']);
      const unMastered = new Set(['R', 'S']);

      const sequence1 = generateWeightedSequence(mastered, unMastered, 50, 12345);
      const sequence2 = generateWeightedSequence(mastered, unMastered, 50, 12345);

      expect(sequence1).toEqual(sequence2);
    });

    it('should handle only mastered characters', () => {
      const mastered = new Set(['K', 'M', 'R', 'S']);
      const unMastered = new Set<string>();

      const sequence = generateWeightedSequence(mastered, unMastered, 50, 12345);

      expect(sequence).toHaveLength(50);
      for (const char of sequence) {
        expect(mastered.has(char)).toBe(true);
      }
    });

    it('should handle only un-mastered characters', () => {
      const mastered = new Set<string>();
      const unMastered = new Set(['K', 'M', 'R', 'S']);

      const sequence = generateWeightedSequence(mastered, unMastered, 50, 12345);

      expect(sequence).toHaveLength(50);
      for (const char of sequence) {
        expect(unMastered.has(char)).toBe(true);
      }
    });

    it('should handle Level 5 scenario', () => {
      // Level 5: 4 mastered, 4 un-mastered
      const mastered = new Set(['K', 'M', 'S', 'U']);
      const unMastered = new Set(['R', 'A', 'P', 'T']);

      const sequence = generateWeightedSequence(mastered, unMastered, 50, 12345);

      expect(sequence).toHaveLength(50);

      // Count occurrences
      const counts = new Map<string, number>();
      for (const char of sequence) {
        counts.set(char, (counts.get(char) || 0) + 1);
      }

      // All characters should appear at least once (with high probability)
      // Un-mastered should appear more often than mastered overall
      const masteredTotal = Array.from(mastered).reduce((sum, c) => sum + (counts.get(c) || 0), 0);
      const unMasteredTotal = Array.from(unMastered).reduce((sum, c) => sum + (counts.get(c) || 0), 0);

      // With 4 mastered (weight 1) and 4 un-mastered (weight 2), the pool is 12 chars
      // Un-mastered chars make up 8/12 = 67% of pool
      // Expected: mastered≈16, un-mastered≈34
      expect(masteredTotal).toBeGreaterThan(10);
      expect(masteredTotal).toBeLessThan(25);
      expect(unMasteredTotal).toBeGreaterThan(25);
      expect(unMasteredTotal).toBeLessThan(40);
    });
  });
});
