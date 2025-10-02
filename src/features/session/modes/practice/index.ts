/**
 * Practice Mode
 *
 * Interactive training where you type what you hear in real-time with
 * immediate feedback. User has some control of pacing up to timeout.
 */

import type { ModeDefinition } from '../shared/types';
import { handlePracticeCharacter } from './handler';
import { PracticeDisplay, usePracticeInput } from './ui';

export const practiceMode: ModeDefinition = {
  id: 'practice',
  displayName: 'Practice',
  description: 'Interactive training with immediate feedback',

  // Config capabilities
  usesSpeedTier: true,
  usesFeedback: true,
  usesReplay: true,
  usesStats: true,

  // Implementation
  handleCharacter: handlePracticeCharacter,
  renderDisplay: PracticeDisplay,
  useKeyboardInput: usePracticeInput,
};

// Re-export for testing and advanced usage
export { runPracticeEmission } from './emission';
export { handlePracticeCharacter } from './handler';
export { PracticeDisplay, usePracticeInput } from './ui';
