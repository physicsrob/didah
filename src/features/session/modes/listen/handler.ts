/**
 * Listen Mode - Handler Logic
 *
 * Session-level orchestration for Listen mode.
 * Manages history and timing (no stats, no replay, no feedback).
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import { runListenEmission } from './emission';
import { calculateCharacterDurationMs, getInterCharacterSpacingMs } from '../../../../core/morse/timing';

export async function handleListenCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal,
  _nextChar: string | null,
  hasSpaceAfter: boolean
): Promise<void> {
  await runListenEmission(config, char, ctx, signal);

  // Word-level reveal mode: buffer characters until word boundary
  if (config.listenTimingOffset === 'word') {
    // Ensure listenState is initialized
    if (!ctx.snapshot.listenState) {
      ctx.snapshot.listenState = { bufferedWord: [] };
    }

    // Buffer non-space characters first
    if (char !== ' ') {
      ctx.snapshot.listenState.bufferedWord.push(char);
    }

    // Word boundary detected: reveal the buffered word
    const isWordEnd = hasSpaceAfter || char === ' ';
    if (isWordEnd && ctx.snapshot.listenState.bufferedWord.length > 0) {
      // Add all buffered characters to emissions at once
      const now = ctx.clock.now();
      const interCharSpacingMs = getInterCharacterSpacingMs(config.wpm);

      for (const bufferedChar of ctx.snapshot.listenState.bufferedWord) {
        const charDuration = calculateCharacterDurationMs(bufferedChar, config.wpm, config.extraWordSpacing);
        const totalEmissionDurationMs = charDuration + interCharSpacingMs;

        ctx.snapshot.emissions.push({
          char: bufferedChar,
          startTime: now,
          duration: totalEmissionDurationMs
        });
      }

      // Clear the buffer for the next word
      ctx.snapshot.listenState.bufferedWord = [];
    }

    // If current character is a space, add it to emissions after revealing the word
    if (char === ' ') {
      const now = ctx.clock.now();
      const interCharSpacingMs = getInterCharacterSpacingMs(config.wpm);
      const spaceDuration = calculateCharacterDurationMs(' ', config.wpm, config.extraWordSpacing);
      const totalEmissionDurationMs = spaceDuration + interCharSpacingMs;

      ctx.snapshot.emissions.push({
        char: ' ',
        startTime: now,
        duration: totalEmissionDurationMs
      });
    }
  }

  // Character-level reveal mode: emissions already handled in runListenEmission
  // No additional work needed here

  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
