/**
 * Listen Mode - Emission Logic
 *
 * Handles audio playback with timed reveal for Listen mode.
 * - Play audio (wait for completion)
 * - Wait standard spacing before reveal
 * - Reveal character
 * - Wait standard spacing after reveal
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { IO } from '../../runtime/io';
import type { Clock } from '../../runtime/clock';
import { getListenModeTimingMs } from '../../../../core/morse/timing';
import { debug } from '../../../../core/debug';

/**
 * Run a Listen mode emission
 * - Play audio (wait for completion)
 * - Wait standard spacing before reveal
 * - Reveal character
 * - Wait standard spacing after reveal
 */
export async function runListenEmission(
  cfg: SessionConfig,
  char: string,
  io: IO,
  clock: Clock,
  sessionSignal: AbortSignal
): Promise<void> {
  const emissionStart = clock.now();

  // Hide any previous character
  io.hide();

  // Log emission start
  io.log({ type: 'emission', at: emissionStart, char });

  // Play audio and wait for completion
  try {
    await io.playChar(char, cfg.wpm);
  } catch (error) {
    debug.warn(`Audio failed for char: ${char}`, error);
  }

  // Get listen mode timing with Farnsworth support
  const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(cfg.wpm, cfg.farnsworthWpm);

  // Wait before revealing character
  await clock.sleep(preRevealDelayMs, sessionSignal);

  // Reveal character
  io.reveal(char);

  // Wait after revealing character
  await clock.sleep(postRevealDelayMs, sessionSignal);
}
