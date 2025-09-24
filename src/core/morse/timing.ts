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
 * When characterWpm > effectiveWpm, extends spacing to slow down overall rate
 * When characterWpm = effectiveWpm, returns standard 3-dit spacing
 *
 * Formula: (60×C - 37.2×W) / (C×W) × 1000
 * Where C = character WPM, W = effective WPM
 */
export function calculateFarnsworthSpacingMs(characterWpm: number, effectiveWpm: number): number {
  if (characterWpm <= 0 || effectiveWpm <= 0) {
    throw new Error("WPM values must be positive");
  }

  if (effectiveWpm > characterWpm) {
    throw new Error("Effective WPM cannot exceed character WPM");
  }

  // When speeds are equal, use standard spacing
  if (characterWpm === effectiveWpm) {
    return getInterCharacterSpacingMs(characterWpm);
  }

  // Farnsworth formula for inter-character spacing
  const spacingMs = ((60 * characterWpm - 37.2 * effectiveWpm) / (characterWpm * effectiveWpm)) * 1000;
  return Math.max(spacingMs, 0); // Ensure non-negative
}

/**
 * Calculate timing for Listen mode character reveal
 * Uses Farnsworth spacing when effectiveWpm < characterWpm
 * Falls back to standard spacing when speeds are equal
 * Split as 66% before reveal, 34% after reveal
 */
export function getListenModeTimingMs(characterWpm: number, effectiveWpm: number): {
  preRevealDelayMs: number;
  postRevealDelayMs: number;
} {
  const totalSpacingMs = calculateFarnsworthSpacingMs(characterWpm, effectiveWpm);

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
 */
export function calculateCharacterDurationMs(char: string, wpm: number): number {
  // Handle space character (4 dits of silence)
  if (char === ' ') {
    const ditMs = wpmToDitMs(wpm);
    return ditMs * 4;
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