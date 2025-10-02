/**
 * Live Copy Mode - Emission Logic
 *
 * Handles audio playback with inter-character spacing for Live Copy mode.
 * - Play audio (wait for completion)
 * - Add standard inter-character spacing
 * - No input handling (UI owns that)
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { IO } from '../../runtime/io';
import type { Clock } from '../../runtime/clock';
import { calculateFarnsworthSpacingMs } from '../../../../core/morse/timing';
import { debug } from '../../../../core/debug';

/**
 * Run a Live Copy mode emission
 * - Play audio (wait for completion)
 * - Add standard inter-character spacing
 * - No input handling (UI owns that)
 */
export async function runLiveCopyEmission(
  cfg: SessionConfig,
  char: string,
  io: IO,
  clock: Clock,
  sessionSignal: AbortSignal
): Promise<void> {
  // Play audio and wait for completion (similar to Listen mode)
  try {
    await io.playChar(char, cfg.wpm);
  } catch (error) {
    debug.warn(`Audio failed for char: ${char}`, error);
  }

  // Add inter-character spacing for Live Copy mode with Farnsworth support
  // This simulates real Morse transmission timing
  const interCharSpacingMs = calculateFarnsworthSpacingMs(cfg.wpm, cfg.farnsworthWpm);
  await clock.sleep(interCharSpacingMs, sessionSignal);
}
