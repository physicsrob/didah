/**
 * Timing test helpers to reduce magic numbers and improve maintainability
 */

import { wpmToDitMs, calculateCharacterDurationMs } from '../../../../core/morse/timing';

/**
 * Standard test timing configuration
 */
export const TEST_WPM = 20;
export const TEST_DIT_MS = wpmToDitMs(TEST_WPM); // 60ms

/**
 * Pre-calculated timing values for common test scenarios
 */
export const TestTiming = {
  // Basic units
  dit: TEST_DIT_MS,
  dah: TEST_DIT_MS * 3,

  // Spacing
  intraSymbol: TEST_DIT_MS,
  interChar: TEST_DIT_MS * 3,
  word: TEST_DIT_MS * 7,

  // Active mode windows (fixed values)
  windows: {
    slow: 2000,
    medium: 1000,
    fast: 500,
    lightning: 300
  },

  // Passive mode delays
  passive: {
    slow: { preReveal: TEST_DIT_MS * 3, postReveal: TEST_DIT_MS * 3 },
    medium: { preReveal: TEST_DIT_MS * 3, postReveal: TEST_DIT_MS * 2 },
    fast: { preReveal: TEST_DIT_MS * 2, postReveal: TEST_DIT_MS },
    lightning: { preReveal: TEST_DIT_MS * 2, postReveal: TEST_DIT_MS }
  }
} as const;

/**
 * Helper to calculate character duration with timeout for a speed tier
 */
export function getCharTimeout(char: string, speedTier: keyof typeof TestTiming.windows, wpm = TEST_WPM): number {
  return calculateCharacterDurationMs(char, wpm) + TestTiming.windows[speedTier];
}

/**
 * Helper to create a timing sequence for passive mode
 */
export function getPassiveSequence(char: string, speedTier: keyof typeof TestTiming.passive, wpm = TEST_WPM) {
  const charDuration = calculateCharacterDurationMs(char, wpm);
  const delays = TestTiming.passive[speedTier];

  return {
    playChar: charDuration,
    preReveal: delays.preReveal,
    postReveal: delays.postReveal,
    total: charDuration + delays.preReveal + delays.postReveal
  };
}

/**
 * Helper to create expected timing events for verification
 */
export function createTimingExpectations(startTime: number, events: Array<{ name: string; duration: number }>) {
  let currentTime = startTime;
  const expectations: Array<{ name: string; time: number; duration: number }> = [];

  for (const event of events) {
    expectations.push({
      name: event.name,
      time: currentTime,
      duration: event.duration
    });
    currentTime += event.duration;
  }

  return {
    expectations,
    totalDuration: currentTime - startTime
  };
}