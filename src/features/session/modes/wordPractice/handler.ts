/**
 * Word Practice Mode - Handler Logic
 *
 * Integrates word practice emission with session lifecycle.
 * Handles retry logic for incorrect answers.
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import type { WordPracticeState } from '../../runtime/io';
import { playWordAudio, waitForWordClick } from './emission';
import { debug } from '../../../../core/debug';
import { shuffleArray } from '../../../../core/utils/array';

/**
 * Flash duration for visual feedback (green/red)
 */
const FLASH_DURATION_MS = 500;

/**
 * Helper to update word practice state
 * Reduces verbosity by handling the spread and optional field preservation
 */
function updateWordPracticeState(
  ctx: HandlerContext,
  updates: Partial<WordPracticeState>
): void {
  if (!ctx.snapshot.wordPracticeState) {
    throw new Error('Word Practice state not initialized');
  }

  ctx.updateSnapshot({
    wordPracticeState: {
      ...ctx.snapshot.wordPracticeState,
      ...updates
    }
  });
}

/**
 * Fetch distractors for a word from the distractors API
 * Returns distractors array or null if unable to fetch
 */
async function fetchDistractors(word: string): Promise<string[] | null> {
  try {
    const response = await fetch(`/api/distractors?word=${encodeURIComponent(word)}`);
    if (!response.ok) {
      debug.log(`[WordPractice] Unable to get distractors for "${word}": ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.distractors;
  } catch (error) {
    debug.log(`[WordPractice] Failed to fetch distractors for "${word}":`, error);
    return null;
  }
}

/**
 * Handle a single word in Word Practice mode
 *
 * Flow:
 * 1. Parse word entry from char parameter (JSON-encoded)
 * 2. Set state to show word is playing
 * 3. Play word and wait for button click
 * 4. Flash result (green/red)
 * 5. Wait 500ms
 * 6. If incorrect: Replay word (goto step 3)
 * 7. If correct: Move to next word
 *
 * State updates:
 * - currentWord: The word being tested
 * - distractors: The distractor words for buttons
 * - isPlaying: Whether audio is currently playing
 * - flashResult: Visual feedback (correct/incorrect/null)
 * - stats: Attempt-based accuracy tracking
 */
export async function handleWordPracticeWord(
  config: SessionConfig,
  char: string,  // Plain word (e.g., "the", "hello")
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal,
  _nextChar: string | null
): Promise<void> {
  // Verify state is initialized
  if (!ctx.snapshot.wordPracticeState) {
    throw new Error('Word Practice mode handler called but wordPracticeState not initialized');
  }

  // Fetch distractors from API
  const word = char.toLowerCase();
  const distractors = await fetchDistractors(word);

  // Skip this word if we can't get distractors
  if (distractors === null) {
    debug.log(`[WordPractice] Skipping word "${word}" - no distractors available`);
    return;
  }

  // Shuffle button order ONCE for this word (stays same across retries)
  const buttonWords = shuffleArray([word, ...distractors]);
  debug.log(`[WordPractice Handler] Shuffled button order:`, buttonWords);

  let isCorrect = false;
  let isFirstTrial = true;

  // Retry loop - keep trying until correct or session ends
  while (!isCorrect) {
    // Check if paused and wait for resume before starting new trial
    await ctx.waitIfPaused();

    const emissionStart = ctx.clock.now();
    debug.log(`[WordPractice Handler] Starting trial for word '${word}' (first: ${isFirstTrial})`);

    // Log emission event (for statistics)
    ctx.io.log({ type: 'emission', at: emissionStart, char: word });

    // On first trial: hide buttons during audio playback
    // On retry (timeout/incorrect): show buttons before and during replay
    if (isFirstTrial) {
      updateWordPracticeState(ctx, {
        currentWord: word,
        distractors,
        buttonWords,
        isPlaying: true,
        flashResult: null,
        clickedWord: null
      });
      ctx.publish();
      debug.log(`[WordPractice Handler] First trial - buttons hidden during audio`);
    } else {
      // Retry - show buttons before playing audio
      updateWordPracticeState(ctx, {
        currentWord: word,
        distractors,
        buttonWords,
        isPlaying: false,
        flashResult: null,
        clickedWord: null
      });
      ctx.publish();
      debug.log(`[WordPractice Handler] Retry - buttons visible during replay`);
    }

    // Play word audio
    debug.log(`[WordPractice Handler] Playing audio for '${word}'`);
    await playWordAudio(word, ctx.io, ctx.clock, config, signal);
    debug.log(`[WordPractice Handler] Audio complete`);

    // Audio complete - show buttons
    if (isFirstTrial) {
      debug.log(`[WordPractice Handler] Setting isPlaying=false, buttons now visible`);
      updateWordPracticeState(ctx, {
        currentWord: word,
        distractors,
        buttonWords,
        isPlaying: false
      });
      ctx.publish();
      debug.log(`[WordPractice Handler] State published with isPlaying=false. Current state:`, ctx.snapshot.wordPracticeState);
    }

    // Wait for button click (or timeout)
    debug.log(`[WordPractice Handler] Waiting for button click...`);
    const outcome = await waitForWordClick(
      word,
      distractors,
      ctx.input,
      ctx.clock,
      signal
    );

    // Handle timeout
    if (outcome.type === 'timeout') {
      debug.log(`[WordPractice Handler] Timeout - will replay word '${word}'`);

      // Increment timeout counter
      const currentStats = ctx.snapshot.wordPracticeState!.stats;
      updateWordPracticeState(ctx, {
        stats: {
          ...currentStats,
          timeouts: currentStats.timeouts + 1
        }
      });
      ctx.publish();

      // Mark that we've completed the first trial
      isFirstTrial = false;

      // Check if session was stopped before retrying
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      // Continue loop to retry (loop will play audio again)
      continue;
    }

    // Handle button click
    const { clickedWord, isCorrect: correct } = outcome;
    debug.log(`[WordPractice Handler] Button clicked: '${clickedWord}', correct: ${correct}`);

    isCorrect = correct;

    // Log outcome event (for statistics)
    const clickTime = ctx.clock.now();
    if (isCorrect) {
      ctx.io.log({
        type: 'correct',
        at: clickTime,
        char: word,
        latencyMs: clickTime - emissionStart
      });
      debug.log(`[WordPractice Handler] Logged 'correct' event for '${word}'`);
    } else {
      ctx.io.log({
        type: 'incorrect',
        at: clickTime,
        expected: word,
        got: clickedWord
      });
      debug.log(`[WordPractice Handler] Logged 'incorrect' event - expected: '${word}', got: '${clickedWord}'`);
    }

    // Update stats
    const currentStats = ctx.snapshot.wordPracticeState!.stats;
    const newAttempts = currentStats.attempts + 1;
    const newSuccesses = currentStats.successes + (isCorrect ? 1 : 0);
    const newAccuracy = newAttempts > 0 ? (newSuccesses / newAttempts) * 100 : 0;

    // Flash result with clicked word (preserve currentWord, distractors, buttonWords for button visibility)
    updateWordPracticeState(ctx, {
      currentWord: word,
      distractors,
      buttonWords,
      flashResult: isCorrect ? 'correct' : 'incorrect',
      clickedWord: clickedWord,
      stats: {
        attempts: newAttempts,
        successes: newSuccesses,
        timeouts: currentStats.timeouts,
        accuracy: newAccuracy
      }
    });
    ctx.publish();
    debug.log(`[WordPractice Handler] Flash state published - flashResult: ${isCorrect ? 'correct' : 'incorrect'}, clickedWord: ${clickedWord}`);

    // Wait for flash
    await ctx.clock.sleep(FLASH_DURATION_MS, signal);

    // Clear flash and clicked word (keep word/distractors/buttonWords if replaying)
    updateWordPracticeState(ctx, {
      currentWord: isCorrect ? null : word,  // Clear if correct, keep if retrying
      distractors: isCorrect ? [] : distractors,  // Clear if correct, keep if retrying
      buttonWords: isCorrect ? [] : buttonWords,  // Clear if correct, keep same order if retrying
      flashResult: null,
      clickedWord: null
    });
    ctx.publish();
    debug.log(`[WordPractice Handler] Flash cleared, isCorrect: ${isCorrect}`);

    // Mark that we've completed the first trial
    isFirstTrial = false;

    // If incorrect, loop will replay the word
    // If correct, loop will exit
  }

  // Update remaining time
  ctx.updateRemainingTime(startTime, config);

  // Clear current word (ready for next)
  updateWordPracticeState(ctx, {
    currentWord: null,
    distractors: [],
    buttonWords: [],
    isPlaying: false
  });
  ctx.publish();
}
