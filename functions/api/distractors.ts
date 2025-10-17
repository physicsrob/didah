/**
 * API endpoint to generate distractors for a given word
 * GET /api/distractors?word=the
 */

import { generateDistractors } from '../shared/distractors/algorithm.js';

interface CloudflareContext {
  request: Request;
}

export async function onRequestGet(context: CloudflareContext) {
  const url = new URL(context.request.url);
  const word = url.searchParams.get('word');

  if (!word) {
    return Response.json(
      { error: 'Missing required parameter: word' },
      { status: 400 }
    );
  }

  // Validate word format (alphanumeric only)
  if (!/^[a-zA-Z]+$/.test(word)) {
    return Response.json(
      { error: 'Word must contain only letters' },
      { status: 400 }
    );
  }

  try {
    // Generate distractors for the given word
    const distractors = generateDistractors(word.toLowerCase());

    if (distractors === null) {
      return Response.json(
        {
          error: 'Unable to generate distractors for this word',
          details: 'Not enough similar words found in word list'
        },
        { status: 404 }
      );
    }

    return Response.json({
      word: word.toLowerCase(),
      distractors
    });

  } catch (error) {
    console.error('Error generating distractors:', error);
    return Response.json(
      {
        error: 'Failed to generate distractors',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
