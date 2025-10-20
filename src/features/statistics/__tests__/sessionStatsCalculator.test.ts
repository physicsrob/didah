/**
 * Tests for SessionStatsCalculator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SessionStatsCalculator } from '../sessionStatsCalculator';
import type { LogEvent } from '../../session/runtime/io';
import type { SessionConfig } from '../../../core/types/domain';

// Helper to create minimal config
const createConfig = (): SessionConfig => ({
  mode: 'practice',
  lengthMs: 60000,
  wpm: 20,
  farnsworthWpm: 20,
  speedTier: 'medium',
  sourceId: 'random_letters',
  sourceName: 'Random Letters',
  replay: false,
  feedback: 'flash',
  effectiveAlphabet: ['A', 'B', 'C'],
  extraWordSpacing: 0,
  listenTimingOffset: 0.0,
  startingLevel: 1,
});

describe('SessionStatsCalculator', () => {
  let calculator: SessionStatsCalculator;

  beforeEach(() => {
    calculator = new SessionStatsCalculator();
  });

  describe('missing session events', () => {
    it('throws error when sessionStart event is missing', () => {
      const events: LogEvent[] = [
        { type: 'correct', at: 1000, char: 'A', latencyMs: 500 },
        { type: 'sessionEnd', at: 5000 },
      ];

      expect(() => calculator.calculateStats(events, createConfig())).toThrow(
        /session start/i
      );
    });

    it('throws error when sessionEnd event is missing', () => {
      const events: LogEvent[] = [
        { type: 'sessionStart', at: 0, config: createConfig() },
        { type: 'correct', at: 1000, char: 'A', latencyMs: 500 },
      ];

      expect(() => calculator.calculateStats(events, createConfig())).toThrow(
        /session end/i
      );
    });

    it('throws error when both sessionStart and sessionEnd are missing', () => {
      const events: LogEvent[] = [
        { type: 'correct', at: 1000, char: 'A', latencyMs: 500 },
        { type: 'incorrect', at: 2000, expected: 'B', got: 'C' },
      ];

      expect(() => calculator.calculateStats(events, createConfig())).toThrow(
        /session/i
      );
    });
  });

  describe('valid session events', () => {
    it('calculates stats correctly with valid start and end events', () => {
      const events: LogEvent[] = [
        { type: 'sessionStart', at: 0, config: createConfig() },
        { type: 'correct', at: 1000, char: 'A', latencyMs: 500 },
        { type: 'correct', at: 2000, char: 'B', latencyMs: 600 },
        { type: 'incorrect', at: 3000, expected: 'C', got: 'D' },
        { type: 'sessionEnd', at: 5000 },
      ];

      const stats = calculator.calculateStats(events, createConfig());

      expect(stats.startedAt).toBe(0);
      expect(stats.endedAt).toBe(5000);
      expect(stats.durationMs).toBe(5000);
      expect(stats.correctCount).toBe(2);
      expect(stats.incorrectCount).toBe(1);
      expect(stats.totalCharacters).toBe(3);
      expect(stats.overallAccuracy).toBeCloseTo(66.67, 1);
    });

    it('handles empty session (no character events)', () => {
      const events: LogEvent[] = [
        { type: 'sessionStart', at: 0, config: createConfig() },
        { type: 'sessionEnd', at: 5000 },
      ];

      const stats = calculator.calculateStats(events, createConfig());

      expect(stats.startedAt).toBe(0);
      expect(stats.endedAt).toBe(5000);
      expect(stats.durationMs).toBe(5000);
      expect(stats.totalCharacters).toBe(0);
      expect(stats.overallAccuracy).toBe(0);
      expect(stats.achievedWpm).toBe(0);
    });
  });

  describe('head-copy mode', () => {
    const createHeadCopyConfig = (): SessionConfig => ({
      ...createConfig(),
      mode: 'head-copy',
    });

    it('counts word lengths instead of event counts for characters practiced', () => {
      const events: LogEvent[] = [
        { type: 'sessionStart', at: 0, config: createHeadCopyConfig() },
        { type: 'correct', at: 1000, char: 'hello', latencyMs: 500 },  // 5 chars
        { type: 'correct', at: 2000, char: 'the', latencyMs: 600 },    // 3 chars
        { type: 'incorrect', at: 3000, expected: 'world', got: 'word' }, // 5 chars
        { type: 'sessionEnd', at: 5000 },
      ];

      const stats = calculator.calculateStats(events, createHeadCopyConfig());

      expect(stats.correctCount).toBe(8);  // 5 + 3 = 8 characters
      expect(stats.incorrectCount).toBe(5);  // 5 characters
      expect(stats.totalCharacters).toBe(13);  // 8 + 5 = 13 characters
    });

    it('counts timeout word lengths correctly', () => {
      const events: LogEvent[] = [
        { type: 'sessionStart', at: 0, config: createHeadCopyConfig() },
        { type: 'correct', at: 1000, char: 'cat', latencyMs: 500 },    // 3 chars
        { type: 'timeout', at: 2000, char: 'dog' },                    // 3 chars
        { type: 'timeout', at: 3000, char: 'elephant' },               // 8 chars
        { type: 'sessionEnd', at: 5000 },
      ];

      const stats = calculator.calculateStats(events, createHeadCopyConfig());

      expect(stats.correctCount).toBe(3);   // 3 characters
      expect(stats.timeoutCount).toBe(11);  // 3 + 8 = 11 characters
      expect(stats.totalCharacters).toBe(14);  // 3 + 11 = 14 characters
    });

    it('does not populate confusion matrix for head-copy mode', () => {
      const events: LogEvent[] = [
        { type: 'sessionStart', at: 0, config: createHeadCopyConfig() },
        { type: 'correct', at: 1000, char: 'the', latencyMs: 500 },
        { type: 'incorrect', at: 2000, expected: 'hello', got: 'hallo' },
        { type: 'incorrect', at: 3000, expected: 'world', got: 'word' },
        { type: 'sessionEnd', at: 5000 },
      ];

      const stats = calculator.calculateStats(events, createHeadCopyConfig());

      // Confusion matrix should be empty for head-copy mode
      expect(stats.confusionMatrix.size).toBe(0);
    });

    it('calculates accuracy correctly with word-length counting', () => {
      const events: LogEvent[] = [
        { type: 'sessionStart', at: 0, config: createHeadCopyConfig() },
        { type: 'correct', at: 1000, char: 'cat', latencyMs: 500 },    // 3 correct
        { type: 'correct', at: 2000, char: 'dog', latencyMs: 600 },    // 3 correct
        { type: 'incorrect', at: 3000, expected: 'fish', got: 'wish' }, // 4 incorrect
        { type: 'sessionEnd', at: 5000 },
      ];

      const stats = calculator.calculateStats(events, createHeadCopyConfig());

      // 6 correct, 4 incorrect = 6/10 = 60% accuracy
      expect(stats.correctCount).toBe(6);
      expect(stats.incorrectCount).toBe(4);
      expect(stats.overallAccuracy).toBeCloseTo(60.0, 1);
    });
  });
});
