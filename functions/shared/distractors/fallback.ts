/**
 * Fallback distractor generation using character substitution
 *
 * Used when word-based distractor generation isn't applicable:
 * - Pure numbers (e.g., "2025")
 * - Pure punctuation (e.g., "???")
 * - Mixed content (e.g., "call911")
 * - When no similar words exist in the word list
 */

import { getSubstitutes } from './substitutionMatrix.js';

/**
 * Preserve the case of the original character when substituting
 */
function preserveCase(originalChar: string, substituteChar: string): string {
  if (originalChar === originalChar.toLowerCase()) {
    return substituteChar.toLowerCase();
  }
  return substituteChar.toUpperCase();
}

/**
 * Generate a single distractor by substituting one character
 * Returns null if unable to create a valid distractor
 */
function generateSingleDistractor(
  word: string,
  excludeWords: Set<string>,
  maxAttempts: number = 50
): string | null {
  const positions = Array.from({ length: word.length }, (_, i) => i);

  // Try different positions until we find a valid distractor
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick a random position
    const posIndex = Math.floor(Math.random() * positions.length);
    const pos = positions[posIndex];

    const char = word[pos];
    const substitutes = getSubstitutes(char);

    if (substitutes.length === 0) {
      // This character has no substitutes, try another position
      positions.splice(posIndex, 1);
      if (positions.length === 0) {
        // No more positions to try
        return null;
      }
      continue;
    }

    // Pick a random substitute
    const substitute = substitutes[Math.floor(Math.random() * substitutes.length)];
    const substituteWithCase = preserveCase(char, substitute);

    // Create new word with substitution
    const distractor = word.slice(0, pos) + substituteWithCase + word.slice(pos + 1);

    // Check if this distractor is valid (not in exclude set)
    if (!excludeWords.has(distractor)) {
      return distractor;
    }

    // This distractor already exists, try again
  }

  return null;
}

/**
 * Generate fallback distractors using character substitution
 *
 * Creates exactly 2 distractors by randomly substituting one character
 * in each distractor, using Morse-similar characters from the substitution matrix.
 *
 * Returns null if unable to generate 2 unique distractors.
 */
export function generateFallbackDistractors(word: string): string[] | null {
  const excludeWords = new Set<string>([word]);
  const distractors: string[] = [];

  // Generate 2 distractors
  for (let i = 0; i < 2; i++) {
    const distractor = generateSingleDistractor(word, excludeWords);

    if (distractor === null) {
      // Unable to generate a valid distractor
      return null;
    }

    distractors.push(distractor);
    excludeWords.add(distractor);
  }

  return distractors;
}
