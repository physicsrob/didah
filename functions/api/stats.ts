/**
 * Stats API Endpoint
 *
 * Handles saving session statistics to Cloudflare KV.
 * Statistics are organized by user and date.
 */

import type { KVNamespace } from '@cloudflare/workers-types';
import { getUserIdFromRequest } from '../shared/auth';
import { validateSessionStatistics } from '../shared/types';

interface Env {
  KV: KVNamespace;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
}

/**
 * POST /api/stats - Save session statistics
 */
export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
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
    // Parse the statistics from request body
    const stats = await context.request.json();

    // Validate the statistics structure
    if (!validateSessionStatistics(stats)) {
      return new Response('Invalid statistics format', { status: 400 });
    }

    // Extract date from stats (should be provided by client)
    const date = stats.date || new Date().toISOString().split('T')[0];

    // Create KV key for this user and date
    const key = `user:${userId}:stats:${date}`;

    // Get existing stats for this date
    const existingData = await context.env.KV.get(key, 'json') as unknown[] || [];

    // Append new stats
    const updatedData = [...existingData, stats];

    // Save back to KV
    await context.env.KV.put(key, JSON.stringify(updatedData), {
      // Optional: Set expiration (e.g., 1 year)
      expirationTtl: 365 * 24 * 60 * 60
    });

    return Response.json({
      success: true,
      date,
      totalSessionsToday: updatedData.length
    });
  } catch (error) {
    console.error('Failed to save stats:', error);
    return new Response('Failed to save statistics', { status: 500 });
  }
}