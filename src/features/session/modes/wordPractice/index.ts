/**
 * Word Practice Mode Definition
 *
 * Multiple choice word recognition mode.
 * Users select correct word from 3 buttons after hearing it.
 */

import type { ModeDefinition } from '../shared/types';
import { handleWordPracticeWord } from './handler';
import { WordPracticeDisplay, useWordPracticeInput } from './ui';

export const wordPracticeMode: ModeDefinition = {
  id: 'word-practice',
  displayName: 'Word Practice',
  description: 'Multiple choice word recognition - select the word you hear from 3 options',

  // Emission behavior
  emissionGranularity: 'word',

  // Config capabilities
  usesSpeedTier: false,   // Uses Farnsworth timing instead
  usesFeedback: false,    // Visual feedback only (green/red flash)
  usesReplay: false,      // Always replays on incorrect (not configurable)
  usesStats: true,        // Tracks word accuracy

  // Implementation
  handleCharacter: handleWordPracticeWord,
  renderDisplay: WordPracticeDisplay,
  useKeyboardInput: useWordPracticeInput,
};

// Re-export for testing
export { handleWordPracticeWord } from './handler';
export { WordPracticeDisplay, useWordPracticeInput } from './ui';
