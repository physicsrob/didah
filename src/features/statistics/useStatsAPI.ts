import { useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { StatsAPI } from './statsAPI';
import type { SessionStatistics } from '../../core/types/statistics';

/**
 * React hook for saving session statistics
 *
 * Provides a simple interface to save stats for authenticated users.
 * Anonymous users' stats are not saved.
 */
export function useStatsAPI() {
  const { user } = useAuth();

  const saveSessionStats = useCallback(async (stats: SessionStatistics): Promise<void> => {
    if (!user) {
      console.log('Stats not saved - user not authenticated');
      return;
    }

    const token = localStorage.getItem('google_token');
    if (!token) {
      console.log('Stats not saved - no auth token found');
      return;
    }

    const api = new StatsAPI(token);
    await api.saveSessionStats(stats);
  }, [user]);

  return {
    saveSessionStats,
    isAuthenticated: !!user
  };
}