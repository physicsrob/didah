import type { SessionStatistics } from '../../core/types/statistics';

/**
 * Stats API Client
 *
 * Handles saving session statistics to the backend.
 * Only available for authenticated users.
 */
export class StatsAPI {
  private authToken: string;

  constructor(authToken: string) {
    this.authToken = authToken;
  }

  /**
   * Save session statistics to the backend
   */
  async saveSessionStats(stats: SessionStatistics): Promise<void> {
    // Add date and timestamp to the stats
    const statsWithMetadata = {
      ...stats,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      // Convert Maps to objects for JSON serialization
      characterStats: Object.fromEntries(stats.characterStats),
      confusionMatrix: Object.fromEntries(
        Array.from(stats.confusionMatrix.entries()).map(([key, value]) => [
          key,
          Object.fromEntries(value)
        ])
      )
    };

    const response = await fetch('/api/stats', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(statsWithMetadata)
    });

    if (!response.ok) {
      throw new Error(`Failed to save stats: ${response.status}`);
    }
  }
}