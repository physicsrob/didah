/**
 * Transformation functions for CharacterDisplay component
 *
 * Convert various data formats to DisplayCharacter arrays
 */

import type { CharacterStatus, DisplayCharacter } from './CharacterDisplay';

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
 * Used by Live Copy mode
 */
export function liveCopyToDisplay(
  display: Array<{
    char: string;
    status: 'pending' | 'correct' | 'wrong' | 'missed';
    typed?: string;
    revealed: boolean;
  }>
): DisplayCharacter[] {
  return display.map((item, i) => {
    // Determine what text to show
    let text = item.char; // Default to correct character

    // Check revealed first - if revealed, always show the correct character
    if (item.revealed) {
      // Revealed - show the correct character
      text = item.char;
    } else if (item.status === 'pending' && item.typed) {
      // User typed something, not evaluated/revealed yet - show what they typed
      text = item.typed;
    } else if (!item.revealed && item.typed) {
      // Not revealed yet but user typed - show what they typed
      text = item.typed;
    } else if (item.status === 'missed' && !item.revealed) {
      // Missed and not revealed - show placeholder
      text = '_';
    } else if (item.status === 'pending' && !item.typed) {
      // Nothing typed yet in pending window
      text = '_';
    }

    // Map status to visual state
    let status: CharacterStatus;
    if (!item.revealed && item.status !== 'pending') {
      // Not revealed yet (end mode) - show as pending
      status = 'pending';
    } else if (item.status === 'pending') {
      status = 'pending';
    } else if (item.status === 'correct') {
      status = 'correct';
    } else if (item.status === 'wrong') {
      status = 'incorrect';
    } else if (item.status === 'missed') {
      status = 'missed';
    } else {
      status = 'neutral';
    }

    return { text, status, key: i };
  });
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
    revealed: boolean;
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