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
  effectiveWpm: 20,
  speedTier: 'medium',
  sourceId: 'random_letters',
  sourceName: 'Random Letters',
  replay: false,
  feedback: 'flash',
  effectiveAlphabet: ['A', 'B', 'C'],
  extraWordSpacing: 0,
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
      expect(stats.effectiveWpm).toBe(0);
    });
  });
});
