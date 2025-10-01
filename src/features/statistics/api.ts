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