/**
 * Morse Pattern Utilities
 *
 * Converts words to Morse code patterns and provides caching for performance.
 */

import { MORSE_ALPHABET } from '../../../src/core/morse/alphabet.js';
import TOP_10K_WORDS from './top10k-words.json';

/**
 * Convert a word to its Morse code pattern representation.
 * Each character becomes a sequence of dots/dashes, separated by slashes.
 * Example: "cat" -> "-.-./.--/-"
 */
export function wordToMorsePattern(word: string): string {
  return word
    .toUpperCase()
    .split('')
    .map(char => {
      const pattern = MORSE_ALPHABET[char];
      return pattern ? pattern.join('') : '';
    })
    .filter(p => p.length > 0)
    .join('/');
}

/**
 * Pre-computed cache of word -> morse pattern for all 10k words.
 * Built at module load time for fast lookups during distractor generation.
 */
export const MORSE_PATTERN_CACHE = new Map<string, string>(
  TOP_10K_WORDS.map(word => [word, wordToMorsePattern(word)])
);

/**
 * Get the first N morse symbols from a pattern.
 * Example: getFirstMorseSymbols("-.-./.-", 2) -> "-."
 */
export function getFirstMorseSymbols(pattern: string, count: number): string {
  const symbols = pattern.replace(/\//g, '');
  return symbols.slice(0, count);
}

/**
 * Get the last N morse symbols from a pattern.
 * Example: getLastMorseSymbols("-.-./.-", 2) -> ".-"
 */
export function getLastMorseSymbols(pattern: string, count: number): string {
  const symbols = pattern.replace(/\//g, '');
  return symbols.slice(-count);
}
