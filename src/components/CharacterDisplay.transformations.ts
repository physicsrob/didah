/**
 * Transformation functions for CharacterDisplay component
 *
 * Convert various data formats to DisplayCharacter arrays
 */

import type { DisplayCharacter } from './CharacterDisplay';

/**
 * Transform HistoryItem array to DisplayCharacter array
 * Used by Practice and Listen modes
 */
export function historyToDisplay(
  items: Array<{ char: string; result: 'correct' | 'incorrect' | 'timeout' | 'listen' }>
): DisplayCharacter[] {
  return items.map((item, i) => ({
    text: item.char,
    status:
      item.result === 'correct' ? 'correct' :
      item.result === 'incorrect' ? 'incorrect' :
      item.result === 'timeout' ? 'missed' :
      'neutral', // 'listen' maps to neutral
    key: i
  }));
}

/**
 * Transform Live Copy evaluation state to DisplayCharacter array
 * Used by Live Copy mode (end-of-session feedback only)
 */
export function liveCopyToDisplay(
  display: Array<{
    char: string;
    status: 'pending' | 'correct' | 'wrong' | 'missed';
    typed?: string;
  }>
): DisplayCharacter[] {
  return display.map((item, i) => ({
    text: item.typed || '_',
    status: 'pending', // All characters show as pending during session
    key: i
  }));
}

/**
 * Create a display for Live Copy session results
 * Shows what user typed with color coding for correctness
 */
export function liveCopyResultsDisplay(
  display: Array<{
    char: string;
    status: 'pending' | 'correct' | 'wrong' | 'missed';
    typed?: string;
  }>
): {
  userCopy: DisplayCharacter[];
  correctText: DisplayCharacter[];
} {
  const userCopy = display.map((item, i) => ({
    text: item.typed || (item.status === 'missed' ? '_' : item.char),
    status:
      item.status === 'correct' ? 'correct' as const :
      item.status === 'wrong' ? 'incorrect' as const :
      item.status === 'missed' ? 'missed' as const :
      'pending' as const,
    key: i
  }));

  const correctText = display.map((item, i) => ({
    text: item.char,
    status: 'neutral' as const,
    key: i
  }));

  return { userCopy, correctText };
}