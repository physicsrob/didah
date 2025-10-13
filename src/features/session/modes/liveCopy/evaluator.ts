/**
 * Live Copy Mode - Evaluation Logic
 *
 * Compares transmitted morse code with user's transcription to generate
 * statistics and diff visualization.
 */

import { diffChars, type Change } from 'diff';
import type { LogEvent } from '../../runtime/io';

/**
 * Diff segment for visualization
 * Represents how each character in the typed string should be displayed
 */
export type DiffSegment = {
  type: 'correct' | 'incorrect' | 'extra' | 'missed';
  char: string;
  expectedChar?: string; // For 'incorrect' type - shows what should have been typed
};

/**
 * Evaluation metrics for Live Copy session
 */
export type EvaluationMetrics = {
  transmitted: string;
  typed: string;
  accuracy: number;          // Percentage (0-100)
  correctCount: number;      // Characters correctly copied
  incorrectCount: number;    // Characters missed or wrong
  extraCount: number;        // Characters added that weren't transmitted
};

/**
 * Complete evaluation result
 */
export type EvaluationResult = {
  events: LogEvent[];           // For stats calculator
  diffSegments: DiffSegment[];  // For visualization
  metrics: EvaluationMetrics;   // Summary stats
};

/**
 * Evaluate Live Copy session by comparing transmitted and typed strings
 *
 * Uses character-level diff to identify:
 * - Correct copies (in both, same position after alignment)
 * - Incorrect/missed (in transmitted, not in typed or wrong)
 * - Extra (in typed, not in transmitted)
 *
 * @param transmitted - String of characters that were transmitted
 * @param typed - String of characters the user typed
 * @param emissionEvents - LogEvents to extract timestamps from
 * @returns Evaluation result with events, diff segments, and metrics
 */
export function evaluateLiveCopy(
  transmitted: string,
  typed: string,
  emissionEvents: LogEvent[]
): EvaluationResult {
  // Build timestamp map from emission events
  const emissionTimestamps = new Map<number, number>();
  let emissionIndex = 0;
  for (const event of emissionEvents) {
    if (event.type === 'emission') {
      emissionTimestamps.set(emissionIndex, event.at);
      emissionIndex++;
    }
  }

  // Get character-level diff
  const diffParts: Change[] = diffChars(transmitted, typed);

  const diffSegments: DiffSegment[] = [];
  const events: LogEvent[] = [];

  let transmittedIndex = 0;

  // Process diff parts to build segments and events
  for (let i = 0; i < diffParts.length; i++) {
    const part = diffParts[i];

    if (part.added) {
      // Extra characters typed by user (not in transmitted)
      for (const char of part.value) {
        diffSegments.push({ type: 'extra', char });
      }
    } else if (part.removed) {
      // Check if next part is an addition (potential substitution)
      const nextPart = i + 1 < diffParts.length ? diffParts[i + 1] : null;
      const isSubstitution = nextPart?.added && part.value.length === nextPart.value.length;

      for (let j = 0; j < part.value.length; j++) {
        const expectedChar = part.value[j];
        const timestamp = emissionTimestamps.get(transmittedIndex) || Date.now();

        if (isSubstitution && nextPart) {
          // Substitution: character was typed but wrong
          // Show both the incorrect character (strikethrough) and the correct one
          const gotChar = nextPart.value[j];
          diffSegments.push({ type: 'incorrect', char: gotChar, expectedChar });
          diffSegments.push({ type: 'missed', char: expectedChar });
          events.push({
            type: 'incorrect',
            at: timestamp,
            expected: expectedChar,
            got: gotChar
          });
        } else {
          // Pure deletion: character was missed entirely (not typed at all)
          diffSegments.push({ type: 'missed', char: expectedChar });
          events.push({
            type: 'incorrect',
            at: timestamp,
            expected: expectedChar,
            got: '' // Missed - nothing typed
          });
        }

        transmittedIndex++;
      }

      // Skip next part if it was a substitution
      if (isSubstitution) {
        i++;
      }
    } else {
      // Equal: characters match
      for (const char of part.value) {
        diffSegments.push({ type: 'correct', char });
        const timestamp = emissionTimestamps.get(transmittedIndex) || Date.now();
        events.push({
          type: 'correct',
          at: timestamp,
          char,
          latencyMs: 0 // Live Copy doesn't track real-time latency
        });
        transmittedIndex++;
      }
    }
  }

  // Calculate metrics
  const correctCount = events.filter(e => e.type === 'correct').length;
  const incorrectCount = events.filter(e => e.type === 'incorrect').length;
  const extraCount = diffSegments.filter(s => s.type === 'extra').length;
  const totalTransmitted = transmitted.length;
  const accuracy = totalTransmitted > 0 ? (correctCount / totalTransmitted) * 100 : 0;

  return {
    events,
    diffSegments,
    metrics: {
      transmitted,
      typed,
      accuracy,
      correctCount,
      incorrectCount,
      extraCount
    }
  };
}
