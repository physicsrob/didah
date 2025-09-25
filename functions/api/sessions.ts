/**
 * Sessions API
 *
 * Returns all individual session statistics from the last 30 days.
 * Concatenates all sessions from daily stats without aggregation.
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import { getUserIdFromToken } from '../shared/auth';
import type { SessionStatistics } from '../../src/core/types/statistics';

interface Env {
  KV: KVNamespace;
}

/**
 * GET /api/sessions
 *
 * Returns an array of all SessionStatistics objects from the last 30 days.
 */
export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  // Get user ID from token
  let userId: string;
  try {
    const authHeader = context.request.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Authorization required', { status: 401 });
    }
    userId = getUserIdFromToken(authHeader);
  } catch (error) {
    console.error('Auth error:', error);
    return new Response('Invalid token', { status: 401 });
  }

  try {
    // Fixed to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29); // 30 days total including today

    // Build list of KV keys to fetch
    const keysToFetch: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      keysToFetch.push(`user:${userId}:stats:${dateStr}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Batch fetch all keys
    const statsPromises = keysToFetch.map(key => context.env.KV.get(key, 'json'));
    const allDailyStats = await Promise.all(statsPromises);

    // Concatenate all sessions into a single array
    const allSessions: SessionStatistics[] = [];

    for (const dailyStats of allDailyStats) {
      if (dailyStats && Array.isArray(dailyStats)) {
        // Add all sessions from this day to the combined list
        allSessions.push(...(dailyStats as SessionStatistics[]));
      }
    }

    // Sort by startedAt timestamp (most recent first)
    allSessions.sort((a, b) => b.startedAt - a.startedAt);

    return Response.json(allSessions);
  } catch (error) {
    console.error('Failed to retrieve sessions:', error);
    return new Response('Failed to retrieve sessions', { status: 500 });
  }
}