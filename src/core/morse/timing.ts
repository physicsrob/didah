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
 * Returns constant milliseconds (not affected by WPM):
 * - slow: 2000ms
 * - medium: 1000ms
 * - fast: 500ms
 * - lightning: 300ms
 */
export function getActiveWindowMs(speedTier: SpeedTier): number {
  const windows = {
    slow: 2000,
    medium: 1000,
    fast: 500,
    lightning: 300,
  } as const;

  return windows[speedTier];
}

/**
 * Get standard inter-character spacing for modes that simulate real Morse transmission.
 * Used by Listen and Live Copy modes. NOT used by Practice mode.
 *
 * Practice mode does not use this - it has its own timing based on recognition windows
 * and user input, not Morse transmission standards.
 *
 * @param wpm - Words per minute
 * @returns Inter-character spacing in milliseconds (3 dits per Morse standard)
 */
export function getInterCharacterSpacingMs(wpm: number): number {
  const ditMs = wpmToDitMs(wpm);
  return ditMs * MORSE_SPACING.symbol; // 3 dits
}

/**
 * Calculate Farnsworth inter-character spacing
 * When characterWpm > farnsworthWpm, extends spacing to slow down overall rate
 * When characterWpm = farnsworthWpm, returns standard 3-dit spacing
 *
 * Uses the ARRL Farnsworth formula:
 * Total character time = (60 / (W × 5)) seconds
 * Inter-character spacing = Total time - Character duration - Standard spacing
 * Where W = farnsworth WPM
 */
export function calculateFarnsworthSpacingMs(characterWpm: number, farnsworthWpm: number): number {
  if (characterWpm <= 0 || farnsworthWpm <= 0) {
    throw new Error("WPM values must be positive");
  }

  if (farnsworthWpm > characterWpm) {
    throw new Error("Farnsworth WPM cannot exceed character WPM");
  }

  // When speeds are equal, use standard spacing
  if (characterWpm === farnsworthWpm) {
    return getInterCharacterSpacingMs(characterWpm);
  }

  // ARRL Farnsworth formula:
  // Total time per character at farnsworth speed (including all spacing)
  const totalTimePerCharMs = (60 / (farnsworthWpm * 5)) * 1000; // Convert to ms

  // Average character duration at character speed (assuming 10 units per average character)
  // Standard word "PARIS" = 50 units, 5 chars = 10 units average
  const avgCharDurationMs = (10 * wpmToDitMs(characterWpm));

  // Inter-character spacing = Total time - Character duration
  const spacingMs = totalTimePerCharMs - avgCharDurationMs;

  // Ensure minimum standard spacing (3 dits)
  const minSpacingMs = getInterCharacterSpacingMs(characterWpm);
  return Math.max(spacingMs, minSpacingMs);
}

/**
 * Calculate timing for Listen mode character reveal
 * Uses Farnsworth spacing when farnsworthWpm < characterWpm
 * Falls back to standard spacing when speeds are equal
 * Split as 66% before reveal, 34% after reveal
 */
export function getListenModeTimingMs(characterWpm: number, farnsworthWpm: number): {
  preRevealDelayMs: number;
  postRevealDelayMs: number;
} {
  const totalSpacingMs = calculateFarnsworthSpacingMs(characterWpm, farnsworthWpm);

  return {
    preRevealDelayMs: Math.round(0.66 * totalSpacingMs),
    postRevealDelayMs: Math.round(0.34 * totalSpacingMs),
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
 * @param char The character to calculate duration for
 * @param wpm Words per minute
 * @param extraWordSpacing Additional space characters worth of time to add to word spacing (0-5)
 */
export function calculateCharacterDurationMs(char: string, wpm: number, extraWordSpacing: number): number {
  // Handle space character (4 dits of silence + extra word spacing)
  // Each extra space adds 7 dits (the standard inter-word spacing)
  if (char === ' ') {
    const ditMs = wpmToDitMs(wpm);
    return ditMs * (4 + (extraWordSpacing * 7));
  }

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