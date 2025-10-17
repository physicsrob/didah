/**
 * Session Statistics Calculator
 *
 * Calculates comprehensive statistics from session event logs.
 * This is a pure calculation service with no side effects.
 * Returns SessionStatisticsWithMaps (frontend uses Maps internally).
 */

import type { SessionStatisticsWithMaps, CharacterStatistics } from '../../core/types/statistics';
import type { SessionConfig } from '../../core/types/domain';
import type { LogEvent } from '../session/runtime/io';

export class SessionStatsCalculator {
  /**
   * Calculate complete statistics from a session's event log
   * Returns Maps for ergonomic frontend use (converted to Record at API boundary)
   */
  calculateStats(events: LogEvent[], config: SessionConfig): SessionStatisticsWithMaps {
    const sessionStart = events.find(e => e.type === 'sessionStart');
    const sessionEnd = events.find(e => e.type === 'sessionEnd');

    console.log('[Stats Debug] Session events:', {
      sessionStart,
      sessionEnd,
      totalEvents: events.length,
      eventTypes: events.map(e => e.type)
    });

    // Validate required events exist
    if (!sessionStart) {
      throw new Error('Cannot calculate statistics: session start event is missing');
    }
    if (!sessionEnd) {
      throw new Error('Cannot calculate statistics: session end event is missing');
    }

    // Initialize counters and maps
    const characterStats = new Map<string, CharacterStatistics>();
    const confusionMatrix = new Map<string, Map<string, number>>();
    const recognitionTimes: number[] = [];

    let correctCount = 0;
    let incorrectCount = 0;
    let timeoutCount = 0;
    let maxLevel: number | undefined = undefined;

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
        case 'levelAdvanced':
          // Track maximum level completed (runner mode)
          if (maxLevel === undefined || event.level > maxLevel) {
            maxLevel = event.level;
          }
          break;
      }
    }

    // Finalize per-character statistics
    for (const stats of characterStats.values()) {
      this.finalizeCharacterStats(stats);
    }

    // Calculate aggregates
    const totalCharacters = correctCount + incorrectCount + timeoutCount;
    const actualAttempts = correctCount + incorrectCount;  // Exclude timeouts
    const overallAccuracy = actualAttempts > 0 ? (correctCount / actualAttempts) * 100 : 0;
    const timeoutPercentage = totalCharacters > 0 ? (timeoutCount / totalCharacters) * 100 : 0;
    const meanRecognitionTimeMs = this.calculateMean(recognitionTimes);
    const medianRecognitionTimeMs = this.calculateMedian(recognitionTimes);

    // Use session duration for effective WPM calculation
    const durationMs = sessionEnd.at - sessionStart.at;

    console.log('[Stats Debug] Duration calculation:', {
      startTime: sessionStart.at,
      endTime: sessionEnd.at,
      durationMs,
      durationSeconds: durationMs / 1000,
      correctCount,
      totalCharacters: totalCharacters
    });

    const achievedWpm = this.calculateAchievedWpm(
      correctCount,
      incorrectCount,
      durationMs,
      config.mode
    );

    const baseStats = {
      startedAt: sessionStart.at,
      endedAt: sessionEnd.at,
      durationMs: sessionEnd.at - sessionStart.at,
      config: {
        mode: config.mode,
        lengthMs: config.lengthMs,
        wpm: config.wpm,
        speedTier: config.speedTier,
        sourceId: config.sourceId,
        sourceName: config.sourceName,
        replay: config.replay,
        feedback: config.feedback,
        effectiveAlphabet: config.effectiveAlphabet,
      },
      overallAccuracy,
      timeoutPercentage,
      achievedWpm,
      totalCharacters,
      correctCount,
      incorrectCount,
      timeoutCount,
      characterStats,
      confusionMatrix,
      meanRecognitionTimeMs,
      medianRecognitionTimeMs,
    };

    // Add maxLevel if present (runner mode)
    if (maxLevel !== undefined) {
      return { ...baseStats, maxLevel };
    }

    return baseStats;
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
   * Calculate achieved WPM based on net correct characters:
   * Achieved WPM = ((Correct characters - Incorrect characters) / Time in seconds) * 12
   *
   * Timeouts are not included in the numerator - they naturally slow you down
   * by increasing time without adding characters.
   */
  private calculateAchievedWpm(
    correctCount: number,
    incorrectCount: number,
    sessionDurationMs: number,
    mode: string
  ): number {
    // For listen mode, achieved WPM doesn't make sense as there's no user input
    // For runner mode, WPM doesn't make sense as speed is controlled by game levels
    // For head-copy mode, WPM doesn't make sense as it's button-based word recognition
    if (mode === 'listen' || mode === 'runner' || mode === 'head-copy') {
      return 0;
    }

    // Avoid division by zero
    if (sessionDurationMs <= 0) return 0;

    // Convert to seconds
    const sessionDurationSeconds = sessionDurationMs / 1000;

    // Calculate net correct characters: correct - incorrect
    const achievedCharacters = correctCount - incorrectCount;

    // Don't allow negative WPM
    if (achievedCharacters <= 0) return 0;

    // Standard CW formula with error penalty: (achieved characters per second) * 12
    // The factor 12 comes from: (60 seconds/minute) / (5 characters/word)
    const charactersPerSecond = achievedCharacters / sessionDurationSeconds;
    const achievedWpm = charactersPerSecond * 12;

    return Math.round(achievedWpm);
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