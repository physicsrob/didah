/**
 * Type-safe mode registry
 *
 * This registry ensures all SessionMode values have a registered mode implementation.
 */

import { practiceMode } from '../practice';
import type { SessionMode } from '../../../../core/types/domain';
import type { ModeDefinition } from './types';

/**
 * Temporary: Partial registry during incremental migration
 * Will become Record<SessionMode, ModeDefinition> once all modes are migrated
 */
export const MODE_REGISTRY: Partial<Record<SessionMode, ModeDefinition>> = {
  'practice': practiceMode,
};

/**
 * Get a mode definition safely
 * @throws if mode is not yet migrated
 */
export function getMode(mode: SessionMode): ModeDefinition {
  const def = MODE_REGISTRY[mode];
  if (!def) {
    throw new Error(`Mode not yet migrated: ${mode}`);
  }
  return def;
}
