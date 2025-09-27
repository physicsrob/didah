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

