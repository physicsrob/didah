/**
 * Migration 001: Separate Timeout Statistics
 *
 * Separates timeout percentage from accuracy calculation and updates
 * effective WPM to only count net correct characters.
 */

import type { Migration } from '../types';
import type { SessionStatistics } from '../../../src/core/types/statistics';

export const migration: Migration = {
  id: '001-separate-timeout-stats',
  description: 'Separate timeout percentage from accuracy calculation and update achieved WPM formula',

  /**
   * Check if this session needs migration
   */
  needsMigration(session: SessionStatistics): boolean {
    // If session already has timeoutPercentage, it's been migrated
    // Use type assertion to check for the new field
    return (session as SessionStatistics & { timeoutPercentage?: number }).timeoutPercentage === undefined;
  },

  /**
   * Transform the session statistics
   */
  transform(session: SessionStatistics): SessionStatistics {
    // Skip non-practice modes (they don't have meaningful accuracy/WPM)
    if (session.config.mode !== 'practice') {
      return {
        ...session,
        timeoutPercentage: 0
      } as SessionStatistics;
    }

    // Calculate new accuracy (excluding timeouts)
    const actualAttempts = session.correctCount + session.incorrectCount;
    const newAccuracy = actualAttempts > 0
      ? (session.correctCount / actualAttempts) * 100
      : 0;

    // Calculate timeout percentage
    const timeoutPercentage = session.totalCharacters > 0
      ? (session.timeoutCount / session.totalCharacters) * 100
      : 0;

    // Calculate new achieved WPM (correct - incorrect)
    const achievedCharacters = session.correctCount - session.incorrectCount;
    const durationSeconds = session.durationMs / 1000;
    const achievedWpm = achievedCharacters > 0 && durationSeconds > 0
      ? Math.round((achievedCharacters / durationSeconds) * 12)
      : 0;

    // Return updated session
    return {
      ...session,
      overallAccuracy: newAccuracy,
      timeoutPercentage,
      achievedWpm
    } as SessionStatistics;
  },

  /**
   * Validate the transformation
   */
  validate(original: SessionStatistics, transformed: SessionStatistics): void {
    // Ensure required fields are present
    if ((transformed as SessionStatistics & { timeoutPercentage?: number }).timeoutPercentage === undefined) {
      throw new Error('Migration failed: timeoutPercentage not added');
    }

    // Ensure counts are preserved
    if (transformed.correctCount !== original.correctCount ||
        transformed.incorrectCount !== original.incorrectCount ||
        transformed.timeoutCount !== original.timeoutCount) {
      throw new Error('Migration failed: counts were modified');
    }

    // Validate timeout percentage calculation
    const expectedTimeoutPct = original.totalCharacters > 0
      ? (original.timeoutCount / original.totalCharacters) * 100
      : 0;

    const actualTimeoutPct = (transformed as SessionStatistics & { timeoutPercentage?: number }).timeoutPercentage || 0;
    if (Math.abs(actualTimeoutPct - expectedTimeoutPct) > 0.01) {
      throw new Error(`Migration failed: timeout percentage mismatch. Expected ${expectedTimeoutPct}, got ${actualTimeoutPct}`);
    }

    // For practice mode, validate accuracy calculation
    if (original.config.mode === 'practice') {
      const actualAttempts = original.correctCount + original.incorrectCount;
      const expectedAccuracy = actualAttempts > 0
        ? (original.correctCount / actualAttempts) * 100
        : 0;

      if (Math.abs(transformed.overallAccuracy - expectedAccuracy) > 0.01) {
        throw new Error(`Migration failed: accuracy mismatch. Expected ${expectedAccuracy}, got ${transformed.overallAccuracy}`);
      }
    }
  }
};