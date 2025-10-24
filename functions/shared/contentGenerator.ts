/**
 * Content Generator
 *
 * Generates weighted character sequences for Learn Mode practice.
 * Un-mastered characters appear twice as often as mastered characters.
 */

/**
 * Weighting configuration
 */
export const UNMASTERED_WEIGHT = 2;
export const MASTERED_WEIGHT = 1;

/**
 * Simple seeded random number generator (LCG)
 * Used for reproducible testing
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    // Linear Congruential Generator
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

/**
 * Generate a weighted character pool
 *
 * Un-mastered characters appear UNMASTERED_WEIGHT times
 * Mastered characters appear MASTERED_WEIGHT times
 *
 * @param masteredChars Set of mastered characters
 * @param unMasteredChars Set of un-mastered characters
 * @returns Array of characters with duplicates for weighting
 *
 * @example
 * generateWeightedPool(new Set(['K', 'M']), new Set(['R', 'S']))
 * // Returns: ['K', 'M', 'R', 'R', 'S', 'S'] (un-mastered chars appear twice)
 */
export function generateWeightedPool(
  masteredChars: Set<string>,
  unMasteredChars: Set<string>
): string[] {
  const pool: string[] = [];

  // Add mastered chars (weight = 1)
  for (const char of masteredChars) {
    for (let i = 0; i < MASTERED_WEIGHT; i++) {
      pool.push(char);
    }
  }

  // Add un-mastered chars (weight = 2)
  for (const char of unMasteredChars) {
    for (let i = 0; i < UNMASTERED_WEIGHT; i++) {
      pool.push(char);
    }
  }

  return pool;
}

/**
 * Generate random character sequence from weighted pool
 *
 * @param pool Weighted character pool (from generateWeightedPool)
 * @param count Number of characters to generate
 * @param seed Optional seed for reproducible randomness (for testing)
 * @returns Array of randomly selected characters
 *
 * @throws Error if pool is empty
 * @throws Error if count is negative
 */
export function generateRandomSequence(
  pool: string[],
  count: number,
  seed?: number
): string[] {
  if (pool.length === 0) {
    throw new Error('Cannot generate sequence from empty pool');
  }

  if (count < 0) {
    throw new Error('Count must be non-negative');
  }

  if (count === 0) {
    return [];
  }

  const random = seed !== undefined ? new SeededRandom(seed) : null;
  const sequence: string[] = [];

  for (let i = 0; i < count; i++) {
    const randomValue = random ? random.next() : Math.random();
    const index = Math.floor(randomValue * pool.length);
    sequence.push(pool[index]);
  }

  return sequence;
}

/**
 * Generate weighted character sequence from mastery sets
 * Convenience function combining weighted pool generation and random selection
 *
 * @param masteredChars Set of mastered characters
 * @param unMasteredChars Set of un-mastered characters
 * @param count Number of characters to generate
 * @param seed Optional seed for reproducible randomness (for testing)
 * @returns Array of randomly selected characters with appropriate weighting
 *
 * @throws Error if both sets are empty
 * @throws Error if count is negative
 */
export function generateWeightedSequence(
  masteredChars: Set<string>,
  unMasteredChars: Set<string>,
  count: number,
  seed?: number
): string[] {
  const pool = generateWeightedPool(masteredChars, unMasteredChars);

  if (pool.length === 0) {
    throw new Error('Cannot generate sequence: no characters available');
  }

  return generateRandomSequence(pool, count, seed);
}
