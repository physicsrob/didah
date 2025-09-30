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

    try {
      const response = await fetch('/api/sessions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch sessions: ${response.status}`);
        return [];
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
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  /**
   * Fetch practice time data for the last 30 days
   */
  async getPracticeTime(): Promise<DailyPracticeTime[]> {
    if (!this.authToken) {
      // Return empty data for unauthenticated users
      return this.generateEmptyPracticeTime();
    }

    try {
      const response = await fetch('/api/practice-time', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        }
      });

      if (!response.ok) {
        console.error(`Failed to fetch practice time: ${response.status}`);
        return this.generateEmptyPracticeTime();
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching practice time:', error);
      return this.generateEmptyPracticeTime();
    }
  }

  /**
   * Future: Fetch accuracy data
   */
  async getAccuracy(days: number = 30): Promise<AccuracyData[]> {
    // Placeholder for future implementation
    if (!this.authToken) {
      return [];
    }

    try {
      const response = await fetch(`/api/accuracy?days=${days}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        }
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching accuracy:', error);
      return [];
    }
  }

  /**
   * Future: Fetch speed data
   */
  async getSpeed(days: number = 30): Promise<SpeedData[]> {
    // Placeholder for future implementation
    if (!this.authToken) {
      return [];
    }

    try {
      const response = await fetch(`/api/speed?days=${days}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
        }
      });

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching speed:', error);
      return [];
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