/**
 * Tests for StatisticsAPI Learn Mode extensions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatisticsAPI } from '../api';
import type { SessionStatisticsWithMaps } from '../../../core/types/statistics';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('StatisticsAPI - Learn Mode Extensions', () => {
  let api: StatisticsAPI;

  beforeEach(() => {
    api = new StatisticsAPI('test-token');
    mockFetch.mockClear();
  });

  describe('getLearnModeProgress', () => {
    it('should return best stars per level from Learn Mode sessions', async () => {
      // Mock session data
      const mockSessions: SessionStatisticsWithMaps[] = [
        {
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 60000,
          config: {
            mode: 'learn',
            lengthMs: 60000,
            wpm: 20,
            farnsworthWpm: 20,
            speedTier: 'slow',
            sourceId: 'koch-level-1',
            sourceName: 'Koch Level 1',
            replay: false,
            feedback: 'none',
            effectiveAlphabet: ['K', 'M'],
            learnLevel: 1
          },
          overallAccuracy: 95,
          timeoutPercentage: 0,
          achievedWpm: 18,
          totalCharacters: 50,
          correctCount: 48,
          incorrectCount: 2,
          timeoutCount: 0,
          characterStats: new Map(),
          confusionMatrix: new Map(),
          meanRecognitionTimeMs: 1000,
          medianRecognitionTimeMs: 950,
          learnLevel: 1,
          learnStars: 3
        },
        {
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 60000,
          config: {
            mode: 'learn',
            lengthMs: 60000,
            wpm: 20,
            farnsworthWpm: 20,
            speedTier: 'slow',
            sourceId: 'koch-level-1',
            sourceName: 'Koch Level 1',
            replay: false,
            feedback: 'none',
            effectiveAlphabet: ['K', 'M'],
            learnLevel: 1
          },
          overallAccuracy: 88,
          timeoutPercentage: 0,
          achievedWpm: 16,
          totalCharacters: 50,
          correctCount: 44,
          incorrectCount: 6,
          timeoutCount: 0,
          characterStats: new Map(),
          confusionMatrix: new Map(),
          meanRecognitionTimeMs: 1200,
          medianRecognitionTimeMs: 1100,
          learnLevel: 1,
          learnStars: 1
        },
        {
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 60000,
          config: {
            mode: 'learn',
            lengthMs: 60000,
            wpm: 20,
            farnsworthWpm: 20,
            speedTier: 'slow',
            sourceId: 'koch-level-2',
            sourceName: 'Koch Level 2',
            replay: false,
            feedback: 'none',
            effectiveAlphabet: ['K', 'M', 'R', 'S'],
            learnLevel: 2
          },
          overallAccuracy: 92,
          timeoutPercentage: 0,
          achievedWpm: 17,
          totalCharacters: 50,
          correctCount: 46,
          incorrectCount: 4,
          timeoutCount: 0,
          characterStats: new Map(),
          confusionMatrix: new Map(),
          meanRecognitionTimeMs: 1100,
          medianRecognitionTimeMs: 1050,
          learnLevel: 2,
          learnStars: 2
        }
      ];

      // Mock getSessions to return our test data
      vi.spyOn(api, 'getSessions').mockResolvedValue(mockSessions);

      const progress = await api.getLearnModeProgress();

      expect(progress.get(1)).toBe(3); // Best of 3 and 1
      expect(progress.get(2)).toBe(2);
      expect(progress.get(3)).toBeUndefined(); // Not attempted
    });

    it('should return empty map when no Learn Mode sessions exist', async () => {
      const mockSessions: SessionStatisticsWithMaps[] = [
        {
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 60000,
          config: {
            mode: 'practice',
            lengthMs: 60000,
            wpm: 20,
            farnsworthWpm: 20,
            speedTier: 'slow',
            sourceId: 'random_letters',
            sourceName: 'Random Letters',
            replay: false,
            feedback: 'flash',
            effectiveAlphabet: ['A', 'B', 'C']
          },
          overallAccuracy: 90,
          timeoutPercentage: 5,
          achievedWpm: 18,
          totalCharacters: 100,
          correctCount: 90,
          incorrectCount: 10,
          timeoutCount: 0,
          characterStats: new Map(),
          confusionMatrix: new Map(),
          meanRecognitionTimeMs: 1000,
          medianRecognitionTimeMs: 950
        }
      ];

      vi.spyOn(api, 'getSessions').mockResolvedValue(mockSessions);

      const progress = await api.getLearnModeProgress();

      expect(progress.size).toBe(0);
    });

    it('should return empty map when not authenticated', async () => {
      const unauthenticatedApi = new StatisticsAPI(null);
      const progress = await unauthenticatedApi.getLearnModeProgress();

      expect(progress.size).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(api, 'getSessions').mockRejectedValue(new Error('Network error'));

      const progress = await api.getLearnModeProgress();

      expect(progress.size).toBe(0); // Graceful fallback
    });
  });

  describe('getCharacterMastery', () => {
    it('should identify mastered and un-mastered characters', async () => {
      const mockSessions: SessionStatisticsWithMaps[] = [
        {
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 60000,
          config: {
            mode: 'practice',
            lengthMs: 60000,
            wpm: 20,
            farnsworthWpm: 20,
            speedTier: 'slow',
            sourceId: 'test',
            sourceName: 'Test',
            replay: false,
            feedback: 'none',
            effectiveAlphabet: ['K', 'M', 'R']
          },
          overallAccuracy: 85,
          timeoutPercentage: 0,
          achievedWpm: 18,
          totalCharacters: 30,
          correctCount: 25,
          incorrectCount: 5,
          timeoutCount: 0,
          characterStats: new Map([
            ['K', { char: 'K', attempts: 10, correct: 9, incorrect: 1, timeout: 0, accuracy: 90, recognitionTimes: [1000], meanRecognitionTimeMs: 1000, medianRecognitionTimeMs: 1000 }],
            ['M', { char: 'M', attempts: 10, correct: 8, incorrect: 2, timeout: 0, accuracy: 80, recognitionTimes: [1100], meanRecognitionTimeMs: 1100, medianRecognitionTimeMs: 1100 }],
            ['R', { char: 'R', attempts: 10, correct: 7, incorrect: 3, timeout: 0, accuracy: 70, recognitionTimes: [1200], meanRecognitionTimeMs: 1200, medianRecognitionTimeMs: 1200 }]
          ]),
          confusionMatrix: new Map(),
          meanRecognitionTimeMs: 1100,
          medianRecognitionTimeMs: 1100
        }
      ];

      vi.spyOn(api, 'getSessions').mockResolvedValue(mockSessions);

      const mastery = await api.getCharacterMastery(['K', 'M', 'R']);

      // K (90%) and M (80%) are mastered, R (70%) is not
      expect(mastery.masteredChars.has('K')).toBe(true);
      expect(mastery.masteredChars.has('M')).toBe(true);
      expect(mastery.unMasteredChars.has('R')).toBe(true);
    });

    it('should treat never-seen characters as un-mastered', async () => {
      const mockSessions: SessionStatisticsWithMaps[] = [
        {
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 60000,
          config: {
            mode: 'practice',
            lengthMs: 60000,
            wpm: 20,
            farnsworthWpm: 20,
            speedTier: 'slow',
            sourceId: 'test',
            sourceName: 'Test',
            replay: false,
            feedback: 'none',
            effectiveAlphabet: ['K']
          },
          overallAccuracy: 90,
          timeoutPercentage: 0,
          achievedWpm: 18,
          totalCharacters: 10,
          correctCount: 9,
          incorrectCount: 1,
          timeoutCount: 0,
          characterStats: new Map([
            ['K', { char: 'K', attempts: 10, correct: 9, incorrect: 1, timeout: 0, accuracy: 90, recognitionTimes: [1000], meanRecognitionTimeMs: 1000, medianRecognitionTimeMs: 1000 }]
          ]),
          confusionMatrix: new Map(),
          meanRecognitionTimeMs: 1000,
          medianRecognitionTimeMs: 1000
        }
      ];

      vi.spyOn(api, 'getSessions').mockResolvedValue(mockSessions);

      const mastery = await api.getCharacterMastery(['K', 'M', 'R']);

      expect(mastery.masteredChars.has('K')).toBe(true);
      expect(mastery.unMasteredChars.has('M')).toBe(true); // Never seen
      expect(mastery.unMasteredChars.has('R')).toBe(true); // Never seen
    });

    it('should return all un-mastered when not authenticated', async () => {
      const unauthenticatedApi = new StatisticsAPI(null);
      const mastery = await unauthenticatedApi.getCharacterMastery(['K', 'M', 'R']);

      expect(mastery.masteredChars.size).toBe(0);
      expect(mastery.unMasteredChars.size).toBe(3);
      expect(mastery.unMasteredChars.has('K')).toBe(true);
      expect(mastery.unMasteredChars.has('M')).toBe(true);
      expect(mastery.unMasteredChars.has('R')).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      vi.spyOn(api, 'getSessions').mockRejectedValue(new Error('Network error'));

      const mastery = await api.getCharacterMastery(['K', 'M', 'R']);

      // Graceful fallback - all un-mastered
      expect(mastery.masteredChars.size).toBe(0);
      expect(mastery.unMasteredChars.size).toBe(3);
    });

    it('should query across all modes (not just Learn Mode)', async () => {
      const mockSessions: SessionStatisticsWithMaps[] = [
        {
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 60000,
          config: {
            mode: 'practice',
            lengthMs: 60000,
            wpm: 20,
            farnsworthWpm: 20,
            speedTier: 'slow',
            sourceId: 'test',
            sourceName: 'Test',
            replay: false,
            feedback: 'none',
            effectiveAlphabet: ['K']
          },
          overallAccuracy: 90,
          timeoutPercentage: 0,
          achievedWpm: 18,
          totalCharacters: 10,
          correctCount: 9,
          incorrectCount: 1,
          timeoutCount: 0,
          characterStats: new Map([
            ['K', { char: 'K', attempts: 10, correct: 9, incorrect: 1, timeout: 0, accuracy: 90, recognitionTimes: [1000], meanRecognitionTimeMs: 1000, medianRecognitionTimeMs: 1000 }]
          ]),
          confusionMatrix: new Map(),
          meanRecognitionTimeMs: 1000,
          medianRecognitionTimeMs: 1000
        },
        {
          startedAt: Date.now(),
          endedAt: Date.now(),
          durationMs: 60000,
          config: {
            mode: 'learn',
            lengthMs: 60000,
            wpm: 20,
            farnsworthWpm: 20,
            speedTier: 'slow',
            sourceId: 'koch-level-1',
            sourceName: 'Koch Level 1',
            replay: false,
            feedback: 'none',
            effectiveAlphabet: ['K', 'M'],
            learnLevel: 1
          },
          overallAccuracy: 85,
          timeoutPercentage: 0,
          achievedWpm: 17,
          totalCharacters: 20,
          correctCount: 17,
          incorrectCount: 3,
          timeoutCount: 0,
          characterStats: new Map([
            ['K', { char: 'K', attempts: 10, correct: 9, incorrect: 1, timeout: 0, accuracy: 90, recognitionTimes: [1000], meanRecognitionTimeMs: 1000, medianRecognitionTimeMs: 1000 }],
            ['M', { char: 'M', attempts: 10, correct: 8, incorrect: 2, timeout: 0, accuracy: 80, recognitionTimes: [1100], meanRecognitionTimeMs: 1100, medianRecognitionTimeMs: 1100 }]
          ]),
          confusionMatrix: new Map(),
          meanRecognitionTimeMs: 1050,
          medianRecognitionTimeMs: 1050,
          learnLevel: 1,
          learnStars: 1
        }
      ];

      vi.spyOn(api, 'getSessions').mockResolvedValue(mockSessions);

      const mastery = await api.getCharacterMastery(['K', 'M']);

      // Both Practice and Learn Mode sessions should be considered
      // K: 9+9 correct, 1+1 incorrect = 18/20 = 90% (mastered)
      // M: 8 correct, 2 incorrect = 80% (mastered)
      expect(mastery.masteredChars.has('K')).toBe(true);
      expect(mastery.masteredChars.has('M')).toBe(true);
    });
  });
});
