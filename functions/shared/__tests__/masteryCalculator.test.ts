import { describe, it, expect } from 'vitest';
import {
  MASTERY_THRESHOLD,
  calculateCharacterAccuracy,
  analyzeMastery,
  getUnMasteredCharacters,
  getMasteredCharacters
} from '../masteryCalculator';
import type { SessionStatistics, CharacterStatistics } from '../types';

// Helper to create mock CharacterStatistics
function createCharStats(
  char: string,
  correct: number,
  incorrect: number,
  timeout: number = 0
): CharacterStatistics {
  const total = correct + incorrect;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  return {
    char,
    attempts: correct + incorrect + timeout,
    correct,
    incorrect,
    timeout,
    accuracy,
    recognitionTimes: [],
    meanRecognitionTimeMs: 0,
    medianRecognitionTimeMs: 0
  };
}

// Helper to create mock SessionStatistics
function createMockSession(
  charStats: Record<string, CharacterStatistics>
): SessionStatistics {
  return {
    startedAt: Date.now(),
    endedAt: Date.now() + 60000,
    durationMs: 60000,
    config: {
      mode: 'practice',
      lengthMs: 60000,
      wpm: 20,
      speedTier: 'slow',
      sourceId: 'test',
      replay: false,
      feedback: 'none',
      effectiveAlphabet: []
    },
    overallAccuracy: 80,
    timeoutPercentage: 0,
    achievedWpm: 15,
    totalCharacters: 10,
    correctCount: 8,
    incorrectCount: 2,
    timeoutCount: 0,
    characterStats: charStats,
    confusionMatrix: {},
    meanRecognitionTimeMs: 1000,
    medianRecognitionTimeMs: 1000
  };
}

describe('masteryCalculator', () => {
  describe('MASTERY_THRESHOLD', () => {
    it('should be 80', () => {
      expect(MASTERY_THRESHOLD).toBe(80);
    });
  });

  describe('calculateCharacterAccuracy', () => {
    it('should calculate accuracy for characters from single session', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1), // 90% accuracy
        'M': createCharStats('M', 7, 3)  // 70% accuracy
      });

      const result = calculateCharacterAccuracy([session]);

      expect(result.size).toBe(2);
      expect(result.get('K')?.accuracy).toBe(90);
      expect(result.get('K')?.isMastered).toBe(true);
      expect(result.get('M')?.accuracy).toBe(70);
      expect(result.get('M')?.isMastered).toBe(false);
    });

    it('should aggregate stats across multiple sessions', () => {
      const session1 = createMockSession({
        'K': createCharStats('K', 8, 2), // 80% in session 1
      });

      const session2 = createMockSession({
        'K': createCharStats('K', 7, 3), // 70% in session 2
      });

      const result = calculateCharacterAccuracy([session1, session2]);

      // Aggregated: 15 correct, 5 incorrect = 75%
      expect(result.get('K')?.totalCorrect).toBe(15);
      expect(result.get('K')?.totalIncorrect).toBe(5);
      expect(result.get('K')?.accuracy).toBe(75);
      expect(result.get('K')?.isMastered).toBe(false);
    });

    it('should handle character never seen before (with targetChars)', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1)
      });

      const result = calculateCharacterAccuracy([session], ['K', 'M', 'R']);

      expect(result.size).toBe(3);
      expect(result.get('K')?.accuracy).toBe(90);
      expect(result.get('M')?.accuracy).toBe(0);
      expect(result.get('M')?.isMastered).toBe(false);
      expect(result.get('R')?.accuracy).toBe(0);
      expect(result.get('R')?.isMastered).toBe(false);
    });

    it('should exclude timeouts from accuracy calculation', () => {
      const session = createMockSession({
        'K': createCharStats('K', 8, 2, 5) // 80% (timeouts excluded)
      });

      const result = calculateCharacterAccuracy([session]);

      expect(result.get('K')?.totalTimeout).toBe(5);
      expect(result.get('K')?.accuracy).toBe(80); // (8 / (8 + 2)) * 100
    });

    it('should handle empty session array', () => {
      const result = calculateCharacterAccuracy([]);

      expect(result.size).toBe(0);
    });

    it('should handle empty session array with targetChars', () => {
      const result = calculateCharacterAccuracy([], ['K', 'M', 'R']);

      expect(result.size).toBe(3);
      expect(result.get('K')?.accuracy).toBe(0);
      expect(result.get('M')?.accuracy).toBe(0);
      expect(result.get('R')?.accuracy).toBe(0);
    });

    it('should handle character with no attempts (0 correct, 0 incorrect)', () => {
      const session = createMockSession({
        'K': createCharStats('K', 0, 0)
      });

      const result = calculateCharacterAccuracy([session]);

      expect(result.get('K')?.accuracy).toBe(0);
      expect(result.get('K')?.isMastered).toBe(false);
    });

    it('should handle exactly 80% accuracy as mastered', () => {
      const session = createMockSession({
        'K': createCharStats('K', 8, 2) // Exactly 80%
      });

      const result = calculateCharacterAccuracy([session]);

      expect(result.get('K')?.accuracy).toBe(80);
      expect(result.get('K')?.isMastered).toBe(true);
    });

    it('should handle 79.9% accuracy as un-mastered', () => {
      const session = createMockSession({
        'K': createCharStats('K', 799, 201) // 79.9%
      });

      const result = calculateCharacterAccuracy([session]);

      expect(result.get('K')?.accuracy).toBe(79.9);
      expect(result.get('K')?.isMastered).toBe(false);
    });
  });

  describe('analyzeMastery', () => {
    it('should correctly categorize mastered and un-mastered characters', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1),  // 90% - mastered
        'M': createCharStats('M', 8, 2),  // 80% - mastered
        'R': createCharStats('R', 7, 3),  // 70% - un-mastered
        'S': createCharStats('S', 5, 5)   // 50% - un-mastered
      });

      const result = analyzeMastery([session], ['K', 'M', 'R', 'S']);

      expect(result.masteredChars.size).toBe(2);
      expect(result.masteredChars.has('K')).toBe(true);
      expect(result.masteredChars.has('M')).toBe(true);

      expect(result.unMasteredChars.size).toBe(2);
      expect(result.unMasteredChars.has('R')).toBe(true);
      expect(result.unMasteredChars.has('S')).toBe(true);
    });

    it('should treat never-seen characters as un-mastered', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1)  // 90% - mastered
      });

      const result = analyzeMastery([session], ['K', 'M', 'R', 'S']);

      expect(result.masteredChars.size).toBe(1);
      expect(result.masteredChars.has('K')).toBe(true);

      expect(result.unMasteredChars.size).toBe(3);
      expect(result.unMasteredChars.has('M')).toBe(true);
      expect(result.unMasteredChars.has('R')).toBe(true);
      expect(result.unMasteredChars.has('S')).toBe(true);
    });

    it('should handle all mastered scenario', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1),
        'M': createCharStats('M', 8, 2),
        'R': createCharStats('R', 10, 0)
      });

      const result = analyzeMastery([session], ['K', 'M', 'R']);

      expect(result.masteredChars.size).toBe(3);
      expect(result.unMasteredChars.size).toBe(0);
    });

    it('should handle all un-mastered scenario', () => {
      const session = createMockSession({
        'K': createCharStats('K', 1, 9),
        'M': createCharStats('M', 2, 8),
        'R': createCharStats('R', 0, 10)
      });

      const result = analyzeMastery([session], ['K', 'M', 'R']);

      expect(result.masteredChars.size).toBe(0);
      expect(result.unMasteredChars.size).toBe(3);
    });

    it('should include accuracyByChar map with all details', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1, 2)
      });

      const result = analyzeMastery([session], ['K', 'M']);

      expect(result.accuracyByChar.size).toBe(2);

      const kAccuracy = result.accuracyByChar.get('K');
      expect(kAccuracy?.char).toBe('K');
      expect(kAccuracy?.totalCorrect).toBe(9);
      expect(kAccuracy?.totalIncorrect).toBe(1);
      expect(kAccuracy?.totalTimeout).toBe(2);
      expect(kAccuracy?.accuracy).toBe(90);
      expect(kAccuracy?.isMastered).toBe(true);

      const mAccuracy = result.accuracyByChar.get('M');
      expect(mAccuracy?.char).toBe('M');
      expect(mAccuracy?.totalCorrect).toBe(0);
      expect(mAccuracy?.totalIncorrect).toBe(0);
      expect(mAccuracy?.accuracy).toBe(0);
      expect(mAccuracy?.isMastered).toBe(false);
    });
  });

  describe('getUnMasteredCharacters', () => {
    it('should return un-mastered characters', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1),  // mastered
        'M': createCharStats('M', 7, 3)   // un-mastered
      });

      const result = getUnMasteredCharacters([session], ['K', 'M', 'R']);

      expect(result.size).toBe(2);
      expect(result.has('M')).toBe(true);
      expect(result.has('R')).toBe(true); // never seen
      expect(result.has('K')).toBe(false);
    });

    it('should return empty set when all mastered', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1),
        'M': createCharStats('M', 8, 2)
      });

      const result = getUnMasteredCharacters([session], ['K', 'M']);

      expect(result.size).toBe(0);
    });

    it('should return all characters when no history', () => {
      const result = getUnMasteredCharacters([], ['K', 'M', 'R']);

      expect(result.size).toBe(3);
      expect(result.has('K')).toBe(true);
      expect(result.has('M')).toBe(true);
      expect(result.has('R')).toBe(true);
    });
  });

  describe('getMasteredCharacters', () => {
    it('should return mastered characters', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1),  // mastered
        'M': createCharStats('M', 7, 3)   // un-mastered
      });

      const result = getMasteredCharacters([session], ['K', 'M', 'R']);

      expect(result.size).toBe(1);
      expect(result.has('K')).toBe(true);
      expect(result.has('M')).toBe(false);
      expect(result.has('R')).toBe(false);
    });

    it('should return empty set when no history', () => {
      const result = getMasteredCharacters([], ['K', 'M', 'R']);

      expect(result.size).toBe(0);
    });

    it('should return all characters when all mastered', () => {
      const session = createMockSession({
        'K': createCharStats('K', 9, 1),
        'M': createCharStats('M', 8, 2),
        'R': createCharStats('R', 10, 0)
      });

      const result = getMasteredCharacters([session], ['K', 'M', 'R']);

      expect(result.size).toBe(3);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle Learn Mode scenario - Level 5 with mixed history', () => {
      // Level 5: K M R S U A P T (8 characters)
      // Historical accuracy (simulated across multiple sessions):
      // K: 92% (mastered), M: 88% (mastered), R: 75% (un-mastered),
      // S: 91% (mastered), U: 82% (mastered), A: 65% (un-mastered),
      // P: 78% (un-mastered), T: never seen (un-mastered)

      const session1 = createMockSession({
        'K': createCharStats('K', 18, 2),
        'M': createCharStats('M', 17, 3),
        'R': createCharStats('R', 15, 5),
        'S': createCharStats('S', 18, 2)
      });

      const session2 = createMockSession({
        'U': createCharStats('U', 16, 4),
        'A': createCharStats('A', 13, 7),
        'P': createCharStats('P', 15, 5)
      });

      const session3 = createMockSession({
        'K': createCharStats('K', 10, 0),
        'M': createCharStats('M', 9, 1),
        'R': createCharStats('R', 0, 5)
      });

      const levelChars = ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T'];
      const result = analyzeMastery([session1, session2, session3], levelChars);

      // Mastered: K (28/30=93%), M (26/30=87%), S (18/20=90%), U (16/20=80%)
      expect(result.masteredChars.size).toBe(4);
      expect(result.masteredChars.has('K')).toBe(true);
      expect(result.masteredChars.has('M')).toBe(true);
      expect(result.masteredChars.has('S')).toBe(true);
      expect(result.masteredChars.has('U')).toBe(true);

      // Un-mastered: R (15/25=60%), A (13/20=65%), P (15/20=75%), T (never seen=0%)
      expect(result.unMasteredChars.size).toBe(4);
      expect(result.unMasteredChars.has('R')).toBe(true);
      expect(result.unMasteredChars.has('A')).toBe(true);
      expect(result.unMasteredChars.has('P')).toBe(true);
      expect(result.unMasteredChars.has('T')).toBe(true);
    });
  });
});
