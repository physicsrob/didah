/**
 * Mastery Calculator
 *
 * Calculates per-character mastery across historical sessions.
 * Used by Learn Mode to determine adaptive reveal behavior and weighting.
 */

import type { SessionStatistics } from './types';

/**
 * Mastery threshold - characters with >= this accuracy are considered mastered
 */
export const MASTERY_THRESHOLD = 80;

/**
 * Per-character accuracy information
 */
export type CharacterAccuracy = {
  char: string;
  totalCorrect: number;
  totalIncorrect: number;
  totalTimeout: number;
  accuracy: number; // 0-100 percentage (excludes timeouts)
  isMastered: boolean; // true if accuracy >= MASTERY_THRESHOLD
};

/**
 * Result of mastery analysis for a set of characters
 */
export type MasteryAnalysis = {
  masteredChars: Set<string>;
  unMasteredChars: Set<string>;
  accuracyByChar: Map<string, CharacterAccuracy>;
};

/**
 * Calculate per-character accuracy from historical sessions
 *
 * @param sessions Array of historical SessionStatistics
 * @param targetChars Characters to analyze (if not provided, analyzes all characters found in sessions)
 * @returns Map of character to accuracy information
 */
export function calculateCharacterAccuracy(
  sessions: SessionStatistics[],
  targetChars?: string[]
): Map<string, CharacterAccuracy> {
  // Aggregate stats across all sessions
  const aggregated = new Map<string, { correct: number; incorrect: number; timeout: number }>();

  for (const session of sessions) {
    for (const [char, stats] of Object.entries(session.characterStats)) {
      const existing = aggregated.get(char) || { correct: 0, incorrect: 0, timeout: 0 };
      aggregated.set(char, {
        correct: existing.correct + stats.correct,
        incorrect: existing.incorrect + stats.incorrect,
        timeout: existing.timeout + stats.timeout
      });
    }
  }

  // Calculate accuracy for each character
  const accuracyMap = new Map<string, CharacterAccuracy>();

  // If targetChars provided, ensure we have entries for all of them
  const charsToAnalyze = targetChars || Array.from(aggregated.keys());

  for (const char of charsToAnalyze) {
    const stats = aggregated.get(char);

    if (!stats) {
      // Character never seen before - 0% accuracy, not mastered
      accuracyMap.set(char, {
        char,
        totalCorrect: 0,
        totalIncorrect: 0,
        totalTimeout: 0,
        accuracy: 0,
        isMastered: false
      });
    } else {
      // Calculate accuracy (excludes timeouts per convention)
      const total = stats.correct + stats.incorrect;
      const accuracy = total > 0 ? (stats.correct / total) * 100 : 0;

      accuracyMap.set(char, {
        char,
        totalCorrect: stats.correct,
        totalIncorrect: stats.incorrect,
        totalTimeout: stats.timeout,
        accuracy,
        isMastered: accuracy >= MASTERY_THRESHOLD
      });
    }
  }

  return accuracyMap;
}

/**
 * Determine mastered vs un-mastered characters for a given set
 *
 * @param sessions Array of historical SessionStatistics
 * @param targetChars Characters to analyze
 * @returns MasteryAnalysis with sets of mastered/un-mastered characters and detailed accuracy info
 */
export function analyzeMastery(
  sessions: SessionStatistics[],
  targetChars: string[]
): MasteryAnalysis {
  const accuracyMap = calculateCharacterAccuracy(sessions, targetChars);

  const masteredChars = new Set<string>();
  const unMasteredChars = new Set<string>();

  for (const char of targetChars) {
    const accuracy = accuracyMap.get(char);
    if (!accuracy) {
      // Should never happen since we pass targetChars, but be safe
      unMasteredChars.add(char);
    } else if (accuracy.isMastered) {
      masteredChars.add(char);
    } else {
      unMasteredChars.add(char);
    }
  }

  return {
    masteredChars,
    unMasteredChars,
    accuracyByChar: accuracyMap
  };
}

/**
 * Get all un-mastered characters from a set
 * Convenience function for simpler use cases
 *
 * @param sessions Array of historical SessionStatistics
 * @param targetChars Characters to check
 * @returns Set of un-mastered characters (< 80% accuracy or never seen)
 */
export function getUnMasteredCharacters(
  sessions: SessionStatistics[],
  targetChars: string[]
): Set<string> {
  const analysis = analyzeMastery(sessions, targetChars);
  return analysis.unMasteredChars;
}

/**
 * Get all mastered characters from a set
 * Convenience function for simpler use cases
 *
 * @param sessions Array of historical SessionStatistics
 * @param targetChars Characters to check
 * @returns Set of mastered characters (>= 80% accuracy)
 */
export function getMasteredCharacters(
  sessions: SessionStatistics[],
  targetChars: string[]
): Set<string> {
  const analysis = analyzeMastery(sessions, targetChars);
  return analysis.masteredChars;
}
