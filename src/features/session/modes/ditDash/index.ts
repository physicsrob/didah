/**
 * Dit Dash Mode
 *
 * Endless runner mini-game where you type letters to jump over obstacles.
 * Features progressive difficulty across 10 levels with mock morse audio.
 */

import type { ModeDefinition } from '../shared/types';
import { handleDitDashCharacter } from './handler';
import { DitDashDisplay, useDitDashInput } from './ui';

export const ditDashMode: ModeDefinition = {
  id: 'ditDash',
  displayName: 'Dit Dash',
  description: 'Endless runner mini-game - type letters to jump over obstacles',

  // UI metadata
  icon: '🏃',
  shortDescription: 'Endless runner mini-game! Type letters to jump over obstacles.',
  longDescription: 'Endless runner mini-game - type letters to jump over obstacles! Progress through 10 levels with increasing speed and difficulty.',

  // Emission behavior
  emissionGranularity: 'character',

  // Config capabilities - ditDash manages everything internally
  usesSpeedTier: false,   // Game has its own speed progression via levels
  usesFeedback: false,    // Game has its own visual/audio feedback
  usesReplay: false,      // Not applicable to ditDash gameplay
  usesStats: false,       // Game tracks its own level/score

  // Implementation
  handleCharacter: handleDitDashCharacter,
  renderDisplay: DitDashDisplay,
  useKeyboardInput: useDitDashInput,
};

// Re-export for testing and advanced usage
export { runDitDashEmission } from './emission';
export { handleDitDashCharacter } from './handler';
export { DitDashDisplay, useDitDashInput } from './ui';
