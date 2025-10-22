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

function buildCharacterStats(sessions: SessionStatistics[]): Map<string, { correct: number; incorrect: number; attempts: number }> {
  const charStats = new Map<string, { correct: number; incorrect: number; attempts: number }>();

  for (const session of sessions) {
    if (!session.characterStats) continue;

    for (const [char, stats] of Object.entries(session.characterStats)) {
      if (!charStats.has(char)) {
        charStats.set(char, { correct: 0, incorrect: 0, attempts: 0 });
      }

      const agg = charStats.get(char)!;
      agg.correct += stats.correct;
      agg.incorrect += stats.incorrect;
      agg.attempts += stats.correct + stats.incorrect;
    }
  }

  return charStats;
}

function calculateFocusScores(charStats: Map<string, { correct: number; incorrect: number; attempts: number }>): Map<string, number> {
  const focusScores = new Map<string, number>();

  for (const [char, stats] of charStats) {
    const accuracy = stats.attempts > 0 ? stats.correct / stats.attempts : 1.0;
    const errorRate = 1 - accuracy;

    // Same formula as ConfusionTab: penalty for high accuracy (>50%)
    const penalty = Math.pow(Math.min(errorRate, 0.5) / 0.5, 3);
    const focusScore = stats.incorrect * penalty;

    focusScores.set(char, focusScore);
  }

  return focusScores;
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
  focusScores: Map<string, number>,
  count: number
): Array<{ char: string; confusedWith: string; weight: number }> {
  const pairs = Array.from(pairConfusions.entries())
    .map(([pairKey, confusionCount]) => {
      const [char1, char2] = pairKey.split('-');

      // Weight pair by sum of character focus scores
      const score1 = focusScores.get(char1) || 0;
      const score2 = focusScores.get(char2) || 0;
      const weight = score1 + score2;

      return { char1, char2, confusionCount, weight };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, count);

  return pairs.map(p => ({
    char: p.char1,
    confusedWith: p.char2,
    weight: p.weight
  }));
}

function generateConfusingText(pairs: Array<{ char: string; confusedWith: string; weight: number }>): string {
  if (pairs.length === 0) {
    return 'No confusion data available. Practice more sessions first!';
  }

  // Calculate total weight for weighted random selection
  const totalWeight = pairs.reduce((sum, p) => sum + p.weight, 0);

  // Fallback to uniform selection if all weights are zero
  const useWeights = totalWeight > 0;

  const blocks: string[] = [];
  const targetLength = 1000;
  let currentLength = 0;

  while (currentLength < targetLength) {
    let pair;

    if (useWeights) {
      // Weighted random selection
      let random = Math.random() * totalWeight;
      for (const p of pairs) {
        random -= p.weight;
        if (random <= 0) {
          pair = p;
          break;
        }
      }
      // Fallback in case of floating point precision issues
      pair = pair || pairs[pairs.length - 1];
    } else {
      // Uniform random selection (fallback)
      pair = pairs[Math.floor(Math.random() * pairs.length)];
    }

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
        text: 'No practice history found. Complete some sessions first!'
      });
    }

    const charStats = buildCharacterStats(last10Sessions);
    const focusScores = calculateFocusScores(charStats);
    const pairConfusions = buildSymmetricConfusionMatrix(last10Sessions);
    const confusingPairs = findMostConfusedPairs(pairConfusions, focusScores, 5);
    const generatedText = generateConfusingText(confusingPairs);

    return Response.json({
      id: 'confusing_characters',
      text: generatedText
    });
  } catch (error) {
    console.error('Failed to generate confusing characters:', error);
    return new Response('Failed to generate confusing characters', { status: 500 });
  }
}