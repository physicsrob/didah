/**
 * API endpoint to get word source with pre-calculated distractors
 * GET /api/word-sources/[id]
 */

import { TOP_100_WORDS, TOP_1000_WORDS } from './wordData';
import { processWordList, type WordEntry } from './distractorAlgorithm';

interface CloudflareContext {
  params: {
    id: string;
  };
}

// Cache processed word lists to avoid recalculating distractors on every request
let cachedTop100: WordEntry[] | null = null;
let cachedTop1000: WordEntry[] | null = null;

export async function onRequestGet(context: CloudflareContext) {
  const { id } = context.params;

  if (!id) {
    return Response.json({ error: 'Word source ID required' }, { status: 400 });
  }

  try {
    let words: WordEntry[];

    switch (id) {
      case 'top-100':
        if (!cachedTop100) {
          cachedTop100 = processWordList(TOP_100_WORDS);
        }
        words = cachedTop100;
        break;

      case 'top-1000':
        if (!cachedTop1000) {
          cachedTop1000 = processWordList(TOP_1000_WORDS);
        }
        words = cachedTop1000;
        break;

      default:
        return Response.json({ error: 'Word source not found' }, { status: 404 });
    }

    return Response.json({
      id,
      words
    }, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      }
    });

  } catch (error) {
    console.error(`Error fetching word source ${id}:`, error);
    return Response.json({
      error: 'Failed to fetch word source',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
