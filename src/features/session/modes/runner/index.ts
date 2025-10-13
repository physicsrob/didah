/**
 * Runner Mode
 *
 * Endless runner mini-game where you type letters to jump over obstacles.
 * Features progressive difficulty across 10 levels with mock morse audio.
 */

import type { ModeDefinition } from '../shared/types';
import { handleRunnerCharacter } from './handler';
import { RunnerDisplay, useRunnerInput } from './ui';

export const runnerMode: ModeDefinition = {
  id: 'runner',
  displayName: 'Morse Runner',
  description: 'Endless runner mini-game - type letters to jump over obstacles',

  // Emission behavior
  emissionGranularity: 'character',

  // Config capabilities - runner manages everything internally
  usesSpeedTier: false,   // Game has its own speed progression via levels
  usesFeedback: false,    // Game has its own visual/audio feedback
  usesReplay: false,      // Not applicable to runner gameplay
  usesStats: false,       // Game tracks its own level/score

  // Implementation
  handleCharacter: handleRunnerCharacter,
  renderDisplay: RunnerDisplay,
  useKeyboardInput: useRunnerInput,
};

// Re-export for testing and advanced usage
export { runRunnerEmission } from './emission';
export { handleRunnerCharacter } from './handler';
export { RunnerDisplay, useRunnerInput } from './ui';
