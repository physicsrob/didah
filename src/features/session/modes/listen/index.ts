/**
 * Listen Mode
 *
 * Passive listening experience where Morse code is played and then revealed
 * on screen after a timed delay. Ideal for familiarizing yourself with Morse
 * patterns without pressure.
 */

import type { ModeDefinition } from '../shared/types';
import { handleListenCharacter } from './handler';
import { ListenDisplay, useListenInput } from './ui';

export const listenMode: ModeDefinition = {
  id: 'listen',
  displayName: 'Listen',
  description: 'Passive listening with delayed reveal',

  // Config capabilities
  usesSpeedTier: false,
  usesFeedback: false,
  usesReplay: false,
  usesStats: false,

  // Implementation
  handleCharacter: handleListenCharacter,
  renderDisplay: ListenDisplay,
  useKeyboardInput: useListenInput,
};

// Re-export for testing and advanced usage
export { runListenEmission } from './emission';
export { handleListenCharacter } from './handler';
export { ListenDisplay, useListenInput } from './ui';
