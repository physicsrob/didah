import { useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { StatsAPI } from './statsAPI';
import type { SessionStatisticsWithMaps } from '../../core/types/statistics';

/**
 * React hook for saving session statistics
 *
 * Provides a simple interface to save stats for authenticated users.
 * Anonymous users' stats are not saved.
 */
export function useStatsAPI() {
  const { user } = useAuth();

  const saveSessionStats = useCallback(async (stats: SessionStatisticsWithMaps): Promise<void> => {
    if (!user) {
      console.log('Stats not saved - user not authenticated');
      return;
    }

    const token = localStorage.getItem('google_token');
    if (!token) {
      console.log('Stats not saved - no auth token found');
      return;
    }

    // Check if token is expired
    const isTokenExpired = (token: string): boolean => {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return false;
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < now;
      } catch {
        return true;
      }
    };

    if (isTokenExpired(token)) {
      console.log('Stats not saved - token expired');
      localStorage.removeItem('google_token');
      throw new Error('Session expired. Please sign in again to save your statistics.');
    }

    try {
      const api = new StatsAPI(token);
      await api.saveSessionStats(stats);
    } catch (error) {
      // If it's a 401, clear the token
      if (error instanceof Error && error.message.includes('Authentication failed')) {
        localStorage.removeItem('google_token');
        throw new Error('Session expired. Please sign in again to save your statistics.');
      }
      throw error;
    }
  }, [user]);

  return {
    saveSessionStats,
    isAuthenticated: !!user
  };
}