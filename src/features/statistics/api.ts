/**
 * Generic Statistics API Client
 *
 * Handles fetching various statistics data from the backend.
 * Extensible to support multiple statistics endpoints.
 */

import type { SessionStatistics, SessionStatisticsWithMaps } from '../../core/types/statistics';

export interface DailyPracticeTime {
  day: string;  // ISO date string (YYYY-MM-DD)
  minutes: number;
}

export interface AccuracyData {
  date: string;
  accuracy: number;  // 0-100 percentage
  totalChars: number;
  correctChars: number;
}

export interface SpeedData {
  date: string;
  wpm: number;
  charactersPerMinute: number;
}

export class StatisticsAPI {
  private authToken: string | null;

  constructor(authToken: string | null) {
    this.authToken = authToken;
  }

  /**
   * Fetch all session statistics for the last 30 days
   * Note: Backend returns Record format, we convert to Maps for frontend use
   */
  async getSessions(): Promise<SessionStatisticsWithMaps[]> {
    if (!this.authToken) {
      // Return empty data for unauthenticated users
      return [];
    }

    const response = await fetch('/api/sessions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sessions: ${response.status}`);
    }

    const sessions: SessionStatistics[] = await response.json();

    // Convert Record objects to Maps for ergonomic frontend use
    return sessions.map((session) => ({
      ...session,
      characterStats: new Map(Object.entries(session.characterStats || {})),
      confusionMatrix: new Map(
        Object.entries(session.confusionMatrix || {}).map(([key, value]) => [
          key,
          new Map(Object.entries(value))
        ])
      )
    })) as SessionStatisticsWithMaps[];
  }

  /**
   * Fetch practice time data for the last 30 days
   */
  async getPracticeTime(): Promise<DailyPracticeTime[]> {
    if (!this.authToken) {
      // Return empty data for unauthenticated users
      return this.generateEmptyPracticeTime();
    }

    const response = await fetch('/api/practice-time', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch practice time: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Future: Fetch accuracy data
   */
  async getAccuracy(days: number): Promise<AccuracyData[]> {
    // Placeholder for future implementation
    if (!this.authToken) {
      return [];
    }

    const response = await fetch(`/api/accuracy?days=${days}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch accuracy: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Future: Fetch speed data
   */
  async getSpeed(days: number): Promise<SpeedData[]> {
    // Placeholder for future implementation
    if (!this.authToken) {
      return [];
    }

    const response = await fetch(`/api/speed?days=${days}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch speed: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Get Learn Mode progress (best stars per level)
   * Returns a map of level number (1-20) to best star rating (0-3)
   * Only includes levels that have been attempted
   */
  async getLearnModeProgress(): Promise<Map<number, number>> {
    if (!this.authToken) {
      return new Map();
    }

    try {
      const sessions = await this.getSessions();

      // Filter to Learn Mode sessions only
      const learnSessions = sessions.filter(s =>
        s.config.mode === 'learn' &&
        s.learnLevel !== undefined &&
        s.learnStars !== undefined
      );

      // Build map of best stars per level
      const bestStars = new Map<number, number>();

      for (const session of learnSessions) {
        const level = session.learnLevel!;
        const stars = session.learnStars!;
        const currentBest = bestStars.get(level) ?? 0;

        if (stars > currentBest) {
          bestStars.set(level, stars);
        }
      }

      return bestStars;
    } catch (error) {
      console.error('Failed to fetch Learn Mode progress:', error);
      return new Map(); // Graceful fallback
    }
  }

  /**
   * Get character mastery for a set of characters
   * Queries all historical sessions (all modes) and calculates mastery
   * Returns sets of mastered vs un-mastered characters
   *
   * @param chars Characters to analyze
   */
  async getCharacterMastery(chars: string[]): Promise<{
    masteredChars: Set<string>;
    unMasteredChars: Set<string>;
  }> {
    if (!this.authToken) {
      // No history - all characters un-mastered
      return {
        masteredChars: new Set<string>(),
        unMasteredChars: new Set(chars)
      };
    }

    try {
      const sessions = await this.getSessions();

      // Convert SessionStatisticsWithMaps back to SessionStatistics format
      // (masteryCalculator expects Record format)
      const sessionsForAnalysis = sessions.map(s => ({
        ...s,
        characterStats: Object.fromEntries(s.characterStats),
        confusionMatrix: Object.fromEntries(
          Array.from(s.confusionMatrix.entries()).map(([key, value]) => [
            key,
            Object.fromEntries(value)
          ])
        )
      }));

      // Use shared mastery calculator
      const { analyzeMastery } = await import('../../../functions/shared/masteryCalculator');
      const analysis = analyzeMastery(sessionsForAnalysis, chars);

      return {
        masteredChars: analysis.masteredChars,
        unMasteredChars: analysis.unMasteredChars
      };
    } catch (error) {
      console.error('Failed to fetch character mastery:', error);
      // Graceful fallback - treat all as un-mastered
      return {
        masteredChars: new Set<string>(),
        unMasteredChars: new Set(chars)
      };
    }
  }

  /**
   * Generate empty practice time data for the last 30 days
   */
  private generateEmptyPracticeTime(): DailyPracticeTime[] {
    const result: DailyPracticeTime[] = [];
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      result.push({
        day: date.toISOString().split('T')[0],
        minutes: 0
      });
    }

    return result;
  }
}