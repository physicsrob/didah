import { useCallback } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { StatsAPI } from './statsAPI';
import { StatisticsAPI } from './api';
import type { SessionStatisticsWithMaps } from '../../core/types/statistics';

/**
 * React hook for saving session statistics and querying Learn Mode data
 *
 * Provides a simple interface to save stats for authenticated users.
 * Anonymous users' stats are not saved.
 */
export function useStatsAPI() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const saveSessionStats = useCallback(async (stats: SessionStatisticsWithMaps): Promise<void> => {
    if (!user) {
      console.log('Stats not saved - user not authenticated');
      return;
    }

    const token = await getToken();
    if (!token) {
      console.log('Stats not saved - no auth token found');
      throw new Error('Failed to get authentication token. Please sign in again.');
    }

    try {
      const api = new StatsAPI(token);
      await api.saveSessionStats(stats);
    } catch (error) {
      // If it's a 401, the token is invalid
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        throw new Error('Session expired. Please sign in again to save your statistics.');
      }
      throw error;
    }
  }, [user, getToken]);

  const fetchLearnProgress = useCallback(async (): Promise<Map<number, number>> => {
    const token = await getToken();
    const api = new StatisticsAPI(token);
    return await api.getLearnModeProgress();
  }, [getToken]);

  const fetchCharacterMastery = useCallback(async (chars: string[]): Promise<{
    masteredChars: Set<string>;
    unMasteredChars: Set<string>;
  }> => {
    const token = await getToken();
    const api = new StatisticsAPI(token);
    return await api.getCharacterMastery(chars);
  }, [getToken]);

  return {
    saveSessionStats,
    fetchLearnProgress,
    fetchCharacterMastery,
    isAuthenticated: !!user
  };
}