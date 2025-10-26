/**
 * Learn Mode Handler (Phase 4)
 *
 * Integrates emission logic with session runtime.
 * Handles practice sequence initialization and session completion.
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import { runLearnEmission } from './emission';
import { debug } from '../../../../core/debug';
import { LEARN_SESSION_LENGTH, getNewCharactersForLesson } from '../../../../../functions/shared/koch';

/**
 * Handle a single character in Learn Mode
 *
 * On first call:
 * - Initializes practice sequence from sourceContent
 * - Determines new characters for this lesson (for adaptive reveal)
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
    debug.log('[Learn] First call - initializing practice sequence and new chars');

    // Get practice sequence from sourceContent
    const practiceText = ctx.sourceContent.text.slice(0, LEARN_SESSION_LENGTH);
    debug.log(`[Learn] Practice sequence: ${practiceText} (${practiceText.length} chars)`);

    // Get new characters for this lesson (for adaptive reveal)
    const lesson = config.learnLesson!;
    const newCharsForLesson = getNewCharactersForLesson(lesson);
    const newChars = newCharsForLesson.map(c => c.toUpperCase());
    debug.log(`[Learn] New characters for lesson ${lesson}: ${newChars.join(', ')}`);

    // Build updated state
    currentLearnState = {
      ...currentLearnState,
      practiceSequence: practiceText,
      newChars: newChars
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

  // Check if session complete BEFORE incrementing index
  const newIndex = state.currentIndex + 1;
  const isComplete = newIndex >= LEARN_SESSION_LENGTH;

  // Update state with result (don't increment if complete to avoid showing 21/20)
  ctx.updateSnapshot({
    learnState: {
      ...result.state,
      currentIndex: isComplete ? state.currentIndex : newIndex
    }
  });
  ctx.publish();

  // Update remaining time (Learn Mode has no timeout, but we still track elapsed time)
  ctx.updateRemainingTime(startTime, config);

  // End session if complete
  if (isComplete) {
    debug.log(`[Learn] Session complete - ${LEARN_SESSION_LENGTH} characters done`);
    ctx.requestQuit();
  }
}
