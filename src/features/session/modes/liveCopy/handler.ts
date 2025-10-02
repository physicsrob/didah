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
  signal: AbortSignal
): Promise<void> {
  await runLiveCopyEmission(config, char, ctx.io, ctx.clock, signal);

  // Clear current character after emission
  ctx.updateSnapshot({ currentChar: null });

  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
