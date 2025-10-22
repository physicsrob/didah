/**
 * Dit Dash Mode - Emission Logic
 *
 * Dit Dash mode doesn't use per-character emission.
 * The game manages its own loop and character generation.
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { IO } from '../../runtime/io';
import type { Clock } from '../../runtime/clock';

/**
 * Stub emission function for ditDash mode.
 * The game handles its own character flow internally.
 */
export async function runDitDashEmission(
  _config: SessionConfig,
  _char: string,
  _io: IO,
  _clock: Clock,
  _signal: AbortSignal
): Promise<void> {
  // No-op - ditDash game manages its own internal loop
  // This function exists to satisfy the mode interface
}
