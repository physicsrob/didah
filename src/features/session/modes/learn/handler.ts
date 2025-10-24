/**
 * Learn Mode Handler (Phase 4)
 *
 * Integrates emission logic with session runtime.
 * Handles stats query, practice sequence initialization, and session completion.
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import { runLearnEmission } from './emission';
import { debug } from '../../../../core/debug';

/**
 * Handle a single character in Learn Mode
 *
 * On first call:
 * - Initializes practice sequence from sourceContent (50 characters)
 * - Queries user's historical stats to determine un-mastered characters
 *
 * On each call:
 * - Delegates to emission logic with adaptive reveal
 * - Updates learnState with result
 * - Checks if session complete (50 characters done)
 */
export async function handleLearnCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal,
  _nextChar: string | null,
  _hasSpaceAfter: boolean
): Promise<void> {
  // Verify state is initialized
  if (!ctx.snapshot.learnState) {
    throw new Error('Learn mode handler called but learnState not initialized');
  }

  // Lazy initialization on first call
  if (ctx.snapshot.learnState.practiceSequence === '') {
    debug.log('[Learn] First call - initializing practice sequence and un-mastered chars');

    // Get practice sequence from sourceContent (take first 50 characters)
    const practiceText = ctx.sourceContent.text.slice(0, 50);
    debug.log(`[Learn] Practice sequence: ${practiceText} (${practiceText.length} chars)`);

    // TODO Phase 4: Query user's historical stats to determine un-mastered characters
    // For now, treat all characters as un-mastered (will be implemented with stats query)
    const levelChars = config.effectiveAlphabet;
    const unmasteredChars = Array.from(new Set(levelChars.map(c => c.toUpperCase())));
    debug.log(`[Learn] Un-mastered characters: ${unmasteredChars.join(', ')}`);

    // Update state with initialization
    ctx.updateSnapshot({
      learnState: {
        ...ctx.snapshot.learnState,
        practiceSequence: practiceText,
        unmasteredChars
      }
    });
    ctx.publish();
  }

  // Run emission with adaptive reveal
  const state = ctx.snapshot.learnState;
  const result = await runLearnEmission(
    config,
    char,
    state,
    ctx.io,
    ctx.input,
    ctx.clock,
    signal,
    (newState) => {
      ctx.updateSnapshot({ learnState: newState });
      ctx.publish();
    }
  );

  // Update state with result
  ctx.updateSnapshot({
    learnState: {
      ...result.state,
      currentIndex: state.currentIndex + 1
    }
  });
  ctx.publish();

  // Update remaining time (Learn Mode has no timeout, but we still track elapsed time)
  ctx.updateRemainingTime(startTime, config);

  // Log statistics based on outcome
  // Outcomes: 'shown' (first encounter), 'correct' (quiz correct), 'incorrect' (quiz wrong)
  // Note: Emission logic already logs events, but we track them in stats too
  switch (result.outcome) {
    case 'shown':
      // First encounters always count as correct
      // (already logged by emission logic)
      break;
    case 'correct':
      // Quiz mode correct
      // (already logged by emission logic)
      break;
    case 'incorrect':
      // Quiz mode incorrect
      // (already logged by emission logic)
      break;
  }

  // Check if session complete (50 characters done)
  const newIndex = state.currentIndex + 1;
  if (newIndex >= 50) {
    debug.log('[Learn] Session complete - 50 characters done');
    ctx.requestQuit();
  }
}
