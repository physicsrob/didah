/**
 * Learn Mode (Phase 0 Stub)
 *
 * Koch method-based onboarding experience for users learning Morse code from scratch.
 * Provides structured progression through 20 levels with adaptive reveal for first
 * encounters with un-mastered characters.
 *
 * This is a skeleton implementation for Phase 0.
 * Full implementation will be completed in later phases.
 *
 * NOTE: Backend mode identifier is 'learn', but UI displays "Morse Lessons"
 */

import type { ModeDefinition } from '../shared/types';
import { handleLearnCharacter } from './handler';
import { LearnDisplay, useLearnInput } from './ui';

export const learnMode: ModeDefinition = {
  id: 'learn',
  displayName: 'Morse Lessons',
  description: 'Koch method progression for learning from scratch',

  // UI metadata
  icon: '🎓',
  shortDescription: 'Start here to learn morse code from scratch using the Koch method.',
  longDescription: 'Learn Morse code from scratch using the Koch method. Progress through 20 lessons, mastering 2 new characters at a time. Type what you hear, and proceed to the next lesson after you\'ve reached at least one star (max 3 mistakes).',

  // Emission behavior
  emissionGranularity: 'character',

  // Config capabilities
  usesSpeedTier: false,  // Learn Mode has fixed speed tier ('slow')
  usesFeedback: false,   // Learn Mode has custom feedback behavior
  usesReplay: false,     // Learn Mode has built-in replay
  usesStats: true,

  // Implementation (stubs for now)
  handleCharacter: handleLearnCharacter,
  renderDisplay: LearnDisplay,
  useKeyboardInput: useLearnInput,
};

export { handleLearnCharacter } from './handler';
export { LearnDisplay, useLearnInput } from './ui';
