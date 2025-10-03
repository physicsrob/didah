/**
 * Word Practice Mode - Handler Logic
 *
 * Integrates word practice emission with session lifecycle.
 * Handles retry logic for incorrect answers.
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import { playWordAudio, waitForWordClick } from './emission';
import { debug } from '../../../../core/debug';

/**
 * Flash duration for visual feedback (green/red)
 */
const FLASH_DURATION_MS = 500;

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Parse word entry from character source
 * Word entries are JSON-encoded as: {"word":"the","distractors":["that","this"]}
 */
function parseWordEntry(char: string): { word: string; distractors: string[] } {
  try {
    return JSON.parse(char);
  } catch {
    // Fallback: treat as regular word with no distractors
    return { word: char, distractors: [] };
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
  char: string,  // JSON-encoded word entry
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal
): Promise<void> {
  // Verify state is initialized
  if (!ctx.snapshot.wordPracticeState) {
    throw new Error('Word Practice mode handler called but wordPracticeState not initialized');
  }

  // Parse word entry
  const { word, distractors } = parseWordEntry(char);

  let isCorrect = false;

  // Retry loop - keep trying until correct or session ends
  while (!isCorrect) {
    const emissionStart = ctx.clock.now();
    debug.log(`[WordPractice Handler] Starting trial for word '${word}'`);

    // Log emission event (for statistics)
    ctx.io.log({ type: 'emission', at: emissionStart, char: word });

    // Shuffle button order ONCE per trial (not on every render)
    const buttonWords = shuffleArray([word, ...distractors]);
    debug.log(`[WordPractice Handler] Shuffled button order:`, buttonWords);

    // Set state to playing (buttons hidden)
    ctx.updateSnapshot({
      wordPracticeState: {
        ...ctx.snapshot.wordPracticeState!,
        currentWord: word,
        distractors,
        buttonWords,  // Store shuffled order
        isPlaying: true,
        flashResult: null,
        clickedWord: null
      }
    });
    ctx.publish();
    debug.log(`[WordPractice Handler] State set to playing, buttons hidden`);

    // Play word audio
    debug.log(`[WordPractice Handler] Playing audio for '${word}'`);
    await playWordAudio(word, ctx.io, ctx.clock, config, signal);
    debug.log(`[WordPractice Handler] Audio complete`);

    // Audio complete - show buttons
    debug.log(`[WordPractice Handler] Setting isPlaying=false, buttons should appear`);
    ctx.updateSnapshot({
      wordPracticeState: {
        ...ctx.snapshot.wordPracticeState!,
        currentWord: word,  // Preserve the current word
        distractors: distractors,  // Preserve the distractors
        buttonWords: buttonWords,  // Preserve the shuffled button order
        isPlaying: false
      }
    });
    ctx.publish();
    debug.log(`[WordPractice Handler] State published with isPlaying=false. Current state:`, ctx.snapshot.wordPracticeState);

    // Wait for button click
    debug.log(`[WordPractice Handler] Waiting for button click...`);
    const { clickedWord, isCorrect: correct } = await waitForWordClick(
      word,
      distractors,
      ctx.input,
      signal
    );
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

    // Flash result with clicked word (preserve currentWord, distractors, and buttonWords!)
    ctx.updateSnapshot({
      wordPracticeState: {
        ...ctx.snapshot.wordPracticeState!,
        currentWord: word,  // MUST preserve for buttons to stay visible during flash
        distractors: distractors,  // MUST preserve for buttons to stay visible during flash
        buttonWords: buttonWords,  // MUST preserve to keep button order stable during flash
        flashResult: isCorrect ? 'correct' : 'incorrect',
        clickedWord: clickedWord,
        stats: {
          attempts: newAttempts,
          successes: newSuccesses,
          accuracy: newAccuracy
        }
      }
    });
    ctx.publish();
    debug.log(`[WordPractice Handler] Flash state published - flashResult: ${isCorrect ? 'correct' : 'incorrect'}, clickedWord: ${clickedWord}`);

    // Wait for flash
    await ctx.clock.sleep(FLASH_DURATION_MS, signal);

    // Clear flash and clicked word (keep word/distractors/buttonWords if replaying)
    ctx.updateSnapshot({
      wordPracticeState: {
        ...ctx.snapshot.wordPracticeState!,
        currentWord: isCorrect ? null : word,  // Clear if correct, keep if retrying
        distractors: isCorrect ? [] : distractors,  // Clear if correct, keep if retrying
        buttonWords: isCorrect ? [] : buttonWords,  // Clear if correct, keep same order if retrying
        flashResult: null,
        clickedWord: null
      }
    });
    ctx.publish();
    debug.log(`[WordPractice Handler] Flash cleared, isCorrect: ${isCorrect}`);

    // If incorrect, loop will replay the word
    // If correct, loop will exit
  }

  // Update remaining time
  ctx.updateRemainingTime(startTime, config);

  // Clear current word (ready for next)
  ctx.updateSnapshot({
    wordPracticeState: {
      ...ctx.snapshot.wordPracticeState!,
      currentWord: null,
      distractors: [],
      buttonWords: [],
      isPlaying: false
    }
  });
  ctx.publish();
}
