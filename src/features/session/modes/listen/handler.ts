/**
 * Listen Mode - Handler Logic
 *
 * Session-level orchestration for Listen mode.
 * Manages history and timing (no stats, no replay, no feedback).
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import { runListenEmission } from './emission';

export async function handleListenCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal
): Promise<void> {
  await runListenEmission(config, char, ctx.io, ctx.clock, signal);

  // For listen mode, add to history after emission
  const historyItem = { char, result: 'listen' as const };
  ctx.updateSnapshot({
    previous: [...ctx.snapshot.previous, historyItem],
    currentChar: null,
  });

  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
