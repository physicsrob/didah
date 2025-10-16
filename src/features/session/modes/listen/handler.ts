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
  signal: AbortSignal,
  _nextChar: string | null
): Promise<void> {
  await runListenEmission(config, char, ctx, signal);

  // Listen mode displays emissions directly, no need to maintain separate history
  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
