/**
 * Distractor Algorithm for Head Copy Mode
 *
 * Generates confusable distractors by analyzing Morse code pattern similarity
 * with semantic category awareness.
 *
 * Strategy:
 * 1. Find best distractor from same semantic category (verbs/places/etc)
 * 2. Find best distractor from entire 10k word list
 * 3. Return both to guarantee semantic + morse similarity
 *
 * Morse filtering uses:
 * - Same first 2 & last 2 morse symbols
 * - Similar length (±1 character)
 * - Levenshtein distance scoring
 */

import TOP_10K_WORDS from './top10k-words.json';
import {
  MORSE_PATTERN_CACHE,
  getFirstMorseSymbols,
  getLastMorseSymbols,
} from './morsePatterns.js';
import { levenshteinDistance } from './levenshtein.js';
import { getCategoryWords } from './categoryData.js';
import { generateFallbackDistractors } from './fallback.js';

/**
 * Find candidate distractors for a target word from a given word list.
 *
 * Filters words based on tier level (higher tier = more relaxed):
 * - Tier 1: First 2 & last 2 morse symbols match, ±1 length
 * - Tier 2: First 2 & last 2 morse symbols match, ±2 length
 * - Tier 3: First 1 & last 1 morse symbols match, ±2 length
 * - Tier 4: ±2 length only
 * - Tier 5: Any length (guaranteed to find candidates)
 *
 * Returns filtered list of candidate words.
 */
export function findCandidateDistractors(
  targetWord: string,
  wordList: string[],
  tier: number = 1
): string[] {
  const targetPattern = MORSE_PATTERN_CACHE.get(targetWord);

  if (!targetPattern) {
    return [];
  }

  const targetLength = targetWord.length;
  const targetFirstTwo = getFirstMorseSymbols(targetPattern, 2);
  const targetLastTwo = getLastMorseSymbols(targetPattern, 2);
  const targetFirstOne = getFirstMorseSymbols(targetPattern, 1);
  const targetLastOne = getLastMorseSymbols(targetPattern, 1);

  const candidates: string[] = [];

  for (const word of wordList) {
    if (word === targetWord) continue;

    const pattern = MORSE_PATTERN_CACHE.get(word);
    if (!pattern) continue;

    const lengthDiff = Math.abs(word.length - targetLength);

    // Apply filters based on tier
    if (tier === 1) {
      // Tier 1: First 2 & last 2 morse symbols, ±1 length
      if (lengthDiff > 1) continue;
      const firstTwo = getFirstMorseSymbols(pattern, 2);
      const lastTwo = getLastMorseSymbols(pattern, 2);
      if (firstTwo !== targetFirstTwo || lastTwo !== targetLastTwo) continue;
    } else if (tier === 2) {
      // Tier 2: First 2 & last 2 morse symbols, ±2 length
      if (lengthDiff > 2) continue;
      const firstTwo = getFirstMorseSymbols(pattern, 2);
      const lastTwo = getLastMorseSymbols(pattern, 2);
      if (firstTwo !== targetFirstTwo || lastTwo !== targetLastTwo) continue;
    } else if (tier === 3) {
      // Tier 3: First 1 & last 1 morse symbols, ±2 length
      if (lengthDiff > 2) continue;
      const firstOne = getFirstMorseSymbols(pattern, 1);
      const lastOne = getLastMorseSymbols(pattern, 1);
      if (firstOne !== targetFirstOne || lastOne !== targetLastOne) continue;
    } else if (tier === 4) {
      // Tier 4: ±2 length only
      if (lengthDiff > 2) continue;
    }
    // Tier 5: No filters (accept all words except target)

    candidates.push(word);
  }

  return candidates;
}

/**
 * Score a candidate word by computing Levenshtein distance between
 * its morse pattern and the target word's morse pattern.
 *
 * Applies bonuses for matching first/last letters to emphasize
 * visual similarity alongside morse similarity.
 *
 * Lower scores indicate more similar patterns (better distractors).
 */
export function scoreDistractor(
  targetWord: string,
  candidateWord: string
): number {
  const targetPattern = MORSE_PATTERN_CACHE.get(targetWord);
  const candidatePattern = MORSE_PATTERN_CACHE.get(candidateWord);

  if (!targetPattern || !candidatePattern) {
    return Infinity;
  }

  // Base score: Levenshtein distance on morse patterns
  let score = levenshteinDistance(targetPattern, candidatePattern);

  // Bonus: Same first letter (subtract 1.0 from score)
  if (targetWord[0] === candidateWord[0]) {
    score -= 1.0;
  }

  // Bonus: Same last letter (subtract 1.0 from score)
  const targetLast = targetWord[targetWord.length - 1];
  const candidateLast = candidateWord[candidateWord.length - 1];
  if (targetLast === candidateLast) {
    score -= 1.0;
  }

  return score;
}

/**
 * Select the best distractor from a list of candidates.
 *
 * Scores each candidate using Levenshtein distance and returns
 * the most similar word (lowest score).
 */
export function selectBestDistractor(
  targetWord: string,
  candidates: string[]
): string | null {
  if (candidates.length === 0) {
    return null;
  }

  // Score all candidates
  const scored = candidates.map(candidate => ({
    word: candidate,
    score: scoreDistractor(targetWord, candidate),
  }));

  // Sort by score (lower is better) and take best
  scored.sort((a, b) => a.score - b.score);

  return scored[0].word;
}

/**
 * Get the best distractor from the target word's semantic category.
 * Returns null if word has no category or no suitable candidates found.
 */
export function getBestDistractorFromCategory(targetWord: string, tier: number = 1): string | null {
  const categoryWords = getCategoryWords(targetWord);

  if (categoryWords.length === 0) {
    return null;
  }

  const candidates = findCandidateDistractors(targetWord, categoryWords, tier);
  return selectBestDistractor(targetWord, candidates);
}

/**
 * Get the best distractor from the entire 10k word list.
 * Optionally exclude specific words (e.g., the category winner).
 */
export function getBestDistractorGlobal(
  targetWord: string,
  excludeWords: string[] = [],
  tier: number = 1
): string | null {
  const excludeSet = new Set(excludeWords);
  const filteredWords = TOP_10K_WORDS.filter(word => !excludeSet.has(word));

  const candidates = findCandidateDistractors(targetWord, filteredWords, tier);
  return selectBestDistractor(targetWord, candidates);
}

/**
 * Generate distractors for a target word.
 * Always returns exactly 2 distractors (guaranteed).
 *
 * Strategy:
 * 1. Check if word contains letters
 * 2. If no letters (numbers/punctuation/mixed), use character substitution fallback
 * 3. If has letters, try word-based algorithm with progressively relaxed tiers (1-5)
 * 4. If word-based fails, use character substitution fallback
 *
 * Word-based tiers:
 * - Tier 1: Strictest morse similarity (first/last 2 symbols, ±1 length)
 * - Tier 5: Most relaxed (any word from list)
 *
 * Fallback uses character substitution with Morse-similar characters.
 *
 * This is the main entry point used by the API.
 */
export function generateDistractors(targetWord: string): string[] {
  // Check if word contains any letters
  const hasLetters = /[a-zA-Z]/.test(targetWord);

  // If no letters, use fallback immediately (numbers, punctuation, etc.)
  if (!hasLetters) {
    const fallbackResult = generateFallbackDistractors(targetWord);
    if (fallbackResult) {
      return fallbackResult;
    }
    throw new Error(`Failed to generate fallback distractors for word: ${targetWord}`);
  }

  // Try word-based algorithm with each tier from strictest to most relaxed
  for (let tier = 1; tier <= 5; tier++) {
    // Try to get best from category
    const categoryBest = getBestDistractorFromCategory(targetWord, tier);

    // Get best from global list (excluding category winner if it exists)
    const excludeWords = categoryBest ? [categoryBest] : [];
    const globalBest = getBestDistractorGlobal(targetWord, excludeWords, tier);

    // If we have both, return them
    if (categoryBest && globalBest) {
      return [categoryBest, globalBest];
    }

    // If we only have global, get second best
    if (globalBest) {
      const secondBest = getBestDistractorGlobal(targetWord, [globalBest], tier);
      if (secondBest) {
        return [globalBest, secondBest];
      }
    }

    // Try again with only category
    if (categoryBest) {
      // Try to get a second distractor from global, excluding the category winner
      const globalSecond = getBestDistractorGlobal(targetWord, [categoryBest], tier);
      if (globalSecond) {
        return [categoryBest, globalSecond];
      }
    }
  }

  // Word-based algorithm failed even at tier 5
  // Try fallback as last resort
  const fallbackResult = generateFallbackDistractors(targetWord);
  if (fallbackResult) {
    return fallbackResult;
  }

  // Both word-based and fallback failed
  throw new Error(`Failed to generate distractors for word: ${targetWord}`);
}

/**
 * Word entry with pre-calculated distractors
 */
export interface WordEntry {
  word: string;
  distractors: string[];
}

/**
 * Process word list and generate all valid word entries with distractors.
 * Used for testing and analysis purposes.
 */
export function processWordList(words: string[]): WordEntry[] {
  const validEntries: WordEntry[] = [];

  for (const word of words) {
    const distractors = generateDistractors(word);
    validEntries.push({
      word,
      distractors,
    });
  }

  return validEntries;
}
