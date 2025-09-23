/**
 * Timing test helpers to reduce magic numbers and improve maintainability
 */

import { wpmToDitMs, calculateCharacterDurationMs, getListenModeTimingMs } from '../../../../core/morse/timing';

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

  // Listen mode delays (now using standard 3-dit spacing)
  // Note: speedTier is no longer used for Listen mode timing
  listen: {
    preReveal: Math.round(0.66 * TEST_DIT_MS * 3), // ~119ms for 20 WPM
    postReveal: Math.round(0.34 * TEST_DIT_MS * 3) // ~61ms for 20 WPM
  }
} as const;

/**
 * Helper to calculate character duration with timeout for a speed tier
 */
export function getCharTimeout(char: string, speedTier: keyof typeof TestTiming.windows, wpm = TEST_WPM): number {
  return calculateCharacterDurationMs(char, wpm) + TestTiming.windows[speedTier];
}

/**
 * Helper to create a timing sequence for listen mode
 * Note: speedTier is ignored as Listen mode now uses standard 3-dit spacing
 */
export function getListenSequence(char: string, wpm = TEST_WPM) {
  const charDuration = calculateCharacterDurationMs(char, wpm);
  const delays = getListenModeTimingMs(wpm);

  return {
    playChar: charDuration,
    preReveal: delays.preRevealDelayMs,
    postReveal: delays.postRevealDelayMs,
    total: charDuration + delays.preRevealDelayMs + delays.postRevealDelayMs
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