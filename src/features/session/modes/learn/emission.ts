/**
 * Learn Mode - Emission Logic
 *
 * Handles the adaptive reveal interaction model:
 * - First encounter with a new character (for this lesson): show answer immediately
 * - All other encounters: quiz mode (show "?")
 * - Wrong answers trigger correction mode with audio replay
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { IO, LearnState } from '../../runtime/io';
import type { InputBus, KeyEvent } from '../../runtime/inputBus';
import type { Clock } from '../../runtime/clock';
import { debug } from '../../../../core/debug';
import { isValidChar } from '../shared/utils';

/**
 * Flash duration for visual feedback (green/red)
 */
const FLASH_DURATION_MS = 300;

/**
 * Outcome for Learn Mode emission
 * - shown: First encounter with new character (answer shown, always counts as correct for stats)
 * - correct: Quiz mode, user typed correct character on first attempt
 * - incorrect: Quiz mode, user typed incorrect character on first attempt
 */
export type LearnOutcome = 'shown' | 'correct' | 'incorrect';

/**
 * Helper to check if character is first encounter with a new character (for adaptive reveal)
 */
function isFirstEncounterNew(
  char: string,
  encounteredChars: Set<string>,
  newChars: Set<string>
): boolean {
  const upperChar = char.toUpperCase();
  return !encounteredChars.has(upperChar) && newChars.has(upperChar);
}

/**
 * Wait for any valid key press
 * Returns the key event
 */
async function waitForAnyKey(
  input: InputBus,
  signal: AbortSignal
): Promise<KeyEvent> {
  return await input.takeUntil(
    (e: KeyEvent) => isValidChar(e.key),
    signal
  );
}

/**
 * Update learn state and return new state object
 */
function updateLearnState(
  currentState: LearnState,
  updates: Partial<LearnState>
): LearnState {
  return {
    ...currentState,
    ...updates
  };
}

/**
 * Run a Learn Mode emission with adaptive reveal
 *
 * Flow depends on whether this is first encounter with a new character:
 *
 * First Encounter (new character for this lesson):
 * 1. Play audio → show character immediately
 * 2. Wait for ANY key
 * 3. If correct: green flash → advance
 * 4. If wrong: red flash → replay audio → show character → wait for correct key
 *
 * Quiz Mode (all other encounters):
 * 1. Play audio → show "?"
 * 2. Wait for ANY key
 * 3. Show typed character
 * 4. If correct: green flash → advance
 * 5. If wrong: red flash → show correct answer → replay audio → correction mode
 *
 * Correction Mode:
 * 1. Wait for correct key only
 * 2. If wrong key: red flash → replay audio again
 * 3. When correct: green flash → advance
 *
 * @param config - Session configuration (for WPM)
 * @param char - Character to practice
 * @param learnState - Current learn mode state
 * @param io - IO interface for audio/feedback
 * @param input - Input bus for keyboard events
 * @param clock - Clock for timing
 * @param signal - Abort signal for cancellation
 * @param updateState - Callback to update state and publish
 * @returns Updated state and outcome for statistics
 */
export async function runLearnEmission(
  config: SessionConfig,
  char: string,
  learnState: LearnState,
  io: IO,
  input: InputBus,
  clock: Clock,
  signal: AbortSignal,
  updateState: (state: LearnState) => void
): Promise<{ state: LearnState; outcome: LearnOutcome }> {
  const upperChar = char.toUpperCase();
  const emissionStart = clock.now();
  debug.log(`[Learn] Start emission for '${char}'`);

  // Convert arrays to Sets for efficient lookup
  const encounteredSet = new Set(learnState.encounteredChars);
  const newCharsSet = new Set(learnState.newChars);

  // Determine if this is first encounter with a new character (for adaptive reveal)
  const isFirstNew = isFirstEncounterNew(char, encounteredSet, newCharsSet);
  debug.log(`[Learn] First encounter with new char: ${isFirstNew}`);

  // Log emission event
  io.log({ type: 'emission', at: emissionStart, char });

  // Play audio
  debug.log(`[Learn] Playing audio for '${char}' at ${config.wpm} WPM`);
  await io.playChar(char, config.wpm);
  debug.log(`[Learn] Audio complete`);

  let currentState = learnState;
  let outcome: LearnOutcome;

  if (isFirstNew) {
    // === FIRST ENCOUNTER WITH NEW CHARACTER ===
    debug.log(`[Learn] First encounter with new char - showing character immediately`);

    // Show character
    currentState = updateLearnState(currentState, {
      displayChar: upperChar,
      flashState: null,
      correctionMode: false
    });
    updateState(currentState);

    // Wait for ANY key
    const keyEvent = await waitForAnyKey(input, signal);
    const typedKey = keyEvent.key.toUpperCase();
    debug.log(`[Learn] User typed: '${typedKey}'`);

    if (typedKey === upperChar) {
      // Correct on first try
      debug.log(`[Learn] Correct on first encounter`);
      io.log({ type: 'correct', at: clock.now(), char, latencyMs: clock.now() - emissionStart });

      // Green flash
      currentState = updateLearnState(currentState, {
        flashState: 'correct'
      });
      updateState(currentState);
      await clock.sleep(FLASH_DURATION_MS, signal);

      // Clear display
      currentState = updateLearnState(currentState, {
        displayChar: null,
        flashState: null
      });
      updateState(currentState);

      outcome = 'shown'; // First encounters always count as 'shown'
    } else {
      // Wrong on first encounter - enforce correction
      debug.log(`[Learn] Wrong on first encounter - enforcing correction`);
      io.feedback('incorrect', char);

      // Red flash with character still visible
      currentState = updateLearnState(currentState, {
        displayChar: upperChar,
        flashState: 'incorrect'
      });
      updateState(currentState);
      await clock.sleep(FLASH_DURATION_MS, signal);

      // Enter correction mode
      currentState = updateLearnState(currentState, {
        displayChar: upperChar,
        flashState: null,
        correctionMode: true
      });
      updateState(currentState);

      // Correction loop - keep replaying until correct
      let corrected = false;
      while (!corrected) {
        // Replay audio
        debug.log(`[Learn] Replaying audio for correction`);
        await io.playChar(char, config.wpm);

        // Wait for any key
        const event = await waitForAnyKey(input, signal);
        const key = event.key.toUpperCase();

        if (key === upperChar) {
          // Correct!
          debug.log(`[Learn] Correct key in correction mode`);
          corrected = true;
        } else {
          // Wrong - red flash and replay again
          debug.log(`[Learn] Wrong key in correction: '${key}'`);
          io.feedback('incorrect', char);
          currentState = updateLearnState(currentState, {
            flashState: 'incorrect'
          });
          updateState(currentState);
          await clock.sleep(FLASH_DURATION_MS, signal);

          // Clear flash and continue loop (will replay audio)
          currentState = updateLearnState(currentState, {
            flashState: null
          });
          updateState(currentState);
        }
      }

      // Correct key received - green flash
      debug.log(`[Learn] Correction successful`);

      // For first encounters, ALWAYS log as correct (even after correction)
      // This is logged at the end, not during correction attempts
      io.log({ type: 'correct', at: clock.now(), char, latencyMs: clock.now() - emissionStart });

      currentState = updateLearnState(currentState, {
        flashState: 'correct'
      });
      updateState(currentState);
      await clock.sleep(FLASH_DURATION_MS, signal);

      // Clear display
      currentState = updateLearnState(currentState, {
        displayChar: null,
        flashState: null,
        correctionMode: false
      });
      updateState(currentState);

      outcome = 'shown'; // First encounters always count as 'shown'
    }
  } else {
    // === QUIZ MODE FLOW ===
    debug.log(`[Learn] Quiz mode - showing "?"` );

    // Show "?"
    currentState = updateLearnState(currentState, {
      displayChar: '?',
      flashState: null,
      correctionMode: false
    });
    updateState(currentState);

    // Wait for ANY key
    const keyEvent = await waitForAnyKey(input, signal);
    const typedKey = keyEvent.key.toUpperCase();
    debug.log(`[Learn] User typed: '${typedKey}'`);

    // Show what user typed
    currentState = updateLearnState(currentState, {
      displayChar: typedKey
    });
    updateState(currentState);

    if (typedKey === upperChar) {
      // Correct!
      debug.log(`[Learn] Correct in quiz mode`);
      io.log({ type: 'correct', at: clock.now(), char, latencyMs: clock.now() - emissionStart });

      // Green flash
      currentState = updateLearnState(currentState, {
        flashState: 'correct'
      });
      updateState(currentState);
      await clock.sleep(FLASH_DURATION_MS, signal);

      // Clear display
      currentState = updateLearnState(currentState, {
        displayChar: null,
        flashState: null
      });
      updateState(currentState);

      outcome = 'correct';
    } else {
      // Wrong answer
      debug.log(`[Learn] Incorrect in quiz mode - expected '${upperChar}', got '${typedKey}'`);
      io.feedback('incorrect', char);
      io.log({ type: 'incorrect', at: clock.now(), expected: char, got: typedKey });

      // Red flash with user's wrong answer visible
      currentState = updateLearnState(currentState, {
        flashState: 'incorrect'
      });
      updateState(currentState);
      await clock.sleep(FLASH_DURATION_MS, signal);

      // Clear and show correct answer
      currentState = updateLearnState(currentState, {
        displayChar: upperChar,
        flashState: null,
        correctionMode: true
      });
      updateState(currentState);

      // Correction loop - keep replaying until correct
      let corrected = false;
      while (!corrected) {
        // Replay audio
        debug.log(`[Learn] Replaying audio for correction`);
        await io.playChar(char, config.wpm);

        // Wait for any key
        const event = await waitForAnyKey(input, signal);
        const key = event.key.toUpperCase();

        if (key === upperChar) {
          // Correct!
          debug.log(`[Learn] Correct key in correction mode`);
          corrected = true;
        } else {
          // Wrong - red flash and replay again
          debug.log(`[Learn] Wrong key in correction: '${key}'`);
          io.feedback('incorrect', char);
          currentState = updateLearnState(currentState, {
            flashState: 'incorrect'
          });
          updateState(currentState);
          await clock.sleep(FLASH_DURATION_MS, signal);

          // Clear flash and continue loop (will replay audio)
          currentState = updateLearnState(currentState, {
            flashState: null
          });
          updateState(currentState);
        }
      }

      // Correct key received - green flash
      debug.log(`[Learn] Correction successful`);
      // NOTE: Do NOT log correction attempts - first attempt (incorrect) was already logged

      currentState = updateLearnState(currentState, {
        flashState: 'correct'
      });
      updateState(currentState);
      await clock.sleep(FLASH_DURATION_MS, signal);

      // Clear display
      currentState = updateLearnState(currentState, {
        displayChar: null,
        flashState: null,
        correctionMode: false
      });
      updateState(currentState);

      // Outcome represents the first attempt (which was wrong)
      outcome = 'incorrect';
    }
  }

  // Mark character as encountered
  encounteredSet.add(upperChar);
  currentState = updateLearnState(currentState, {
    encounteredChars: Array.from(encounteredSet)
  });

  debug.log(`[Learn] Emission complete - outcome: ${outcome}`);
  return { state: currentState, outcome };
}
