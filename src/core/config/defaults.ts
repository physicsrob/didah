/**
 * Default Configuration Values
 *
 * Central source of truth for all default configuration values
 * used throughout the application.
 */

import type { SessionConfig } from '../types/domain';

/**
 * Default WPM (Words Per Minute) for Morse code practice
 * Set to moderate speed for learning
 */
export const DEFAULT_WPM = 15;

/**
 * Default session configuration used when starting a new practice session
 */
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  mode: 'active',
  speedTier: 'slow',
  sourceId: 'randomLetters',
  feedback: 'both',
  replay: true,
  effectiveAlphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,?/='.split(''),
  wpm: DEFAULT_WPM,
  lengthMs: 60000, // 1 minute
};

/**
 * Audio engine default configuration
 */
export const DEFAULT_AUDIO_CONFIG = {
  frequency: 700, // Hz - standard CW tone frequency
  volume: 0.2,    // 20% volume - comfortable listening level
};

/**
 * Timing constants
 */
export const TIMING_CONSTANTS = {
  /** Standard CW timing formula constant: dit_ms = 1200 / wpm */
  WPM_FORMULA_CONSTANT: 1200,

  /** Minimum input window duration in milliseconds */
  MIN_WINDOW_MS: 60,

  /** Inter-character spacing in dit units (Morse standard) */
  INTER_CHAR_SPACING_DITS: 3,

  /** Intra-symbol spacing in dit units */
  INTRA_SYMBOL_SPACING_DITS: 1,

  /** Dah length in dit units */
  DAH_LENGTH_DITS: 3,
};

/**
 * Audio envelope configuration for smooth tones
 */
export const AUDIO_ENVELOPE = {
  attackTime: 0.01,   // 10ms attack
  sustainLevel: 1.0,  // Full volume during sustain
  releaseTime: 0.02,  // 20ms release
};