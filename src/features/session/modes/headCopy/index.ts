/**
 * Head Copy Mode Definition
 *
 * Multiple choice word recognition mode.
 * Users select correct word from 3 buttons after hearing it.
 */

import type { ModeDefinition } from '../shared/types';
import { handleHeadCopyWord } from './handler';
import { HeadCopyDisplay, useHeadCopyInput } from './ui';

export const headCopyMode: ModeDefinition = {
  id: 'head-copy',
  displayName: 'Head Copy',
  description: 'Multiple choice whole-word recognition. Select the correct word to build up fluency and the ability to head copy.',

  // Emission behavior
  emissionGranularity: 'word',

  // Config capabilities
  usesSpeedTier: false,   // Uses Farnsworth timing instead
  usesFeedback: false,    // Visual feedback only (green/red flash)
  usesReplay: false,      // Always replays on incorrect (not configurable)
  usesStats: true,        // Tracks word accuracy

  // Implementation
  handleCharacter: handleHeadCopyWord,
  renderDisplay: HeadCopyDisplay,
  useKeyboardInput: useHeadCopyInput,
};

// Re-export for testing
export { handleHeadCopyWord } from './handler';
export { HeadCopyDisplay, useHeadCopyInput } from './ui';
