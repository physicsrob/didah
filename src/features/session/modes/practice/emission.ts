/**
 * Practice Mode - Emission Logic
 *
 * Handles audio playback and input racing for Practice mode.
 * Returns outcome: correct | incorrect | timeout
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { IO } from '../../runtime/io';
import type { InputBus, KeyEvent } from '../../runtime/inputBus';
import type { Clock } from '../../runtime/clock';
import { select, waitForEvent, clockTimeout } from '../../runtime/select';
import {
  getActiveWindowMs,
  wpmToDitMs,
  calculateCharacterDurationMs,
} from '../../../../core/morse/timing';
import { debug } from '../../../../core/debug';
import { isValidChar } from '../shared/utils';

export type PracticeOutcome = 'correct' | 'incorrect' | 'timeout';

/**
 * Run a Practice mode emission
 *
 * Timing model (sequential):
 * 1. Play character audio to completion (~charDurationMs)
 * 2. Accept user input during recognition window (~windowMs)
 * 3. Race: correct key vs incorrect key vs timeout
 *
 * Note: Audio plays first to prevent late keypresses from the previous
 * character leaking into the next character's input window.
 *
 * Error handling:
 * - Audio failures are logged but don't crash the emission
 * - On audio failure, input acceptance begins immediately (no artificial delay)
 * - Latency is measured from when input acceptance begins, not emission start
 *
 * Cancellation:
 * - Session abort during audio will complete the current audio before canceling
 * - charScope provides cleanup but doesn't interrupt audio playback
 */
export async function runPracticeEmission(
  cfg: SessionConfig,
  char: string,
  io: IO,
  input: InputBus,
  clock: Clock,
  sessionSignal: AbortSignal
): Promise<PracticeOutcome> {
  const emissionStart = clock.now();
  debug.log(`[Emission] Start - Char: '${char}', Time: ${emissionStart}ms`);

  // Handle spaces specially - they auto-advance with no user input required
  if (char === ' ') {
    debug.log(`[Emission] Space character - auto-advancing`);

    // Play the space timing (4 dits of silence)
    await io.playChar(' ', cfg.wpm);

    // Log as automatically correct
    io.log({
      type: 'correct',
      at: clock.now(),
      char: ' ',
      latencyMs: 0
    });

    debug.log(`[Emission] End - Char: ' ', Outcome: correct (auto)`);
    return 'correct';
  }

  // Calculate recognition window and character audio duration
  const ditMs = wpmToDitMs(cfg.wpm);
  // Recognition window = speed tier setting (slow=2000ms, medium=1000ms, fast=500ms, lightning=300ms)
  // with a safety minimum of 60ms or 1 dit (never actually triggered in normal usage)
  const windowMs = Math.max(
    getActiveWindowMs(cfg.speedTier),
    Math.max(60, ditMs)
  );
  // Practice mode always uses standard spacing (extraWordSpacing = 0)
  const charDurationMs = calculateCharacterDurationMs(char, cfg.wpm, 0);
  debug.log(`[Window] Recognition window: ${windowMs}ms (${cfg.speedTier} @ ${cfg.wpm} WPM, dit=${ditMs}ms)`);
  debug.log(`[Audio] Character duration: ${charDurationMs}ms`);

  // Create a scoped abort controller for this emission
  // Note: charScope is currently used only for cleanup, not for interrupting audio playback
  // If sessionSignal aborts during audio, the audio will complete before cancellation propagates
  const charScope = new AbortController();
  const linkAbort = () => charScope.abort();
  sessionSignal.addEventListener('abort', linkAbort, { once: true });

  try {
    // Log emission start
    io.log({ type: 'emission', at: emissionStart, char });

    // Play audio and wait for it to complete before accepting ANY input
    // This prevents late keypresses from affecting the next character
    try {
      await io.playChar(char, cfg.wpm);
      debug.log(`[Audio] Completed playing '${char}' - now accepting input`);
    } catch (error) {
      // Audio errors shouldn't crash the emission
      debug.warn(`Audio failed for char: ${char}`, error);
    }

    // Update timing reference point - input acceptance starts now
    const inputStartTime = clock.now();

    // Race: correct key vs incorrect key vs timeout
    type RaceResult =
      | { type: 'correct', key: string }
      | { type: 'incorrect', key: string }
      | { type: 'timeout' };

    const result = await select<RaceResult>([
      // Arm 0: Wait for correct key
      waitForEvent(async (signal) => {
        const event = await input.takeUntil(
          (e: KeyEvent) => {
            const upperKey = e.key.toUpperCase();
            const upperChar = char.toUpperCase();
            return isValidChar(e.key) && upperKey === upperChar;
          },
          signal
        );

        const latencyMs = event.at - inputStartTime;
        io.log({
          type: 'correct',
          at: event.at,
          char,
          latencyMs
        });
        return { type: 'correct', key: event.key } as const;
      }),

      // Arm 1: Wait for incorrect key
      waitForEvent(async (signal) => {
        const event = await input.takeUntil(
          (e: KeyEvent) => {
            const upperKey = e.key.toUpperCase();
            const upperChar = char.toUpperCase();
            return isValidChar(e.key) && upperKey !== upperChar;
          },
          signal
        );

        io.log({
          type: 'incorrect',
          at: event.at,
          expected: char,
          got: event.key.toUpperCase()
        });
        return { type: 'incorrect', key: event.key } as const;
      }),

      // Arm 2: Timeout (recognition window only, since audio already completed)
      clockTimeout(clock, windowMs, { type: 'timeout' } as const)
    ], sessionSignal);

    // Clean up observers
    charScope.abort();

    // Handle result based on type
    if (result.value.type === 'correct') {
      // Correct key won
      debug.log(`[Input] Correct key pressed for '${char}'`);
      await io.stopAudio(); // Stop audio early
      io.feedback('correct', char);

      debug.log(`[Emission] End - Char: '${char}', Outcome: correct`);
      return 'correct';
    } else if (result.value.type === 'incorrect') {
      // Incorrect key won
      debug.log(`[Input] Incorrect key '${result.value.key}' pressed for '${char}' at ${clock.now()}ms`);
      await io.stopAudio(); // Stop audio early
      io.feedback('incorrect', char);
      debug.log(`[Feedback] Triggering incorrect feedback for '${char}'`);

      debug.log(`[Emission] End - Char: '${char}', Outcome: incorrect`);
      return 'incorrect';
    } else {
      // Timeout won
      debug.log(`[Input] Timeout at ${clock.now()}ms for '${char}'`);
      io.feedback('timeout', char);
      debug.log(`[Feedback] Triggering timeout feedback for '${char}'`);
      io.log({
        type: 'timeout',
        at: clock.now(),
        char
      });

      debug.log(`[Emission] End - Char: '${char}', Outcome: timeout`);
      return 'timeout';
    }
  } finally {
    sessionSignal.removeEventListener('abort', linkAbort);
    charScope.abort();
  }
}
