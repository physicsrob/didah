/**
 * Practice Time API
 *
 * Aggregates existing session statistics to provide daily practice time summaries.
 * Reads from the existing stats data stored in KV.
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import { getUserIdFromToken } from '../shared/auth';

interface Env {
  KV: KVNamespace;
  GOOGLE_CLIENT_ID: string;
}

interface DailyPracticeTime {
  day: string;
  minutes: number;
}

/**
 * GET /api/practice-time
 *
 * Returns an array of daily practice times for the last 30 days.
 */
export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  // Get Google Client ID from environment
  const clientId = context.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response('Server configuration error', { status: 500 });
  }

  // Get user ID from token
  let userId: string;
  try {
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Authorization required', { status: 401 });
    }
    userId = await getUserIdFromToken(authHeader, clientId);
  } catch (error) {
    console.error('Auth error:', error);
    return new Response('Invalid token', { status: 401 });
  }

  try {
    // Fixed to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29); // 30 days total including today

    // Collect all stats for the date range
    const dailyPracticeMap = new Map<string, number>();
    const currentDate = new Date(startDate);

    // Initialize all days with 0 minutes
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      dailyPracticeMap.set(dateStr, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Fetch stats for each day in the range
    const keysToFetch: string[] = [];
    currentDate.setTime(startDate.getTime());

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      keysToFetch.push(`user:${userId}:stats:${dateStr}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Batch fetch all keys (KV doesn't have batch get, so we'll do individual gets)
    const statsPromises = keysToFetch.map(key => context.env.KV.get(key, 'json'));
    const allStats = await Promise.all(statsPromises);

    // Process each day's stats
    for (let i = 0; i < keysToFetch.length; i++) {
      const stats = allStats[i] as unknown[] | null;
      if (stats && Array.isArray(stats)) {
        const dateStr = keysToFetch[i].split(':stats:')[1];

        // Sum up all session durations for this day
        const totalMs = stats.reduce((sum, session) => {
          // Use durationMs if available, otherwise calculate from start/end times
          if (session.durationMs) {
            return sum + session.durationMs;
          } else if (session.endedAt && session.startedAt) {
            return sum + (session.endedAt - session.startedAt);
          } else if (session.config?.lengthMs) {
            // Fallback to configured session length if actual duration not available
            return sum + session.config.lengthMs;
          }
          return sum;
        }, 0);

        const totalMinutes = Math.round(totalMs / 60000);
        dailyPracticeMap.set(dateStr, totalMinutes);
      }
    }

    // Convert map to array format
    const practiceData: DailyPracticeTime[] = Array.from(dailyPracticeMap.entries())
      .map(([day, minutes]) => ({ day, minutes }))
      .sort((a, b) => a.day.localeCompare(b.day));

    return Response.json(practiceData);
  } catch (error) {
    console.error('Failed to retrieve practice time:', error);
    return new Response('Failed to retrieve practice time', { status: 500 });
  }
}