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

/**
 * Find candidate distractors for a target word from a given word list.
 *
 * Filters words that match:
 * - Same first 2 morse symbols
 * - Same last 2 morse symbols
 * - Similar length (±1 character)
 *
 * Returns filtered list of candidate words.
 */
export function findCandidateDistractors(
  targetWord: string,
  wordList: string[]
): string[] {
  const targetPattern = MORSE_PATTERN_CACHE.get(targetWord);

  if (!targetPattern) {
    return [];
  }

  const targetLength = targetWord.length;
  const targetFirstTwo = getFirstMorseSymbols(targetPattern, 2);
  const targetLastTwo = getLastMorseSymbols(targetPattern, 2);

  const candidates: string[] = [];

  for (const word of wordList) {
    if (word === targetWord) continue;

    const pattern = MORSE_PATTERN_CACHE.get(word);
    if (!pattern) continue;

    // Filter 1: Similar length (±1 characters)
    const lengthDiff = Math.abs(word.length - targetLength);
    if (lengthDiff > 1) continue;

    // Filter 2: Same first 2 morse symbols
    const firstTwo = getFirstMorseSymbols(pattern, 2);
    if (firstTwo !== targetFirstTwo) continue;

    // Filter 3: Same last 2 morse symbols
    const lastTwo = getLastMorseSymbols(pattern, 2);
    if (lastTwo !== targetLastTwo) continue;

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
export function getBestDistractorFromCategory(targetWord: string): string | null {
  const categoryWords = getCategoryWords(targetWord);

  if (categoryWords.length === 0) {
    return null;
  }

  const candidates = findCandidateDistractors(targetWord, categoryWords);
  return selectBestDistractor(targetWord, candidates);
}

/**
 * Get the best distractor from the entire 10k word list.
 * Optionally exclude specific words (e.g., the category winner).
 */
export function getBestDistractorGlobal(
  targetWord: string,
  excludeWords: string[] = []
): string | null {
  const excludeSet = new Set(excludeWords);
  const filteredWords = TOP_10K_WORDS.filter(word => !excludeSet.has(word));

  const candidates = findCandidateDistractors(targetWord, filteredWords);
  return selectBestDistractor(targetWord, candidates);
}

/**
 * Generate distractors for a target word.
 * Returns exactly 2 distractors, or null if unable to find enough.
 *
 * Strategy:
 * 1. Get best distractor from same semantic category
 * 2. Get best distractor from entire 10k list (excluding category winner)
 * 3. Fallback to 2 global distractors if category approach fails
 *
 * This is the main entry point used by the API.
 */
export function generateDistractors(targetWord: string): string[] | null {
  // Try to get best from category
  const categoryBest = getBestDistractorFromCategory(targetWord);

  // Get best from global list (excluding category winner if it exists)
  const excludeWords = categoryBest ? [categoryBest] : [];
  const globalBest = getBestDistractorGlobal(targetWord, excludeWords);

  // If we have both, return them
  if (categoryBest && globalBest) {
    return [categoryBest, globalBest];
  }

  // If we only have global, get second best
  if (globalBest) {
    const secondBest = getBestDistractorGlobal(targetWord, [globalBest]);
    if (secondBest) {
      return [globalBest, secondBest];
    }
  }

  // Unable to generate 2 distractors
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
 * Process word list and generate all valid word entries with distractors.
 * Used for testing and analysis purposes.
 */
export function processWordList(words: string[]): WordEntry[] {
  const validEntries: WordEntry[] = [];

  for (const word of words) {
    const distractors = generateDistractors(word);

    if (distractors !== null) {
      validEntries.push({
        word,
        distractors,
      });
    }
  }

  return validEntries;
}
