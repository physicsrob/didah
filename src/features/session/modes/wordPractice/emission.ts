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
import { select, clockTimeout } from '../../runtime/select';

/**
 * Button timeout: 2.5 seconds to click a button
 */
const BUTTON_TIMEOUT_MS = 2500;

export type WordClickOutcome =
  | { type: 'click'; clickedWord: string; isCorrect: boolean }
  | { type: 'timeout' };

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
 * Wait for button click and return outcome (click or timeout)
 */
async function waitForClick(
  word: string,
  distractors: string[],
  input: InputBus,
  clock: Clock,
  signal: AbortSignal
): Promise<WordClickOutcome> {
  // Create all possible button words (correct + distractors)
  const allWords = [word, ...distractors];

  // Race: button click vs timeout
  const result = await select<WordClickOutcome>([
    // Arm 0: Wait for button click
    {
      run: async (armSignal) => {
        const clickEvent = await input.takeUntil(
          (e: KeyEvent) => allWords.includes(e.key),
          armSignal
        );
        const clickedWord = clickEvent.key;
        debug.log(`[WordPractice Input] Button clicked: '${clickedWord}'`);
        const isCorrect = clickedWord === word;
        return { type: 'click', clickedWord, isCorrect } as const;
      }
    },
    // Arm 1: Timeout after 1.5s
    clockTimeout(clock, BUTTON_TIMEOUT_MS, { type: 'timeout' } as const)
  ], signal);

  const outcome = result.value;

  if (outcome.type === 'timeout') {
    debug.log(`[WordPractice Input] Timeout at ${clock.now()}ms for '${word}'`);
  }

  return outcome;
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
  clock: Clock,
  signal: AbortSignal
): Promise<WordClickOutcome> {
  return waitForClick(word, distractors, input, clock, signal);
}
