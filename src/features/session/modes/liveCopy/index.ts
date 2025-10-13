/**
 * Live Copy Mode
 *
 * Copying experience that more closely simulates real morse code copy -- no
 * controlling the transmission pacing, no feedback during the session. You type
 * what you hear, and all corrections are revealed only at the end of the session.
 */

import type { ModeDefinition } from '../shared/types';
import { handleLiveCopyCharacter } from './handler';
import { LiveCopyDisplay, useLiveCopyInput } from './ui';

export const liveCopyMode: ModeDefinition = {
  id: 'live-copy',
  displayName: 'Live Copy',
  description: 'Real-time copying with end-of-session corrections',

  // Emission behavior
  emissionGranularity: 'character',

  // Config capabilities
  usesSpeedTier: false,
  usesFeedback: false,
  usesReplay: false,
  usesStats: false, // Live Copy has different stats (accuracy calculation at end)

  // Implementation
  handleCharacter: handleLiveCopyCharacter,
  renderDisplay: LiveCopyDisplay,
  useKeyboardInput: useLiveCopyInput,
};

// Re-export for testing and advanced usage
export { runLiveCopyEmission } from './emission';
export { handleLiveCopyCharacter } from './handler';
export { LiveCopyDisplay, useLiveCopyInput } from './ui';
