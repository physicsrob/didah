/**
 * API endpoint to generate distractors for a given word
 * GET /api/distractors?word=the
 */

import { generateDistractors } from '../shared/distractors/algorithm.js';
import { extractPunctuation, applyPunctuation } from '../shared/distractors/punctuation.js';
import { hasSubstitution } from '../shared/distractors/substitutionMatrix.js';

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

  // Extract punctuation from the word
  const { leading, base, trailing } = extractPunctuation(word);

  // Validate that base word contains at least one valid Morse character
  if (!base) {
    return Response.json(
      { error: 'Word cannot be empty' },
      { status: 400 }
    );
  }

  // Check if base contains at least one character with a valid Morse pattern
  const hasValidMorseChar = base.split('').some(char => hasSubstitution(char));
  if (!hasValidMorseChar) {
    return Response.json(
      { error: 'Word must contain at least one valid Morse code character' },
      { status: 400 }
    );
  }

  try {
    // Generate distractors for the base word (without punctuation)
    const baseDistractors = generateDistractors(base.toLowerCase());

    // Apply the same punctuation pattern to all distractors
    const punctuatedDistractors = baseDistractors.map(distractor =>
      applyPunctuation(distractor, leading, trailing)
    );

    // Apply punctuation to the original word as well
    const punctuatedWord = applyPunctuation(base.toLowerCase(), leading, trailing);

    return Response.json({
      word: punctuatedWord,
      distractors: punctuatedDistractors
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
