/**
 * Character emission programs for Active and Passive modes
 */

import type { Clock } from './clock';
import type { IO } from './io';
import type { InputBus, KeyEvent } from './inputBus';
import { select, waitForEvent, clockTimeout } from './select';
import { getActiveWindowMs, getPassiveTimingMs, wpmToDitMs, calculateCharacterDurationMs } from '../../../core/morse/timing';
import { debug } from '../../../core/debug';

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
  return /^[A-Za-z0-9.,/=?;:'"+@()\s-]$/.test(key);
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
  debug.log(`[Emission] Start - Char: '${char}', Time: ${emissionStart}ms`);

  // Start audio but don't await - we accept input during audio
  io.playChar(char, cfg.wpm).catch(() => {
    // Audio errors shouldn't crash the emission
    debug.warn(`Audio failed for char: ${char}`);
  });

  // Calculate recognition window and character audio duration
  const ditMs = wpmToDitMs(cfg.wpm);
  const windowMs = Math.max(
    getActiveWindowMs(cfg.wpm, cfg.speedTier),
    Math.max(60, ditMs) // Minimum 60ms or 1 dit
  );
  const charDurationMs = calculateCharacterDurationMs(char, cfg.wpm);
  debug.log(`[Window] Recognition window: ${windowMs}ms (${cfg.speedTier} @ ${cfg.wpm} WPM, dit=${ditMs}ms)`);
  debug.log(`[Audio] Character duration: ${charDurationMs}ms`);

  // Create a scoped abort controller for this emission
  const charScope = new AbortController();
  const linkAbort = () => charScope.abort();
  sessionSignal.addEventListener('abort', linkAbort, { once: true });

  try {
    // Log emission start
    io.log({ type: 'emission', at: emissionStart, char });

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

        const latencyMs = event.at - emissionStart;
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

      // Arm 2: Timeout (after audio completes + recognition window)
      clockTimeout(clock, charDurationMs + windowMs, { type: 'timeout' } as const)
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
      // Incorrect key won - treat like timeout
      debug.log(`[Input] Incorrect key '${result.value.key}' pressed for '${char}' at ${clock.now()}ms`);
      await io.stopAudio(); // Stop audio early
      io.feedback('incorrect', char);
      debug.log(`[Feedback] Triggering incorrect feedback for '${char}'`);

      // Optional replay on incorrect
      if (cfg.replay && io.replay) {
        debug.log(`[Replay] Starting replay for '${char}'`);
        await io.replay(char, cfg.wpm);
        debug.log(`[Replay] Complete for '${char}'`);
      }

      debug.log(`[Emission] End - Char: '${char}', Outcome: incorrect (advanced immediately)`);
      return 'timeout'; // Return 'timeout' for compatibility
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

      // Optional replay
      if (cfg.replay && io.replay) {
        debug.log(`[Replay] Starting replay for '${char}'`);
        await io.replay(char, cfg.wpm);
        debug.log(`[Replay] Complete for '${char}'`);
      }

      debug.log(`[Emission] End - Char: '${char}', Outcome: timeout`);
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
    await io.playChar(char, cfg.wpm);
  } catch (error) {
    debug.warn(`Audio failed for char: ${char}`, error);
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