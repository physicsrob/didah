/**
 * Koch Practice Source - Extended Practice Content Generator
 *
 * Generates longer randomized practice sequences for Koch lessons:
 * - Each new character appears MIN_NEW_CHAR_DRILLS_PRACTICE times (50)
 * - Fill to PRACTICE_SESSION_LENGTH (300) with random characters from all lesson characters
 * - Shuffle and group into 5-character chunks (ham radio style)
 * - Maintains ~33% new character ratio (same as Learn Mode)
 *
 * Each request returns a different random sequence.
 * No authentication required.
 */

import {
  isValidLesson,
  getCharactersForLesson,
  getNewCharactersForLesson,
  MIN_NEW_CHAR_DRILLS,
  LEARN_SESSION_LENGTH
} from '../../shared/koch';

interface CloudflareContext {
  params: {
    id: string;
  };
}

// Practice mode constants (10x longer than Learn Mode to maintain same new char percentage)
const PRACTICE_SESSION_LENGTH = 300;
const MIN_NEW_CHAR_DRILLS_PRACTICE = MIN_NEW_CHAR_DRILLS * (PRACTICE_SESSION_LENGTH / LEARN_SESSION_LENGTH); // 50

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Group characters into 5-character chunks separated by spaces
 */
function groupIntoFives(chars: string[]): string {
  const groups: string[] = [];
  for (let i = 0; i < chars.length; i += 5) {
    groups.push(chars.slice(i, i + 5).join(''));
  }
  return groups.join(' ');
}

/**
 * GET /api/sources/koch-practice-{N}
 *
 * Returns extended practice sequence for the specified Koch lesson.
 */
export async function onRequestGet(context: CloudflareContext): Promise<Response> {
  const { id } = context.params;

  // Extract lesson from ID (format: koch-practice-{N})
  const match = id.match(/^koch-practice-(\d+)$/);
  if (!match) {
    return Response.json({
      error: 'Invalid Koch practice source ID format. Expected: koch-practice-{N}'
    }, { status: 400 });
  }

  const lesson = parseInt(match[1], 10);

  // Validate lesson (1-20)
  if (!isValidLesson(lesson)) {
    return Response.json({
      error: `Invalid lesson: ${lesson}. Must be between 1 and 20.`
    }, { status: 400 });
  }

  try {
    // Get new and all characters for this lesson
    const newChars = getNewCharactersForLesson(lesson);
    const allChars = getCharactersForLesson(lesson);

    // Build sequence
    const sequence: string[] = [];

    // Add each new char MIN_NEW_CHAR_DRILLS_PRACTICE times
    for (const char of newChars) {
      for (let i = 0; i < MIN_NEW_CHAR_DRILLS_PRACTICE; i++) {
        sequence.push(char);
      }
    }

    // Fill to PRACTICE_SESSION_LENGTH with random sampling from all chars
    while (sequence.length < PRACTICE_SESSION_LENGTH) {
      const randomChar = allChars[Math.floor(Math.random() * allChars.length)];
      sequence.push(randomChar);
    }

    // Shuffle the sequence
    const shuffled = shuffleArray(sequence);

    // Group into 5-character chunks separated by spaces
    const text = groupIntoFives(shuffled);

    return Response.json({
      id,
      text
    }, {
      headers: {
        // Koch sources should NOT be cached - each request generates a new random sequence
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    });

  } catch (error) {
    console.error(`Error generating Koch practice source for lesson ${lesson}:`, error);
    return Response.json({
      error: 'Failed to generate practice content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
