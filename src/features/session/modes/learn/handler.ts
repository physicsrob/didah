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
import { PRACTICE_SESSION_LENGTH } from '../../../../../functions/shared/koch';

/**
 * Handle a single character in Learn Mode
 *
 * On first call:
 * - Initializes practice sequence from sourceContent
 * - Queries user's historical stats to determine un-mastered characters
 *
 * On each call:
 * - Delegates to emission logic with adaptive reveal
 * - Updates learnState with result
 * - Checks if session complete
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
  let currentLearnState = ctx.snapshot.learnState;

  if (currentLearnState.practiceSequence === '') {
    debug.log('[Learn] First call - initializing practice sequence and un-mastered chars');

    // Get practice sequence from sourceContent
    const practiceText = ctx.sourceContent.text.slice(0, PRACTICE_SESSION_LENGTH);
    debug.log(`[Learn] Practice sequence: ${practiceText} (${practiceText.length} chars)`);

    // Get un-mastered characters from config (queried before session start)
    // If not provided (e.g., in tests), fall back to treating all as un-mastered
    const unmasteredChars = config.learnUnmasteredChars
      ? config.learnUnmasteredChars.map(c => c.toUpperCase())
      : config.effectiveAlphabet.map(c => c.toUpperCase());
    debug.log(`[Learn] Un-mastered characters: ${unmasteredChars.join(', ')}`);

    // Build updated state
    currentLearnState = {
      ...currentLearnState,
      practiceSequence: practiceText,
      unmasteredChars
    };

    // Update state with initialization
    ctx.updateSnapshot({
      learnState: currentLearnState
    });
    ctx.publish();
  }

  // Run emission with adaptive reveal
  const state = currentLearnState;
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

  // Check if session complete
  const newIndex = state.currentIndex + 1;
  if (newIndex >= PRACTICE_SESSION_LENGTH) {
    debug.log(`[Learn] Session complete - ${PRACTICE_SESSION_LENGTH} characters done`);
    ctx.requestQuit();
  }
}
