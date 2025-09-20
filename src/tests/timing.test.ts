import { describe, it, expect } from 'vitest';
import {
  wpmToDitMs,
  getActiveWindowMultiplier,
  getPassiveTimingMultipliers,
  getActiveWindowMs,
  getPassiveTimingMs,
  getSpacingMs,
  MORSE_SPACING,
} from '../core/morse/timing';

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

  describe('getActiveWindowMultiplier', () => {
    it('returns correct multipliers for each speed tier', () => {
      expect(getActiveWindowMultiplier('slow')).toBe(5);
      expect(getActiveWindowMultiplier('medium')).toBe(3);
      expect(getActiveWindowMultiplier('fast')).toBe(2);
      expect(getActiveWindowMultiplier('lightning')).toBe(1);
    });
  });

  describe('getPassiveTimingMultipliers', () => {
    it('returns correct timing for each speed tier', () => {
      expect(getPassiveTimingMultipliers('slow')).toEqual({
        preRevealDits: 3,
        postRevealDits: 3,
      });
      expect(getPassiveTimingMultipliers('medium')).toEqual({
        preRevealDits: 3,
        postRevealDits: 2,
      });
      expect(getPassiveTimingMultipliers('fast')).toEqual({
        preRevealDits: 2,
        postRevealDits: 1,
      });
    });
  });

  describe('getActiveWindowMs', () => {
    it('calculates correct window duration for different WPM and speed tiers', () => {
      // 20 WPM = 60ms dit
      expect(getActiveWindowMs(20, 'slow')).toBe(300); // 60 * 5
      expect(getActiveWindowMs(20, 'medium')).toBe(180); // 60 * 3
      expect(getActiveWindowMs(20, 'fast')).toBe(120); // 60 * 2
      expect(getActiveWindowMs(20, 'lightning')).toBe(60); // 60 * 1

      // 25 WPM = 48ms dit
      expect(getActiveWindowMs(25, 'medium')).toBe(144); // 48 * 3
    });
  });

  describe('getPassiveTimingMs', () => {
    it('calculates correct pre/post reveal timings', () => {
      // 20 WPM = 60ms dit
      expect(getPassiveTimingMs(20, 'slow')).toEqual({
        preRevealMs: 180, // 60 * 3
        postRevealMs: 180, // 60 * 3
      });
      expect(getPassiveTimingMs(20, 'medium')).toEqual({
        preRevealMs: 180, // 60 * 3
        postRevealMs: 120, // 60 * 2
      });
      expect(getPassiveTimingMs(20, 'fast')).toEqual({
        preRevealMs: 120, // 60 * 2
        postRevealMs: 60, // 60 * 1
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

  describe('integration scenarios', () => {
    it('produces reasonable timings for typical session configurations', () => {
      const wpm = 25; // Common learning speed
      wpmToDitMs(wpm); // 48ms

      // Active mode at medium speed should give reasonable recognition window
      const windowMs = getActiveWindowMs(wpm, 'medium');
      expect(windowMs).toBe(144); // 48 * 3 = 144ms - reasonable for recognition

      // Passive mode timing should flow naturally
      const passiveTiming = getPassiveTimingMs(wpm, 'medium');
      expect(passiveTiming.preRevealMs).toBe(144); // 3 dits before reveal
      expect(passiveTiming.postRevealMs).toBe(96); // 2 dits after reveal
    });
  });
});