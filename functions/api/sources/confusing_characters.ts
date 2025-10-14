import type { KVNamespace } from '@cloudflare/workers-types';
import { getUserIdFromRequest } from '../../shared/auth';

interface Env {
  KV: KVNamespace;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
}

interface SessionStatistics {
  characterStats: Record<string, {
    char: string;
    correct: number;
    incorrect: number;
    timeout: number;
  }>;
  confusionMatrix: Record<string, Record<string, number>>;
}

function buildSymmetricConfusionMatrix(sessions: SessionStatistics[]): Map<string, number> {
  const pairConfusions = new Map<string, number>();

  for (const session of sessions) {
    if (!session.confusionMatrix) continue;

    for (const [expected, confusions] of Object.entries(session.confusionMatrix)) {
      for (const [typed, count] of Object.entries(confusions)) {
        if (typed === expected) continue;

        const sortedPair = [expected, typed].sort().join('-');
        const currentCount = pairConfusions.get(sortedPair) || 0;
        pairConfusions.set(sortedPair, currentCount + count);
      }
    }
  }

  return pairConfusions;
}

function findMostConfusedPairs(
  pairConfusions: Map<string, number>,
  count: number
): Array<{ char: string; confusedWith: string }> {
  const pairs = Array.from(pairConfusions.entries())
    .map(([pairKey, confusionCount]) => {
      const [char1, char2] = pairKey.split('-');
      return { char1, char2, confusionCount };
    })
    .sort((a, b) => b.confusionCount - a.confusionCount)
    .slice(0, count);

  return pairs.map(p => ({
    char: p.char1,
    confusedWith: p.char2
  }));
}

function generateConfusingText(pairs: Array<{ char: string; confusedWith: string }>): string {
  if (pairs.length === 0) {
    return 'No confusion data available. Practice more sessions first!';
  }

  const blocks: string[] = [];
  const targetLength = 1000;
  let currentLength = 0;

  while (currentLength < targetLength) {
    const pair = pairs[Math.floor(Math.random() * pairs.length)];

    let block = '';
    for (let i = 0; i < 5; i++) {
      block += Math.random() < 0.5 ? pair.char : pair.confusedWith;
    }

    blocks.push(block);
    currentLength += 5;
  }

  return blocks.join(' ');
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  // Get Clerk keys from environment
  const secretKey = context.env.CLERK_SECRET_KEY;
  const publishableKey = context.env.CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) {
    return new Response('Server configuration error', { status: 500 });
  }

  let userId: string;
  try {
    userId = await getUserIdFromRequest(context.request, secretKey, publishableKey);
  } catch (error) {
    console.error('Auth error:', error);
    return new Response('Invalid token', { status: 401 });
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 29);

    const keysToFetch: string[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      keysToFetch.push(`user:${userId}:stats:${dateStr}`);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const statsPromises = keysToFetch.map(key => context.env.KV.get(key, 'json'));
    const allDailyStats = await Promise.all(statsPromises);

    const allSessions: SessionStatistics[] = [];

    for (const dailyStats of allDailyStats) {
      if (dailyStats && Array.isArray(dailyStats)) {
        allSessions.push(...(dailyStats as SessionStatistics[]));
      }
    }

    allSessions.sort((a, b) => {
      const timestampA = (a as SessionStatistics & { timestamp?: number }).timestamp || 0;
      const timestampB = (b as SessionStatistics & { timestamp?: number }).timestamp || 0;
      return timestampB - timestampA;
    });

    const last10Sessions = allSessions.slice(0, 10);

    if (last10Sessions.length === 0) {
      return Response.json({
        id: 'confusing_characters',
        items: ['No practice history found. Complete some sessions first!']
      });
    }

    const pairConfusions = buildSymmetricConfusionMatrix(last10Sessions);
    const confusingPairs = findMostConfusedPairs(pairConfusions, 5);
    const generatedText = generateConfusingText(confusingPairs);

    return Response.json({
      id: 'confusing_characters',
      items: [generatedText]
    });
  } catch (error) {
    console.error('Failed to generate confusing characters:', error);
    return new Response('Failed to generate confusing characters', { status: 500 });
  }
}