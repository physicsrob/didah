/**
 * Word Practice Mode - Emission Logic
 *
 * Handles word playback and button click waiting for Word Practice mode.
 * Returns outcome: correct | incorrect
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { IO } from '../../runtime/io';
import type { InputBus, KeyEvent } from '../../runtime/inputBus';
import type { Clock } from '../../runtime/clock';
import { calculateFarnsworthSpacingMs } from '../../../../core/morse/timing';
import { debug } from '../../../../core/debug';

export type WordPracticeOutcome = {
  result: 'correct' | 'incorrect';
  clickedWord: string;
};

/**
 * Play a word character by character with Farnsworth timing
 */
async function playWord(
  word: string,
  io: IO,
  clock: Clock,
  cfg: SessionConfig,
  signal: AbortSignal
): Promise<void> {
  const chars = word.split('');

  // Play each character in the word
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    // Play character at character speed
    await io.playChar(char, cfg.wpm);

    // Add Farnsworth inter-character spacing (except after last character)
    if (i < chars.length - 1) {
      const spacingMs = calculateFarnsworthSpacingMs(cfg.wpm, cfg.farnsworthWpm);
      await clock.sleep(spacingMs, signal);
    }
  }
}

/**
 * Wait for button click and return outcome
 */
async function waitForClick(
  word: string,
  distractors: string[],
  input: InputBus,
  signal: AbortSignal
): Promise<{ clickedWord: string; isCorrect: boolean }> {
  // Create all possible button words (correct + distractors)
  const allWords = [word, ...distractors];

  // Wait for button click (sent as InputBus event with key = clicked word)
  const clickEvent = await input.takeUntil(
    (e: KeyEvent) => {
      // Accept any of the valid button words
      return allWords.includes(e.key);
    },
    signal
  );

  const clickedWord = clickEvent.key;
  debug.log(`[WordPractice Input] Button clicked: '${clickedWord}'`);

  const isCorrect = clickedWord === word;
  return { clickedWord, isCorrect };
}

/**
 * Run a Word Practice emission
 *
 * Timing model:
 * 1. Play word audio (all characters with Farnsworth spacing)
 * 2. Wait indefinitely for button click (no timeout)
 * 3. Return correct or incorrect based on which button was clicked
 *
 * Button clicks are sent via InputBus as KeyEvent with key = clicked word
 */
export async function runWordPracticeEmission(
  cfg: SessionConfig,
  word: string,
  distractors: string[],
  io: IO,
  input: InputBus,
  clock: Clock,
  signal: AbortSignal
): Promise<WordPracticeOutcome> {
  const emissionStart = clock.now();
  debug.log(`[WordPractice Emission] Start - Word: '${word}', Time: ${emissionStart}ms`);

  try {
    // Log emission start
    io.log({ type: 'emission', at: emissionStart, char: word });

    // Play word audio with Farnsworth timing
    debug.log(`[WordPractice Audio] Playing word: '${word}'`);
    await playWord(word, io, clock, cfg, signal);
    debug.log(`[WordPractice Audio] Completed playing '${word}' - waiting for button click`);

    // Wait for button click
    const { clickedWord, isCorrect } = await waitForClick(word, distractors, input, signal);

    if (isCorrect) {
      debug.log(`[WordPractice] Correct answer`);
      io.log({
        type: 'correct',
        at: clock.now(),
        char: word,
        latencyMs: clock.now() - emissionStart
      });
      return { result: 'correct', clickedWord };
    } else {
      debug.log(`[WordPractice] Incorrect answer: clicked '${clickedWord}', expected '${word}'`);
      io.log({
        type: 'incorrect',
        at: clock.now(),
        expected: word,
        got: clickedWord
      });
      return { result: 'incorrect', clickedWord };
    }
  } finally {
    debug.log(`[WordPractice Emission] End - Word: '${word}'`);
  }
}

/**
 * Play audio only (exported for handler to call separately)
 */
export async function playWordAudio(
  word: string,
  io: IO,
  clock: Clock,
  cfg: SessionConfig,
  signal: AbortSignal
): Promise<void> {
  await playWord(word, io, clock, cfg, signal);
}

/**
 * Wait for click only (exported for handler to call separately)
 */
export async function waitForWordClick(
  word: string,
  distractors: string[],
  input: InputBus,
  signal: AbortSignal
): Promise<{ clickedWord: string; isCorrect: boolean }> {
  return waitForClick(word, distractors, input, signal);
}
