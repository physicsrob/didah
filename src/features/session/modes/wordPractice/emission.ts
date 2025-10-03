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
