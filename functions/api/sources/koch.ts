/**
 * Koch Source - Learn Mode Practice Content Generator
 *
 * Generates 50 weighted characters based on user's mastery for a given Koch level.
 * Un-mastered characters appear twice as often as mastered characters.
 *
 * Requires authentication (Learn Mode is a progression system).
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import { getUserIdFromRequest } from '../../shared/auth';
import type { SessionStatistics } from '../../shared/types';
import { isValidLevel, getCharactersForLevel } from '../../shared/koch';
import { analyzeMastery } from '../../shared/masteryCalculator';
import { generateWeightedSequence } from '../../shared/contentGenerator';

interface CloudflareContext {
  params: {
    id: string;
  };
  request: Request;
  env?: {
    KV?: KVNamespace;
    CLERK_SECRET_KEY?: string;
    CLERK_PUBLISHABLE_KEY?: string;
  };
}

/**
 * Query user's session statistics from the last 30 days
 */
async function getUserSessions(userId: string, kv: KVNamespace): Promise<SessionStatistics[]> {
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
  const statsPromises = keysToFetch.map(key => kv.get(key, 'json'));
  const allDailyStats = await Promise.all(statsPromises);

  // Concatenate all sessions into a single array
  const allSessions: SessionStatistics[] = [];

  for (const dailyStats of allDailyStats) {
    if (dailyStats && Array.isArray(dailyStats)) {
      allSessions.push(...(dailyStats as SessionStatistics[]));
    }
  }

  return allSessions;
}

/**
 * GET /api/sources/koch-level-{N}
 *
 * Returns 50 weighted characters for the specified Koch level.
 */
export async function onRequestGet(context: CloudflareContext): Promise<Response> {
  const { id } = context.params;

  // Extract level from ID (format: koch-level-{N})
  const match = id.match(/^koch-level-(\d+)$/);
  if (!match) {
    return Response.json({
      error: 'Invalid Koch source ID format. Expected: koch-level-{N}'
    }, { status: 400 });
  }

  const level = parseInt(match[1], 10);

  // Validate level (1-20)
  if (!isValidLevel(level)) {
    return Response.json({
      error: `Invalid level: ${level}. Must be between 1 and 20.`
    }, { status: 400 });
  }

  // Check environment configuration
  const secretKey = context.env?.CLERK_SECRET_KEY;
  const publishableKey = context.env?.CLERK_PUBLISHABLE_KEY;
  const kv = context.env?.KV;

  if (!secretKey || !publishableKey) {
    return Response.json({
      error: 'Server configuration error'
    }, { status: 500 });
  }

  if (!kv) {
    return Response.json({
      error: 'KV storage not available'
    }, { status: 500 });
  }

  // Require authentication (Learn Mode is a progression system)
  let userId: string;
  try {
    userId = await getUserIdFromRequest(context.request, secretKey, publishableKey);
  } catch {
    return Response.json({
      error: 'Authentication required for Learn Mode'
    }, { status: 401 });
  }

  try {
    // Get characters for this level
    const levelChars = getCharactersForLevel(level);

    // Query user's historical sessions
    let sessions: SessionStatistics[];
    try {
      sessions = await getUserSessions(userId, kv);
    } catch (error) {
      console.error('Failed to query user sessions:', error);
      // Fallback: treat all characters as un-mastered (equal weighting)
      // This is a safe default for beginners or when stats are unavailable
      sessions = [];
    }

    // Analyze mastery for level characters
    const mastery = analyzeMastery(sessions, levelChars);

    // Generate 50 weighted characters
    // If both sets are empty (shouldn't happen), throw error
    // Otherwise, generateWeightedSequence handles the weighting
    const sequence = generateWeightedSequence(
      mastery.masteredChars,
      mastery.unMasteredChars,
      50
    );

    // Join into text with spaces between each character
    const text = sequence.join(' ');

    return Response.json({
      id,
      text
    }, {
      headers: {
        // Koch sources should NOT be cached - they're personalized to user's current mastery
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error(`Error generating Koch source for level ${level}:`, error);
    return Response.json({
      error: 'Failed to generate practice content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
