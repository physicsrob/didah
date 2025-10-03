/**
 * Type-safe mode registry
 *
 * This registry ensures all SessionMode values have a registered mode implementation.
 */

import { practiceMode } from '../practice';
import { listenMode } from '../listen';
import { liveCopyMode } from '../liveCopy';
import { wordPracticeMode } from '../wordPractice';
import type { SessionMode } from '../../../../core/types/domain';
import type { ModeDefinition } from './types';

/**
 * Type-safe mode registry
 *
 * TypeScript enforces:
 * - All SessionMode values have a registered mode
 * - All registered modes implement ModeDefinition
 * - Cannot add a mode without registering it here
 */
export const MODE_REGISTRY: Record<SessionMode, ModeDefinition> = {
  'practice': practiceMode,
  'listen': listenMode,
  'live-copy': liveCopyMode,
  'word-practice': wordPracticeMode,
};

/**
 * Get a mode definition safely
 * @throws if mode is not registered (should never happen with proper types)
 */
export function getMode(mode: SessionMode): ModeDefinition {
  const def = MODE_REGISTRY[mode];
  if (!def) {
    throw new Error(`Unknown mode: ${mode}`);
  }
  return def;
}
