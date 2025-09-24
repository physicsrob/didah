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

    it('returns extended spacing when effective WPM is lower than character WPM', () => {
      // Character at 20 WPM, effective at 10 WPM
      const spacing = calculateFarnsworthSpacingMs(20, 10);
      const standardSpacing = getInterCharacterSpacingMs(20); // 180ms

      // Farnsworth spacing should be longer than standard
      expect(spacing).toBeGreaterThan(standardSpacing);

      // Using the formula: (60×C - 37.2×W) / (C×W) × 1000
      // (60×20 - 37.2×10) / (20×10) × 1000 = (1200 - 372) / 200 × 1000 = 4140ms
      expect(spacing).toBe(4140);
    });

    it('calculates correct spacing for common Farnsworth settings', () => {
      // 18/5 setting (common for beginners)
      const spacing18_5 = calculateFarnsworthSpacingMs(18, 5);
      // (60×18 - 37.2×5) / (18×5) × 1000 = (1080 - 186) / 90 × 1000 = 9933.33ms
      expect(spacing18_5).toBeCloseTo(9933.33, 0);

      // 20/10 setting (intermediate)
      const spacing20_10 = calculateFarnsworthSpacingMs(20, 10);
      // (60×20 - 37.2×10) / (20×10) × 1000 = 4140ms
      expect(spacing20_10).toBe(4140);

      // 25/15 setting (advancing)
      const spacing25_15 = calculateFarnsworthSpacingMs(25, 15);
      // (60×25 - 37.2×15) / (25×15) × 1000 = (1500 - 558) / 375 × 1000 = 2512ms
      expect(spacing25_15).toBe(2512);
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

      // Should equal Farnsworth spacing: 4140ms
      expect(totalDelay).toBe(4140);

      // Check the 66/34 split is maintained
      expect(timing.preRevealDelayMs).toBeCloseTo(0.66 * 4140, 0);
      expect(timing.postRevealDelayMs).toBeCloseTo(0.34 * 4140, 0);
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

      // But spacing is much longer for beginners
      expect(spacing).toBeCloseTo(9933.33, 0);

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

      // Spacing should decrease monotonically
      for (let i = 1; i < spacings.length; i++) {
        expect(spacings[i]).toBeLessThan(spacings[i - 1]);
      }

      // Final spacing should be standard 3 dits
      expect(spacings[spacings.length - 1]).toBe(180); // 3 × 60ms
    });
  });
});