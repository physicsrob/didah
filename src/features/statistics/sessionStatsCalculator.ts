/**
 * Session Statistics Calculator
 *
 * Calculates comprehensive statistics from session event logs.
 * This is a pure calculation service with no side effects.
 */

import type { SessionStatistics, CharacterStatistics } from '../../core/types/statistics';
import type { SessionConfig } from '../../core/types/domain';
import type { LogEvent } from '../session/runtime/io';
import { getActiveWindowMs } from '../../core/morse/timing';

export class SessionStatsCalculator {
  /**
   * Calculate complete statistics from a session's event log
   */
  calculateStats(events: LogEvent[], config: SessionConfig): SessionStatistics {
    const sessionStart = events.find(e => e.type === 'sessionStart');
    const sessionEnd = events.find(e => e.type === 'sessionEnd');

    // Initialize counters and maps
    const characterStats = new Map<string, CharacterStatistics>();
    const confusionMatrix = new Map<string, Map<string, number>>();
    const recognitionTimes: number[] = [];

    let correctCount = 0;
    let incorrectCount = 0;
    let timeoutCount = 0;

    // Process each event
    for (const event of events) {
      switch (event.type) {
        case 'correct':
          correctCount++;
          recognitionTimes.push(event.latencyMs);
          this.updateCharacterStats(characterStats, event.char, 'correct', event.latencyMs);
          break;
        case 'incorrect':
          incorrectCount++;
          this.updateCharacterStats(characterStats, event.expected, 'incorrect');
          this.updateConfusionMatrix(confusionMatrix, event.expected, event.got);
          break;
        case 'timeout':
          timeoutCount++;
          this.updateCharacterStats(characterStats, event.char, 'timeout');
          break;
      }
    }

    // Finalize per-character statistics
    for (const stats of characterStats.values()) {
      this.finalizeCharacterStats(stats);
    }

    // Calculate aggregates
    const totalCharacters = correctCount + incorrectCount + timeoutCount;
    const overallAccuracy = totalCharacters > 0 ? (correctCount / totalCharacters) * 100 : 0;
    const meanRecognitionTimeMs = this.calculateMean(recognitionTimes);
    const medianRecognitionTimeMs = this.calculateMedian(recognitionTimes);
    const effectiveWpm = this.calculateEffectiveWpm(
      correctCount,
      totalCharacters,
      meanRecognitionTimeMs,
      config.wpm,
      config.speedTier
    );

    return {
      startedAt: sessionStart?.at || 0,
      endedAt: sessionEnd?.at || 0,
      durationMs: (sessionEnd?.at || 0) - (sessionStart?.at || 0),
      config: {
        mode: config.mode,
        wpm: config.wpm,
        speedTier: config.speedTier,
        sourceId: config.sourceId,
        replay: config.replay,
        feedback: config.feedback,
      },
      overallAccuracy,
      effectiveWpm,
      totalCharacters,
      correctCount,
      incorrectCount,
      timeoutCount,
      characterStats,
      confusionMatrix,
      meanRecognitionTimeMs,
      medianRecognitionTimeMs,
    };
  }

  /**
   * Update per-character statistics for a single event
   */
  private updateCharacterStats(
    characterStats: Map<string, CharacterStatistics>,
    char: string,
    outcome: 'correct' | 'incorrect' | 'timeout',
    latencyMs?: number
  ): void {
    if (!characterStats.has(char)) {
      characterStats.set(char, {
        char,
        attempts: 0,
        correct: 0,
        incorrect: 0,
        timeout: 0,
        accuracy: 0,
        recognitionTimes: [],
        meanRecognitionTimeMs: 0,
        medianRecognitionTimeMs: 0,
      });
    }

    const stats = characterStats.get(char)!;
    stats.attempts++;

    switch (outcome) {
      case 'correct':
        stats.correct++;
        if (latencyMs !== undefined) {
          stats.recognitionTimes.push(latencyMs);
        }
        break;
      case 'incorrect':
        stats.incorrect++;
        break;
      case 'timeout':
        stats.timeout++;
        break;
    }
  }

  /**
   * Calculate final statistics for a character after all events are processed
   */
  private finalizeCharacterStats(stats: CharacterStatistics): void {
    // Calculate accuracy
    stats.accuracy = stats.attempts > 0 ? (stats.correct / stats.attempts) * 100 : 0;

    // Calculate timing statistics
    if (stats.recognitionTimes.length > 0) {
      stats.meanRecognitionTimeMs = this.calculateMean(stats.recognitionTimes);
      stats.medianRecognitionTimeMs = this.calculateMedian(stats.recognitionTimes);
    }
  }

  /**
   * Update confusion matrix for incorrect responses
   */
  private updateConfusionMatrix(
    matrix: Map<string, Map<string, number>>,
    expected: string,
    got: string
  ): void {
    if (!matrix.has(expected)) {
      matrix.set(expected, new Map());
    }

    const confusions = matrix.get(expected)!;
    confusions.set(got, (confusions.get(got) || 0) + 1);
  }

  /**
   * Calculate effective WPM based on accuracy and recognition speed
   */
  private calculateEffectiveWpm(
    correctCount: number,
    totalCount: number,
    meanRecognitionTimeMs: number,
    configWpm: number,
    speedTier: string
  ): number {
    if (totalCount === 0) return 0;

    // Base accuracy factor
    const accuracy = correctCount / totalCount;

    // For modes that don't have recognition windows (listen, live-copy),
    // effective WPM is just accuracy * configured WPM
    if (speedTier === 'listen' || speedTier === 'live-copy') {
      return Math.round(configWpm * accuracy);
    }

    // For practice mode, factor in recognition speed
    const expectedTimeMs = getActiveWindowMs(speedTier as any);

    // Time efficiency factor (capped at 1.0 for faster than expected)
    // If no successful recognitions, use 0 efficiency
    const timeEfficiency = meanRecognitionTimeMs > 0
      ? Math.min(1.0, expectedTimeMs / meanRecognitionTimeMs)
      : 0;

    // Combine factors
    const effectiveFactor = accuracy * timeEfficiency;

    // Apply to configured WPM
    return Math.round(configWpm * effectiveFactor);
  }

  /**
   * Calculate mean of an array of numbers
   */
  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculate median of an array of numbers
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      // Even number of values, take average of two middle values
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      // Odd number of values, take the middle value
      return sorted[middle];
    }
  }
}