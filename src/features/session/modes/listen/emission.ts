/**
 * Listen Mode - Emission Logic
 *
 * Handles audio playback with configurable display offset for Listen mode.
 * The display offset ratio controls when the character appears relative to its audio:
 * - Negative: show before audio starts
 * - Zero: show when audio starts
 * - Positive: show during/after audio
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import { calculateCharacterDurationMs, getInterCharacterSpacingMs, getListenModeTimingMs } from '../../../../core/morse/timing';
import { debug } from '../../../../core/debug';

/**
 * Run a Listen mode emission with configurable display timing
 */
export async function runListenEmission(
  cfg: SessionConfig,
  char: string,
  ctx: HandlerContext,
  sessionSignal: AbortSignal
): Promise<void> {
  const emissionStart = ctx.clock.now();

  // Log emission start
  ctx.io.log({ type: 'emission', at: emissionStart, char });

  // Calculate character duration and display offset
  const charDuration = calculateCharacterDurationMs(char, cfg.wpm, cfg.extraWordSpacing);
  const offsetMs = cfg.listenTimingOffset * charDuration;

  // Helper to add character to display at the current time
  const addToDisplay = () => {
    const interCharSpacingMs = getInterCharacterSpacingMs(cfg.wpm);
    const totalEmissionDurationMs = charDuration + interCharSpacingMs;

    ctx.snapshot.emissions.push({
      char,
      startTime: ctx.clock.now(),
      duration: totalEmissionDurationMs
    });
    ctx.publish();
  };

  // Negative offset: Show character BEFORE audio starts
  if (offsetMs < 0) {
    addToDisplay();
    await ctx.clock.sleep(-offsetMs, sessionSignal);
  }

  // Zero offset: Show at audio start
  if (offsetMs === 0) {
    addToDisplay();
  }

  // Play audio and wait for completion
  try {
    await ctx.io.playChar(char, cfg.wpm);
  } catch (error) {
    debug.warn(`Audio failed for char: ${char}`, error);
  }

  // Positive offset: Show character DURING/AFTER audio
  if (offsetMs > 0) {
    await ctx.clock.sleep(offsetMs, sessionSignal);
    addToDisplay();
  }

  // Standard post-audio spacing
  const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(cfg.wpm, cfg.farnsworthWpm);
  await ctx.clock.sleep(preRevealDelayMs + postRevealDelayMs, sessionSignal);
}
