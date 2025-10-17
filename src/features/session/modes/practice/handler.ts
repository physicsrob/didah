/**
 * Practice Mode - Handler Logic
 *
 * Session-level orchestration for Practice mode.
 * Manages stats, history, replay, and spacing.
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import { runPracticeEmission } from './emission';
import { getInterCharacterSpacingMs } from '../../../../core/morse/timing';
import { debug } from '../../../../core/debug';

export async function handlePracticeCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal,
  _nextChar: string | null,
  _hasSpaceAfter: boolean
): Promise<void> {
  const outcome = await runPracticeEmission(
    config,
    char,
    ctx.io,
    ctx.input,
    ctx.clock,
    signal
  );

  ctx.updateStats(outcome);

  // Update history IMMEDIATELY
  if (!ctx.snapshot.practiceState) {
    throw new Error('Practice mode handler called but practiceState not initialized');
  }
  const historyItem = { char, result: outcome as 'correct' | 'incorrect' | 'timeout' };
  ctx.updateSnapshot({
    practiceState: {
      ...ctx.snapshot.practiceState,
      previous: [...ctx.snapshot.practiceState.previous, historyItem],
    }
  });

  // Update remaining time
  ctx.updateRemainingTime(startTime, config);

  // Publish immediately so UI updates right away
  ctx.publish();

  // Handle replay AFTER history update (for incorrect or timeout)
  if (config.replay && (outcome === 'incorrect' || outcome === 'timeout') && ctx.io.replay) {
    debug.log(`[Session] Replaying character '${char}' after ${outcome}`);
    await ctx.io.replay(char, config.wpm);
  }

  // Add inter-character spacing after any incorrect or timeout (with or without replay)
  if (outcome === 'incorrect' || outcome === 'timeout') {
    const interCharSpacingMs = getInterCharacterSpacingMs(config.wpm);
    debug.log(`[Spacing] Adding post-error spacing: ${interCharSpacingMs}ms (3 dits)`);
    await ctx.clock.sleep(interCharSpacingMs, signal);
  }
}
