/**
 * Sessions API
 *
 * Returns all individual session statistics from the last 30 days.
 * Concatenates all sessions from daily stats without aggregation.
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import { getUserIdFromRequest } from '../shared/auth';
import type { SessionStatistics } from '../shared/types';

interface Env {
  KV: KVNamespace;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
}

/**
 * GET /api/sessions
 *
 * Returns an array of all SessionStatistics objects from the last 30 days.
 */
export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  // Get Clerk keys from environment
  const secretKey = context.env.CLERK_SECRET_KEY;
  const publishableKey = context.env.CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    return new Response('Server configuration error', { status: 500 });
  }

  // Get user ID from request
  let userId: string;
  try {
    userId = await getUserIdFromRequest(context.request, secretKey, publishableKey);
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

    // Sort by timestamp (most recent first)
    allSessions.sort((a, b) => {
      const timestampA = a.timestamp || 0;
      const timestampB = b.timestamp || 0;
      return timestampB - timestampA;
    });

    return Response.json(allSessions);
  } catch (error) {
    console.error('Failed to retrieve sessions:', error);
    return new Response('Failed to retrieve sessions', { status: 500 });
  }
}