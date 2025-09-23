/**
 * Session Statistics Types
 *
 * Types for calculating and storing session statistics.
 * These are generated at the end of each session from the event log.
 */

import type { SpeedTier } from '../morse/timing';

/**
 * Complete statistics for a single practice session
 */
export type SessionStatistics = {
  // Session Metadata
  startedAt: number;
  endedAt: number;
  durationMs: number;
  config: {
    mode: "practice" | "listen" | "live-copy";
    wpm: number;
    speedTier: SpeedTier;
    sourceId: string;
    replay: boolean;
    feedback: "buzzer" | "flash" | "both";
  };

  // Overall Metrics
  overallAccuracy: number;        // 0-100 percentage
  effectiveWpm: number;           // Adjusted for accuracy and timing
  totalCharacters: number;
  correctCount: number;
  incorrectCount: number;
  timeoutCount: number;

  // Per-Character Statistics
  characterStats: Map<string, CharacterStatistics>;

  // Confusion Matrix (expected char → what user typed → count)
  confusionMatrix: Map<string, Map<string, number>>;

  // Timing Analysis (only successful recognitions)
  meanRecognitionTimeMs: number;
  medianRecognitionTimeMs: number;
};

/**
 * Statistics for a single character across all its occurrences in a session
 */
export type CharacterStatistics = {
  char: string;
  attempts: number;
  correct: number;
  incorrect: number;
  timeout: number;
  accuracy: number;              // 0-100 percentage
  recognitionTimes: number[];     // All successful recognition times
  meanRecognitionTimeMs: number;
  medianRecognitionTimeMs: number;
};