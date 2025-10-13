/**
 * Listen Mode
 *
 * Passive listening experience where Morse code is played and then revealed
 * on screen after a timed delay. Ideal for familiarizing yourself with Morse
 * patterns without pressure.
 */

import type { ModeDefinition } from '../shared/types';
import { handleListenCharacter } from './handler';
import { ListenDisplay } from './ui';

export const listenMode: ModeDefinition = {
  id: 'listen',
  displayName: 'Listen',
  description: 'Passive listening with delayed reveal',

  // Emission behavior
  emissionGranularity: 'character',

  // Config capabilities
  usesSpeedTier: false,
  usesFeedback: false,
  usesReplay: false,
  usesStats: false,

  // Implementation
  handleCharacter: handleListenCharacter,
  renderDisplay: ListenDisplay,
  // No keyboard input needed for Listen mode
};

// Re-export for testing and advanced usage
export { runListenEmission } from './emission';
export { handleListenCharacter } from './handler';
export { ListenDisplay } from './ui';
