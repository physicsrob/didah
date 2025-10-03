/**
 * Distractor Algorithm for Word Practice Mode
 *
 * Groups words by simplified Morse similarity patterns to generate confusable distractors.
 */

import { shuffleArray } from '../../shared/utils';

/**
 * Simplified letter mapping based on Morse code confusion patterns
 */
const SIMPLIFIED_MAPPING: Record<string, string> = {
  // Short sounds
  'i': 'i', 's': 'i', 'h': 'i',
  // Short with tail
  'n': 'n', 'd': 'n', 'b': 'n',
  // Medium sounds
  'm': 'm', 'o': 'm', 'p': 'm', 'g': 'm', 'z': 'm',
  // Hard sounds
  'c': 'c', 'k': 'c', 'x': 'c', 'q': 'c', 'y': 'c',
  // Single dit
  'e': 'e',
  // Single dah
  't': 't',
  // Long sounds
  'a': 'a', 'w': 'a', 'j': 'a', 'r': 'a', 'l': 'a', 'f': 'a', 'u': 'a', 'v': 'a',
};

/**
 * Calculate simplified form of a word using Morse confusion mapping
 */
export function simplifyWord(word: string): string {
  return word
    .toLowerCase()
    .split('')
    .map(char => SIMPLIFIED_MAPPING[char] || char)
    .join('');
}

/**
 * Group words by their simplified form
 */
export function groupWordsBySimplified(words: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const word of words) {
    const simplified = simplifyWord(word);
    const existing = groups.get(simplified) || [];
    existing.push(word);
    groups.set(simplified, existing);
  }

  return groups;
}

/**
 * Index words by starting letter and length for fallback matching
 */
export function indexWordsByStartAndLength(words: string[]): Map<string, string[]> {
  const index = new Map<string, string[]>();

  for (const word of words) {
    const key = `${word[0].toLowerCase()}_${word.length}`;
    const existing = index.get(key) || [];
    existing.push(word);
    index.set(key, existing);
  }

  return index;
}

/**
 * Generate distractors for a target word
 * Returns exactly 2 distractors, or null if unable to find enough
 */
export function generateDistractors(
  targetWord: string,
  simplifiedGroups: Map<string, string[]>,
  startLengthIndex: Map<string, string[]>
): string[] | null {
  const distractors: string[] = [];
  const simplified = simplifyWord(targetWord);
  const group = simplifiedGroups.get(simplified) || [];

  // Remove target word from group
  const candidates = group.filter(w => w !== targetWord);

  // Primary: Try to get 2 distractors from simplified group
  if (candidates.length >= 2) {
    const shuffled = shuffleArray(candidates);
    return shuffled.slice(0, 2);
  }

  // Use what we have from the simplified group (0 or 1)
  distractors.push(...candidates);

  // Secondary: Fill remaining slots with same start+length matches
  const startChar = targetWord[0].toLowerCase();
  const length = targetWord.length;
  const key = `${startChar}_${length}`;
  const fallbackCandidates = (startLengthIndex.get(key) || [])
    .filter(w => w !== targetWord && !distractors.includes(w));

  const needed = 2 - distractors.length;
  if (fallbackCandidates.length >= needed) {
    const shuffled = shuffleArray(fallbackCandidates);
    distractors.push(...shuffled.slice(0, needed));
    return distractors;
  }

  // Unable to find enough distractors
  return null;
}

/**
 * Word entry with pre-calculated distractors
 */
export interface WordEntry {
  word: string;
  distractors: string[];
}

/**
 * Process word list and generate all valid word entries with distractors
 */
export function processWordList(words: string[]): WordEntry[] {
  const simplifiedGroups = groupWordsBySimplified(words);
  const startLengthIndex = indexWordsByStartAndLength(words);
  const validEntries: WordEntry[] = [];

  for (const word of words) {
    const distractors = generateDistractors(word, simplifiedGroups, startLengthIndex);

    if (distractors !== null) {
      validEntries.push({
        word,
        distractors
      });
    }
  }

  return validEntries;
}
