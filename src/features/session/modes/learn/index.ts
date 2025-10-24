/**
 * Learn Mode (Phase 0 Stub)
 *
 * Koch method-based onboarding experience for users learning Morse code from scratch.
 * Provides structured progression through 20 levels with adaptive reveal for first
 * encounters with un-mastered characters.
 *
 * This is a skeleton implementation for Phase 0.
 * Full implementation will be completed in later phases.
 */

import type { ModeDefinition } from '../shared/types';
import { handleLearnCharacter } from './handler';
import { LearnDisplay, useLearnInput } from './ui';

export const learnMode: ModeDefinition = {
  id: 'learn',
  displayName: 'Learn Mode',
  description: 'Koch method progression for learning from scratch',

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
