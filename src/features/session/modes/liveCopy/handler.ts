/**
 * Live Copy Mode - Handler Logic
 *
 * Session-level orchestration for Live Copy mode.
 * Manages timing and state (no stats, no history, no feedback during session).
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import { runLiveCopyEmission } from './emission';

export async function handleLiveCopyCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal,
  _nextChar: string | null
): Promise<void> {
  // Log emission event (needed for evaluation at session end)
  const emissionStart = ctx.clock.now();
  ctx.io.log({ type: 'emission', at: emissionStart, char });

  await runLiveCopyEmission(config, char, ctx.io, ctx.clock, signal);

  // Live Copy mode only updates timing
  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
