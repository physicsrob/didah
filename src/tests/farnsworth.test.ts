import { describe, it, expect } from 'vitest';
import {
  calculateFarnsworthSpacingMs,
  getListenModeTimingMs,
  getInterCharacterSpacingMs,
  wpmToDitMs
} from '../core/morse/timing';

describe('Farnsworth Spacing', () => {
  describe('calculateFarnsworthSpacingMs', () => {
    it('returns standard spacing when character and effective WPM are equal', () => {
      const standardSpacing = getInterCharacterSpacingMs(20); // 3 dits = 180ms at 20 WPM
      const farnsworthSpacing = calculateFarnsworthSpacingMs(20, 20);

      expect(farnsworthSpacing).toBe(standardSpacing);
      expect(farnsworthSpacing).toBe(180); // 3 dits at 20 WPM
    });

    it('returns standard spacing for multiple WPM values when character and effective are equal', () => {
      const testCases = [5, 10, 15, 20, 25, 30, 35, 40];

      testCases.forEach(wpm => {
        const standardSpacing = getInterCharacterSpacingMs(wpm);
        const farnsworthSpacing = calculateFarnsworthSpacingMs(wpm, wpm);

        expect(farnsworthSpacing).toBe(standardSpacing);
        // Standard spacing is always 3 dits
        expect(farnsworthSpacing).toBe(3 * wpmToDitMs(wpm));
      });
    });

    it('has smooth transition when effective WPM is slightly below character WPM', () => {
      // Small changes in effective WPM should produce small changes in spacing
      // This test would have caught the previous bug where the formula produced
      // massive jumps (600%+) for small WPM differences

      // Test larger differences where we expect to see changes
      const testCases = [
        { char: 20, effective1: 20, effective2: 15 },  // Bigger gap to see change
        { char: 25, effective1: 25, effective2: 20 },
        { char: 30, effective1: 30, effective2: 25 },
        { char: 15, effective1: 15, effective2: 10 },
      ];

      testCases.forEach(({ char, effective1, effective2 }) => {
        const spacing1 = calculateFarnsworthSpacingMs(char, effective1);
        const spacing2 = calculateFarnsworthSpacingMs(char, effective2);

        const difference = spacing2 - spacing1;
        const percentChange = (difference / spacing1) * 100;

        // The change should be reasonable - not 600%+ like the old bug
        expect(percentChange).toBeLessThan(200); // Much more reasonable than 600%+
        expect(percentChange).toBeGreaterThanOrEqual(0); // Should increase or stay same

        // Also check absolute difference is reasonable (not thousands of ms)
        expect(difference).toBeLessThan(500); // Reasonable change, not 1000+ ms
      });
    });

    it('returns extended spacing when effective WPM is lower than character WPM', () => {
      // Character at 20 WPM, effective at 10 WPM
      const spacing = calculateFarnsworthSpacingMs(20, 10);
      const standardSpacing = getInterCharacterSpacingMs(20); // 180ms

      // Farnsworth spacing should be longer than standard
      expect(spacing).toBeGreaterThan(standardSpacing);

      // Using the ARRL formula: Total time = 60/(W×5) seconds
      // For 20/10: Total = 1200ms, Char = 600ms, Spacing = 600ms
      expect(spacing).toBe(600);
    });

    it('calculates correct spacing for common Farnsworth settings', () => {
      // 18/5 setting (common for beginners)
      const spacing18_5 = calculateFarnsworthSpacingMs(18, 5);
      // Total time at 5 WPM = 60/(5×5) = 2400ms per char
      // Char duration at 18 WPM = 10 × (1200/18) = 666.67ms
      // Spacing = 2400 - 666.67 = 1733.33ms
      expect(spacing18_5).toBeCloseTo(1733.33, 0);

      // 20/10 setting (intermediate)
      const spacing20_10 = calculateFarnsworthSpacingMs(20, 10);
      // Total time at 10 WPM = 60/(10×5) = 1200ms per char
      // Char duration at 20 WPM = 10 × 60 = 600ms
      // Spacing = 1200 - 600 = 600ms
      expect(spacing20_10).toBe(600);

      // 25/15 setting (advancing)
      const spacing25_15 = calculateFarnsworthSpacingMs(25, 15);
      // Total time at 15 WPM = 60/(15×5) = 800ms per char
      // Char duration at 25 WPM = 10 × 48 = 480ms
      // Spacing = 800 - 480 = 320ms
      expect(spacing25_15).toBe(320);
    });

    it('throws error for invalid WPM values', () => {
      expect(() => calculateFarnsworthSpacingMs(0, 10)).toThrow('WPM values must be positive');
      expect(() => calculateFarnsworthSpacingMs(20, 0)).toThrow('WPM values must be positive');
      expect(() => calculateFarnsworthSpacingMs(-5, 10)).toThrow('WPM values must be positive');
      expect(() => calculateFarnsworthSpacingMs(20, -5)).toThrow('WPM values must be positive');
    });

    it('throws error when effective WPM exceeds character WPM', () => {
      expect(() => calculateFarnsworthSpacingMs(15, 20)).toThrow('Effective WPM cannot exceed character WPM');
      expect(() => calculateFarnsworthSpacingMs(10, 15)).toThrow('Effective WPM cannot exceed character WPM');
    });
  });

  describe('getListenModeTimingMs with Farnsworth', () => {
    it('uses standard timing when WPM values are equal', () => {
      const timing = getListenModeTimingMs(20, 20);
      const totalDelay = timing.preRevealDelayMs + timing.postRevealDelayMs;

      // Should equal 3 dits at 20 WPM = 180ms
      expect(totalDelay).toBe(180);

      // Check the 66/34 split
      expect(timing.preRevealDelayMs).toBeCloseTo(119, 0); // ~66% of 180
      expect(timing.postRevealDelayMs).toBeCloseTo(61, 0);  // ~34% of 180
    });

    it('uses Farnsworth timing when effective WPM is lower', () => {
      const timing = getListenModeTimingMs(20, 10);
      const totalDelay = timing.preRevealDelayMs + timing.postRevealDelayMs;

      // Should equal Farnsworth spacing: 600ms
      expect(totalDelay).toBe(600);

      // Check the 66/34 split is maintained
      expect(timing.preRevealDelayMs).toBeCloseTo(0.66 * 600, 0);
      expect(timing.postRevealDelayMs).toBeCloseTo(0.34 * 600, 0);
    });

    it('maintains the 66/34 split for all Farnsworth configurations', () => {
      const configs = [
        [18, 5],
        [20, 10],
        [25, 15],
        [30, 25],
      ];

      configs.forEach(([charWpm, effectiveWpm]) => {
        const timing = getListenModeTimingMs(charWpm, effectiveWpm);
        const total = timing.preRevealDelayMs + timing.postRevealDelayMs;

        const preRatio = timing.preRevealDelayMs / total;
        const postRatio = timing.postRevealDelayMs / total;

        // Allow for rounding errors
        expect(preRatio).toBeGreaterThan(0.65);
        expect(preRatio).toBeLessThan(0.67);
        expect(postRatio).toBeGreaterThan(0.33);
        expect(postRatio).toBeLessThan(0.35);
      });
    });
  });

  describe('Farnsworth timing in practice', () => {
    it('provides reasonable timing for beginner settings', () => {
      // Beginner: 18 WPM characters, 5 WPM effective
      const charDitMs = wpmToDitMs(18); // 66.67ms
      const spacing = calculateFarnsworthSpacingMs(18, 5);

      // Character plays at full speed
      expect(charDitMs).toBeCloseTo(66.67, 2);

      // But spacing is longer (not as extreme as old bug)
      expect(spacing).toBeCloseTo(1733.33, 0);

      // This gives learners time to process each character
      // while still hearing them at a realistic speed
    });

    it('gradually reduces spacing as effective WPM approaches character WPM', () => {
      const charWpm = 20;

      // Track how spacing decreases as effective WPM increases
      const spacings = [
        calculateFarnsworthSpacingMs(charWpm, 5),   // Very slow effective
        calculateFarnsworthSpacingMs(charWpm, 10),  // Slow effective
        calculateFarnsworthSpacingMs(charWpm, 15),  // Medium effective
        calculateFarnsworthSpacingMs(charWpm, 18),  // Close to character
        calculateFarnsworthSpacingMs(charWpm, 20),  // Standard (same as character)
      ];

      // Spacing should decrease monotonically or stay the same (due to minimum constraint)
      for (let i = 1; i < spacings.length; i++) {
        expect(spacings[i]).toBeLessThanOrEqual(spacings[i - 1]);
      }

      // Final spacing should be standard 3 dits
      expect(spacings[spacings.length - 1]).toBe(180); // 3 × 60ms

      // When close to character speed, it should hit the minimum (standard spacing)
      expect(spacings[3]).toBe(180); // 20/18 should be at minimum
      expect(spacings[4]).toBe(180); // 20/20 should be standard
    });
  });
});