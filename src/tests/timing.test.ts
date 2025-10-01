import { describe, it, expect } from 'vitest';
import {
  wpmToDitMs,
  getActiveWindowMs,
  getListenModeTimingMs,
  getSpacingMs,
  calculateCharacterDurationMs,
  MORSE_SPACING,
} from '../core/morse/timing';
import { TestTiming } from '../features/session/runtime/__tests__/timingTestHelpers';

describe('Morse Timing Engine', () => {
  describe('wpmToDitMs', () => {
    it('calculates correct dit length for standard WPM values', () => {
      expect(wpmToDitMs(20)).toBe(60); // 1200 / 20 = 60ms
      expect(wpmToDitMs(25)).toBe(48); // 1200 / 25 = 48ms
      expect(wpmToDitMs(30)).toBe(40); // 1200 / 30 = 40ms
    });

    it('throws error for invalid WPM', () => {
      expect(() => wpmToDitMs(0)).toThrow('WPM must be positive');
      expect(() => wpmToDitMs(-5)).toThrow('WPM must be positive');
    });
  });


  describe('getActiveWindowMs', () => {
    it('returns constant window duration regardless of WPM', () => {
      // Windows are now constant, not based on WPM
      expect(getActiveWindowMs('slow')).toBe(TestTiming.windows.slow);
      expect(getActiveWindowMs('medium')).toBe(TestTiming.windows.medium);
      expect(getActiveWindowMs('fast')).toBe(TestTiming.windows.fast);
      expect(getActiveWindowMs('lightning')).toBe(TestTiming.windows.lightning);

      // WPM parameter was removed - window is purely based on speed tier
      expect(getActiveWindowMs('slow')).toBe(TestTiming.windows.slow);
      expect(getActiveWindowMs('medium')).toBe(TestTiming.windows.medium);
      expect(getActiveWindowMs('fast')).toBe(TestTiming.windows.fast);
    });
  });

  describe('getListenModeTimingMs', () => {
    it('returns standard 3-dit spacing split approximately 66/34', () => {
      // Test at different WPM values
      const testCases = [10, 20, 30, 40];

      testCases.forEach(wpm => {
        const ditMs = wpmToDitMs(wpm);
        const expectedTotal = ditMs * 3; // Standard 3-dit spacing

        const timing = getListenModeTimingMs(wpm, wpm);  // Standard timing (same wpm for both)
        const actualTotal = timing.preRevealDelayMs + timing.postRevealDelayMs;

        // Total should equal 3 dits (allowing for rounding)
        expect(actualTotal).toBeGreaterThanOrEqual(expectedTotal - 1);
        expect(actualTotal).toBeLessThanOrEqual(expectedTotal + 1);

        // Pre-reveal should be roughly 66% of total
        const preRevealRatio = timing.preRevealDelayMs / actualTotal;
        expect(preRevealRatio).toBeGreaterThan(0.6);
        expect(preRevealRatio).toBeLessThan(0.7);

        // Post-reveal should be roughly 34% of total
        const postRevealRatio = timing.postRevealDelayMs / actualTotal;
        expect(postRevealRatio).toBeGreaterThan(0.3);
        expect(postRevealRatio).toBeLessThan(0.4);
      });
    });
  });

  describe('getSpacingMs', () => {
    it('calculates correct spacing durations', () => {
      // 20 WPM = 60ms dit
      const spacing = getSpacingMs(20);
      expect(spacing.intraSymbolMs).toBe(60); // 60 * 1
      expect(spacing.symbolMs).toBe(180); // 60 * 3
      expect(spacing.wordMs).toBe(420); // 60 * 7
    });
  });

  describe('MORSE_SPACING constants', () => {
    it('has correct standard spacing values', () => {
      expect(MORSE_SPACING.intraSymbol).toBe(1);
      expect(MORSE_SPACING.symbol).toBe(3);
      expect(MORSE_SPACING.word).toBe(7);
    });
  });

  describe('calculateCharacterDurationMs', () => {
    it('calculates correct duration for single element characters', () => {
      // E = . (1 dit, no intra-symbol spacing)
      expect(calculateCharacterDurationMs('E', 20, 0)).toBe(60); // 60ms dit
      expect(calculateCharacterDurationMs('e', 20, 0)).toBe(60); // case insensitive

      // T = - (3 dits, no intra-symbol spacing)
      expect(calculateCharacterDurationMs('T', 20, 0)).toBe(180); // 3 * 60ms
    });

    it('calculates correct duration for multi-element characters', () => {
      // A = .- (1 dit + 1 spacing + 3 dits = 5 dits total)
      expect(calculateCharacterDurationMs('A', 20, 0)).toBe(300); // 5 * 60ms

      // N = -. (3 dits + 1 spacing + 1 dit = 5 dits total)
      expect(calculateCharacterDurationMs('N', 20, 0)).toBe(300); // 5 * 60ms

      // C = -.-. (3 + 1 + 1 + 1 + 3 + 1 + 1 = 11 dits total)
      expect(calculateCharacterDurationMs('C', 20, 0)).toBe(660); // 11 * 60ms
    });

    it('calculates correct duration for numbers', () => {
      // 5 = ..... (5 dits + 4 spacing = 9 dits total)
      expect(calculateCharacterDurationMs('5', 20, 0)).toBe(540); // 9 * 60ms

      // 0 = ----- (15 dits + 4 spacing = 19 dits total)
      expect(calculateCharacterDurationMs('0', 20, 0)).toBe(1140); // 19 * 60ms
    });

    it('scales correctly with different WPM values', () => {
      // Same character should scale proportionally
      expect(calculateCharacterDurationMs('A', 10, 0)).toBe(600); // 5 * 120ms (120ms dit at 10 WPM)
      expect(calculateCharacterDurationMs('A', 40, 0)).toBe(150); // 5 * 30ms (30ms dit at 40 WPM)
    });

    it('returns 0 for unknown characters', () => {
      expect(calculateCharacterDurationMs('$', 20, 0)).toBe(0);
      expect(calculateCharacterDurationMs('', 20, 0)).toBe(0);
      expect(calculateCharacterDurationMs('未知', 20, 0)).toBe(0);
    });

    it('handles punctuation correctly', () => {
      // . = .-.-.- (1+1+3+1+1+1+3+1+1+1+3 = 17 dits total)
      expect(calculateCharacterDurationMs('.', 20, 0)).toBe(1020); // 17 * 60ms

      // , = --..-- (3+1+3+1+1+1+1+1+3+1+3 = 19 dits total)
      expect(calculateCharacterDurationMs(',', 20, 0)).toBe(1140); // 19 * 60ms
    });
  });

  describe('integration scenarios', () => {
    it('produces reasonable timings for typical session configurations', () => {
      const wpm = 25; // Common learning speed
      wpmToDitMs(wpm); // 48ms

      // Active mode at medium speed should give reasonable recognition window
      const windowMs = getActiveWindowMs('medium');
      expect(windowMs).toBe(TestTiming.windows.medium); // Constant window for medium speed

      // Listen mode timing uses standard 3-dit spacing
      const listenTiming = getListenModeTimingMs(wpm, wpm);  // Standard timing
      const totalDelay = listenTiming.preRevealDelayMs + listenTiming.postRevealDelayMs;
      expect(totalDelay).toBeCloseTo(144, 0); // Total should be 3 dits (48ms * 3)
    });

    it('character durations are consistent with audio engine expectations', () => {
      const wpm = 20;
      const ditMs = wpmToDitMs(wpm); // 60ms

      // Verify that our calculated durations match what AudioEngine would produce
      // E should take 1 dit (no spacing needed for single element)
      expect(calculateCharacterDurationMs('E', wpm, 0)).toBe(ditMs);

      // A should take dit + spacing + dah = 1 + 1 + 3 = 5 dits
      expect(calculateCharacterDurationMs('A', wpm, 0)).toBe(5 * ditMs);

      // These durations should be what the scheduler uses for accurate timing
    });
  });
});