/**
 * Morse Code Timing Engine
 *
 * Handles all timing calculations for Morse code based on WPM and speed tiers.
 * Uses the standard formula: dit length = 1200 / WPM ms
 */

import { getMorsePattern } from './alphabet.js';

export type SpeedTier = "slow" | "medium" | "fast" | "lightning";

/**
 * Calculate dit length in milliseconds from WPM
 * Standard CW formula: dit = 1200 / WPM
 */
export function wpmToDitMs(wpm: number): number {
  if (wpm <= 0) {
    throw new Error("WPM must be positive");
  }
  return 1200 / wpm;
}

/**
 * Get the recognition window duration for Active mode based on speed tier
 * Returns multiplier of dit length per spec:
 * - slow: 5x dit
 * - medium: 3x dit
 * - fast: 2x dit
 * - lightning: 1x dit
 */
export function getActiveWindowMultiplier(speedTier: SpeedTier): number {
  const multipliers = {
    slow: 5,
    medium: 3,
    fast: 2,
    lightning: 1,
  } as const;

  return multipliers[speedTier];
}

/**
 * Get the timing configuration for Passive mode based on speed tier
 * Returns { preRevealDits, postRevealDits } per spec:
 * - slow: 3 dits → reveal → 3 dits
 * - medium: 3 dits → reveal → 2 dits
 * - fast: 2 dits → reveal → 1 dit
 */
export function getPassiveTimingMultipliers(speedTier: SpeedTier): {
  preRevealDits: number;
  postRevealDits: number;
} {
  const timings = {
    slow: { preRevealDits: 3, postRevealDits: 3 },
    medium: { preRevealDits: 3, postRevealDits: 2 },
    fast: { preRevealDits: 2, postRevealDits: 1 },
    lightning: { preRevealDits: 2, postRevealDits: 1 }, // lightning not in spec, use fast
  } as const;

  return timings[speedTier];
}

/**
 * Calculate the recognition window duration in milliseconds for Active mode
 */
export function getActiveWindowMs(wpm: number, speedTier: SpeedTier): number {
  const ditMs = wpmToDitMs(wpm);
  const multiplier = getActiveWindowMultiplier(speedTier);
  return ditMs * multiplier;
}

/**
 * Calculate the pre and post reveal delays in milliseconds for Passive mode
 */
export function getPassiveTimingMs(wpm: number, speedTier: SpeedTier): {
  preRevealMs: number;
  postRevealMs: number;
} {
  const ditMs = wpmToDitMs(wpm);
  const { preRevealDits, postRevealDits } = getPassiveTimingMultipliers(speedTier);

  return {
    preRevealMs: ditMs * preRevealDits,
    postRevealMs: ditMs * postRevealDits,
  };
}

/**
 * Standard Morse code spacing multipliers
 * - intraSymbol: spacing between dits/dahs within a character (1 dit)
 * - symbol: spacing between characters (3 dits)
 * - word: spacing between words (7 dits)
 */
export const MORSE_SPACING = {
  intraSymbol: 1,
  symbol: 3,
  word: 7,
} as const;

/**
 * Calculate spacing durations in milliseconds
 */
export function getSpacingMs(wpm: number) {
  const ditMs = wpmToDitMs(wpm);

  return {
    intraSymbolMs: ditMs * MORSE_SPACING.intraSymbol,
    symbolMs: ditMs * MORSE_SPACING.symbol,
    wordMs: ditMs * MORSE_SPACING.word,
  };
}

/**
 * Calculate the total duration in milliseconds for playing a character's Morse pattern
 * Includes the time for all dits/dahs plus intra-symbol spacing
 */
export function calculateCharacterDurationMs(char: string, wpm: number): number {
  const pattern = getMorsePattern(char);
  if (!pattern) {
    return 0; // Unknown characters have no duration
  }

  const ditMs = wpmToDitMs(wpm);
  let totalMs = 0;

  // Add duration for each element (dit or dah)
  for (const element of pattern) {
    totalMs += element === '.' ? ditMs : ditMs * 3; // dah = 3 dits
  }

  // Add intra-symbol spacing between elements (1 dit between each element)
  if (pattern.length > 1) {
    totalMs += ditMs * (pattern.length - 1);
  }

  return totalMs;
}