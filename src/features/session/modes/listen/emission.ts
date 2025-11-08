/**
 * Listen Mode - Emission Logic
 *
 * Handles audio playback with configurable display offset for Listen mode.
 * The display offset controls when the character appears after audio starts:
 * - 0s: show immediately when audio starts
 * - 0.5s/1.0s/1.5s: show N seconds after audio starts
 *
 * Display timing is asynchronous and does not affect audio playback intervals.
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

  // Word-level reveal mode: just play audio, handler manages display
  if (cfg.listenTimingOffset === 'word') {
    try {
      await ctx.io.playChar(char, cfg.wpm);
    } catch (error) {
      debug.warn(`Audio failed for char: ${char}`, error);
    }

    // Standard post-audio spacing
    const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(cfg.wpm, cfg.farnsworthWpm);
    await ctx.clock.sleep(preRevealDelayMs + postRevealDelayMs, sessionSignal);
    return;
  }

  // Character-level reveal mode: use timing offset (in seconds)
  const charDuration = calculateCharacterDurationMs(char, cfg.wpm, cfg.extraWordSpacing);
  const offsetMs = cfg.listenTimingOffset * 1000; // Convert seconds to milliseconds

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

  // Schedule display asynchronously (don't block audio timeline)
  if (offsetMs === 0) {
    // Zero offset: Show immediately (synchronously)
    addToDisplay();
  } else {
    // Positive offset: Schedule display after delay (asynchronously)
    // Use void to explicitly ignore the promise (fire-and-forget)
    void (async () => {
      try {
        await ctx.clock.sleep(offsetMs, sessionSignal);
        addToDisplay();
      } catch (error) {
        // Aborted - expected during session termination
        if (error instanceof Error && error.message !== 'Aborted') {
          debug.warn(`Display scheduling failed for char: ${char}`, error);
        }
      }
    })();
  }

  // Main audio timeline (always the same duration regardless of display offset)
  try {
    await ctx.io.playChar(char, cfg.wpm);
  } catch (error) {
    debug.warn(`Audio failed for char: ${char}`, error);
  }

  // Standard post-audio spacing
  const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(cfg.wpm, cfg.farnsworthWpm);
  await ctx.clock.sleep(preRevealDelayMs + postRevealDelayMs, sessionSignal);
}
