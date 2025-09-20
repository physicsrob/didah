/**
 * Character emission programs for Active and Passive modes
 */

import type { Clock } from './clock';
import type { IO } from './io';
import type { InputBus, KeyEvent } from './inputBus';
import { select, waitForEvent, clockTimeout } from './select';
import { getActiveWindowMs, getPassiveTimingMs, wpmToDitMs, calculateCharacterDurationMs, MORSE_SPACING } from '../../../core/morse/timing';

// Session config type - simplified for now
export type SessionConfig = {
  mode: 'active' | 'passive';
  wpm: number;
  speedTier: 'slow' | 'medium' | 'fast' | 'lightning';
  lengthMs: number;
  replay?: boolean;
};

export type ActiveOutcome = 'correct' | 'timeout';

/**
 * Check if a key is a valid morse character
 */
function isValidChar(key: string): boolean {
  return /^[A-Za-z0-9.,\/=\?;:'"\-\+@\(\)\s]$/.test(key);
}

/**
 * Run an Active mode emission
 * - Start audio (don't wait)
 * - Race: first correct key vs timeout
 * - Log incorrect keys during window
 * - Handle feedback and optional replay
 */
export async function runActiveEmission(
  cfg: SessionConfig,
  char: string,
  io: IO,
  input: InputBus,
  clock: Clock,
  sessionSignal: AbortSignal
): Promise<ActiveOutcome> {
  const emissionStart = clock.now();
  console.log(`[Emission] Start - Char: '${char}', Time: ${emissionStart}ms`);

  // Start audio but don't await - we accept input during audio
  io.playChar(char).catch(() => {
    // Audio errors shouldn't crash the emission
    console.warn(`Audio failed for char: ${char}`);
  });

  // Calculate recognition window and character audio duration
  const ditMs = wpmToDitMs(cfg.wpm);
  const windowMs = Math.max(
    getActiveWindowMs(cfg.wpm, cfg.speedTier),
    Math.max(60, ditMs) // Minimum 60ms or 1 dit
  );
  const charDurationMs = calculateCharacterDurationMs(char, cfg.wpm);
  console.log(`[Window] Recognition window: ${windowMs}ms (${cfg.speedTier} @ ${cfg.wpm} WPM, dit=${ditMs}ms)`);
  console.log(`[Audio] Character duration: ${charDurationMs}ms`);

  // Create a scoped abort controller for this emission
  const charScope = new AbortController();
  const linkAbort = () => charScope.abort();
  sessionSignal.addEventListener('abort', linkAbort, { once: true });

  try {
    // Observe all keys to log incorrect ones
    input.observe((event: KeyEvent) => {
      if (isValidChar(event.key)) {
        const upperKey = event.key.toUpperCase();
        const upperChar = char.toUpperCase();

        if (upperKey !== upperChar) {
          console.log(`[Input] Key pressed: '${upperKey}' at ${event.at}ms - INCORRECT (expected '${upperChar}')`);
          io.log({
            type: 'incorrect',
            at: event.at,
            expected: char,
            got: upperKey
          });
          // Optional: feedback on incorrect (uncomment if desired)
          // io.feedback('incorrect', char);
        }
      }
    }, charScope.signal);

    // Log emission start
    io.log({ type: 'emission', at: emissionStart, char });

    // Race: correct key vs timeout
    const result = await select([
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

        const latencyMs = event.at - emissionStart;
        io.log({
          type: 'correct',
          at: event.at,
          char,
          latencyMs
        });
        return 'correct' as const;
      }),

      // Arm 1: Timeout (after audio completes + recognition window)
      clockTimeout(clock, charDurationMs + windowMs, 'timeout' as const)
    ], sessionSignal);

    // Clean up observers
    charScope.abort();

    if (result.winner === 0) {
      // Correct key won
      console.log(`[Input] Correct key pressed for '${char}'`);
      await io.stopAudio(); // Stop audio early
      io.feedback('correct', char);

      // Add inter-character spacing per Morse standard
      const interCharSpacingMs = ditMs * MORSE_SPACING.symbol;
      console.log(`[Spacing] Adding inter-character spacing: ${interCharSpacingMs}ms (${MORSE_SPACING.symbol} dits)`);
      await clock.sleep(interCharSpacingMs, sessionSignal);

      console.log(`[Emission] End - Char: '${char}', Outcome: correct`);
      return 'correct';
    } else {
      // Timeout won
      console.log(`[Input] Timeout at ${clock.now()}ms for '${char}'`);
      io.feedback('timeout', char);
      console.log(`[Feedback] Triggering timeout feedback for '${char}'`);
      io.log({
        type: 'timeout',
        at: clock.now(),
        char
      });

      // Optional replay
      if (cfg.replay && io.replay) {
        console.log(`[Replay] Starting replay for '${char}'`);
        await io.replay(char);
        console.log(`[Replay] Complete for '${char}'`);
      }

      // Add inter-character spacing after replay
      const interCharSpacingMs = ditMs * MORSE_SPACING.symbol;
      console.log(`[Spacing] Adding inter-character spacing: ${interCharSpacingMs}ms (${MORSE_SPACING.symbol} dits)`);
      await clock.sleep(interCharSpacingMs, sessionSignal);

      console.log(`[Emission] End - Char: '${char}', Outcome: timeout`);
      return 'timeout';
    }
  } finally {
    sessionSignal.removeEventListener('abort', linkAbort);
    charScope.abort();
  }
}

/**
 * Run a Passive mode emission
 * - Play audio (wait for completion)
 * - Wait pre-reveal delay
 * - Reveal character
 * - Wait post-reveal delay
 */
export async function runPassiveEmission(
  cfg: SessionConfig,
  char: string,
  io: IO,
  clock: Clock,
  sessionSignal: AbortSignal
): Promise<void> {
  const emissionStart = clock.now();

  // Hide any previous character
  io.hide();

  // Log emission start
  io.log({ type: 'emission', at: emissionStart, char });

  // Play audio and wait for completion
  try {
    await io.playChar(char);
  } catch (error) {
    console.warn(`Audio failed for char: ${char}`, error);
  }

  // Get passive timing parameters
  const { preRevealMs, postRevealMs } = getPassiveTimingMs(cfg.wpm, cfg.speedTier);

  // Pre-reveal delay
  await clock.sleep(preRevealMs, sessionSignal);

  // Reveal character
  io.reveal(char);

  // Post-reveal delay
  await clock.sleep(postRevealMs, sessionSignal);
}