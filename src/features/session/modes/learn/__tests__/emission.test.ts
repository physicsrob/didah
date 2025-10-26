/**
 * Tests for Learn mode emission logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runLearnEmission } from '../emission';
import { FakeClock } from '../../../runtime/clock';
import { TestInputBus } from '../../../runtime/inputBus';
import { TestIO } from '../../../runtime/__tests__/testIO';
import { advanceAndFlush, flushPromises, createTestConfig } from '../../../runtime/__tests__/testUtils';
import { calculateCharacterDurationMs } from '../../../../../core/morse/timing';
import type { LearnState } from '../../../runtime/io';

const FLASH_DURATION_MS = 300;
const WPM = 20; // Learn mode default WPM

/**
 * Helper to create initial LearnState for testing
 */
function createLearnState(overrides?: Partial<LearnState>): LearnState {
  return {
    displayChar: null,
    flashState: null,
    correctionMode: false,
    encounteredChars: [],
    newChars: ['K', 'M'], // Default: K and M are new characters for this lesson
    currentIndex: 0,
    practiceSequence: 'KMRS',
    ...overrides
  };
}

describe('runLearnEmission - First Encounter (New Character)', () => {
  let clock: FakeClock;
  let io: TestIO;
  let input: TestInputBus;
  let signal: AbortSignal;
  let state: LearnState;
  let stateUpdates: LearnState[];

  beforeEach(() => {
    clock = new FakeClock();
    io = new TestIO(clock);
    input = new TestInputBus();
    signal = new AbortController().signal;
    state = createLearnState();
    stateUpdates = [];
  });

  const updateState = (newState: LearnState) => {
    state = newState;
    stateUpdates.push({ ...newState }); // Deep copy for inspection
  };

  it('shows character immediately when first encounter with un-mastered char', async () => {
    const config = createTestConfig({ wpm: WPM });
    const emissionPromise = runLearnEmission(
      config,
      'K',
      state,
      io,
      input,
      clock,
      signal,
      updateState
    );

    // Advance through audio playback
    const audioDuration = calculateCharacterDurationMs('K', WPM, 0);
    await advanceAndFlush(clock, audioDuration);

    // Check that character is displayed (not "?")
    const afterAudio = stateUpdates[0];
    expect(afterAudio?.displayChar).toBe('K');
    expect(afterAudio?.flashState).toBe(null);
    expect(afterAudio?.correctionMode).toBe(false);

    // Type correct character
    input.type('K', clock.now());
    await flushPromises();

    // Advance through flash
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    const result = await emissionPromise;

    // Check outcome
    expect(result.outcome).toBe('shown'); // First encounters always count as 'shown'

    // Check that character was marked as encountered
    expect(result.state.encounteredChars).toContain('K');

    // Check that correct was logged
    expect(io.hasLoggedEvent('correct', 'K')).toBe(true);

    // Check flash sequence: null → correct → null
    const flashStates = stateUpdates.map(s => s.flashState);
    expect(flashStates).toContain('correct');
  });

  it('enforces correction when wrong key pressed on first encounter', async () => {
    const config = createTestConfig({ wpm: WPM });
    const emissionPromise = runLearnEmission(
      config,
      'K',
      state,
      io,
      input,
      clock,
      signal,
      updateState
    );

    // Advance through audio playback
    const audioDuration = calculateCharacterDurationMs('K', WPM, 0);
    await advanceAndFlush(clock, audioDuration);

    // Type WRONG character
    input.type('M', clock.now());
    await flushPromises();

    // Advance through red flash
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    // Should enter correction mode
    const afterFlash = stateUpdates[stateUpdates.length - 1];
    expect(afterFlash?.displayChar).toBe('K'); // Still showing correct answer
    expect(afterFlash?.correctionMode).toBe(true);

    // Replay audio
    await advanceAndFlush(clock, audioDuration);

    // Type correct character now
    input.type('K', clock.now());
    await flushPromises();

    // Advance through green flash
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    const result = await emissionPromise;

    // Check outcome - still 'shown' (first encounter)
    expect(result.outcome).toBe('shown');

    // Check that buzzer feedback was triggered
    expect(io.getFeedbackFor('K')).toBe('incorrect');

    // Check that only ONE correct event was logged (not from correction)
    const correctLogs = io.getLoggedEvents().filter(e => e.type === 'correct' && 'char' in e && e.char === 'K');
    expect(correctLogs.length).toBe(1);

    // Check flash sequence includes both incorrect and correct
    const flashStates = stateUpdates.map(s => s.flashState);
    expect(flashStates).toContain('incorrect');
    expect(flashStates).toContain('correct');

    // Final state should have correction mode off
    expect(result.state.correctionMode).toBe(false);
  });

  it('replays audio multiple times if wrong keys in correction mode', async () => {
    const config = createTestConfig({ wpm: WPM });
    const emissionPromise = runLearnEmission(
      config,
      'K',
      state,
      io,
      input,
      clock,
      signal,
      updateState
    );

    // Advance through audio playback
    const audioDuration = calculateCharacterDurationMs('K', WPM, 0);
    await advanceAndFlush(clock, audioDuration);

    // Type WRONG character
    input.type('M', clock.now());
    await flushPromises();
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    // First correction attempt - replay audio
    await advanceAndFlush(clock, audioDuration);

    // Type WRONG again
    input.type('R', clock.now());
    await flushPromises();
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    // Second correction attempt - replay audio again
    await advanceAndFlush(clock, audioDuration);

    // Finally type correct
    input.type('K', clock.now());
    await flushPromises();
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    const result = await emissionPromise;

    // Should still complete successfully
    expect(result.outcome).toBe('shown');
    expect(result.state.encounteredChars).toContain('K');

    // Check that buzzer feedback was triggered
    expect(io.getFeedbackFor('K')).toBe('incorrect');

    // Only ONE correct event should be logged (not from any correction attempts)
    const correctLogs = io.getLoggedEvents().filter(e => e.type === 'correct');
    expect(correctLogs.length).toBe(1);
  });
});

describe('runLearnEmission - Quiz Mode', () => {
  let clock: FakeClock;
  let io: TestIO;
  let input: TestInputBus;
  let signal: AbortSignal;
  let state: LearnState;
  let stateUpdates: LearnState[];

  beforeEach(() => {
    clock = new FakeClock();
    io = new TestIO(clock);
    input = new TestInputBus();
    signal = new AbortController().signal;
    // K has already been encountered
    state = createLearnState({
      encounteredChars: ['K']
    });
    stateUpdates = [];
  });

  const updateState = (newState: LearnState) => {
    state = newState;
    stateUpdates.push({ ...newState });
  };

  it('shows "?" when character already encountered', async () => {
    const config = createTestConfig({ wpm: WPM });
    const emissionPromise = runLearnEmission(
      config,
      'K',
      state,
      io,
      input,
      clock,
      signal,
      updateState
    );

    // Advance through audio playback
    const audioDuration = calculateCharacterDurationMs('K', WPM, 0);
    await advanceAndFlush(clock, audioDuration);

    // Check that "?" is displayed
    const afterAudio = stateUpdates[0];
    expect(afterAudio?.displayChar).toBe('?');

    // Type correct character
    input.type('K', clock.now());
    await flushPromises();

    // After typing, should show what user typed
    const afterTyping = stateUpdates[1];
    expect(afterTyping?.displayChar).toBe('K');

    // Advance through flash
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    const result = await emissionPromise;

    // Check outcome
    expect(result.outcome).toBe('correct');

    // Check that correct was logged
    expect(io.hasLoggedEvent('correct', 'K')).toBe(true);
  });

  it('shows "?" when character is mastered', async () => {
    // R is mastered (not in newChars)
    const config = createTestConfig({ wpm: WPM });
    const emissionPromise = runLearnEmission(
      config,
      'R',
      state,
      io,
      input,
      clock,
      signal,
      updateState
    );

    // Advance through audio playback
    const audioDuration = calculateCharacterDurationMs('R', WPM, 0);
    await advanceAndFlush(clock, audioDuration);

    // Check that "?" is displayed (not 'R')
    const afterAudio = stateUpdates[0];
    expect(afterAudio?.displayChar).toBe('?');

    // Type correct character
    input.type('R', clock.now());
    await flushPromises();

    // Advance through flash
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    const result = await emissionPromise;

    expect(result.outcome).toBe('correct');
    expect(io.hasLoggedEvent('correct', 'R')).toBe(true);
  });

  it('enforces correction when wrong answer in quiz mode', async () => {
    const config = createTestConfig({ wpm: WPM });
    const emissionPromise = runLearnEmission(
      config,
      'K',
      state,
      io,
      input,
      clock,
      signal,
      updateState
    );

    // Advance through audio playback
    const audioDuration = calculateCharacterDurationMs('K', WPM, 0);
    await advanceAndFlush(clock, audioDuration);

    // Type WRONG character
    input.type('M', clock.now());
    await flushPromises();

    // Should show what user typed (wrong answer)
    const afterTyping = stateUpdates[1];
    expect(afterTyping?.displayChar).toBe('M');

    // Advance through red flash
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    // Should show correct answer and enter correction mode
    const afterFlash = stateUpdates[stateUpdates.length - 1];
    expect(afterFlash?.displayChar).toBe('K');
    expect(afterFlash?.correctionMode).toBe(true);

    // Replay audio
    await advanceAndFlush(clock, audioDuration);

    // Type correct character
    input.type('K', clock.now());
    await flushPromises();

    // Advance through green flash
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    const result = await emissionPromise;

    // Outcome should be 'incorrect' for quiz mode with wrong first attempt
    expect(result.outcome).toBe('incorrect');

    // Check that buzzer feedback was triggered
    expect(io.getFeedbackFor('K')).toBe('incorrect');

    // Check that incorrect was logged for first attempt
    const incorrectAttempts = io.getIncorrectAttempts('K');
    expect(incorrectAttempts).toContain('M');

    // Check that NO additional correct event was logged from correction
    const allLogs = io.getLoggedEvents();
    const correctLogs = allLogs.filter(e => e.type === 'correct');
    expect(correctLogs.length).toBe(0); // No correct log because first attempt was wrong
  });

  it('handles multiple wrong attempts in correction mode', async () => {
    const config = createTestConfig({ wpm: WPM });
    const emissionPromise = runLearnEmission(
      config,
      'K',
      state,
      io,
      input,
      clock,
      signal,
      updateState
    );

    const audioDuration = calculateCharacterDurationMs('K', WPM, 0);
    await advanceAndFlush(clock, audioDuration);

    // First attempt - wrong
    input.type('M', clock.now());
    await flushPromises();
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    // Correction attempt 1 - wrong
    await advanceAndFlush(clock, audioDuration);
    input.type('R', clock.now());
    await flushPromises();
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    // Correction attempt 2 - wrong
    await advanceAndFlush(clock, audioDuration);
    input.type('S', clock.now());
    await flushPromises();
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    // Correction attempt 3 - correct
    await advanceAndFlush(clock, audioDuration);
    input.type('K', clock.now());
    await flushPromises();
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    const result = await emissionPromise;

    expect(result.outcome).toBe('incorrect');

    // Check that buzzer feedback was triggered
    expect(io.getFeedbackFor('K')).toBe('incorrect');

    // Only ONE incorrect event should be logged (first attempt only)
    const incorrectLogs = io.getLoggedEvents().filter(e => e.type === 'incorrect');
    expect(incorrectLogs.length).toBe(1);

    // No correct events (because first attempt was wrong)
    const correctLogs = io.getLoggedEvents().filter(e => e.type === 'correct');
    expect(correctLogs.length).toBe(0);
  });
});

describe('runLearnEmission - Character Tracking', () => {
  let clock: FakeClock;
  let io: TestIO;
  let input: TestInputBus;
  let signal: AbortSignal;

  beforeEach(() => {
    clock = new FakeClock();
    io = new TestIO(clock);
    input = new TestInputBus();
    signal = new AbortController().signal;
  });

  it('marks character as encountered after emission', async () => {
    const config = createTestConfig({ wpm: WPM });
    const state = createLearnState();

    const emissionPromise = runLearnEmission(
      config,
      'K',
      state,
      io,
      input,
      clock,
      signal,
      () => { /* state updates not needed for this test */ }
    );

    const audioDuration = calculateCharacterDurationMs('K', WPM, 0);
    await advanceAndFlush(clock, audioDuration);

    input.type('K', clock.now());
    await flushPromises();
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    const result = await emissionPromise;

    expect(result.state.encounteredChars).toContain('K');
    expect(result.state.encounteredChars.length).toBe(1);
  });

  it('preserves existing encountered characters', async () => {
    const config = createTestConfig({ wpm: WPM });
    const state = createLearnState({
      encounteredChars: ['K', 'M']
    });

    const emissionPromise = runLearnEmission(
      config,
      'R',
      state,
      io,
      input,
      clock,
      signal,
      () => { /* state updates not needed for this test */ }
    );

    const audioDuration = calculateCharacterDurationMs('R', WPM, 0);
    await advanceAndFlush(clock, audioDuration);

    input.type('R', clock.now());
    await flushPromises();
    await advanceAndFlush(clock, FLASH_DURATION_MS);

    const result = await emissionPromise;

    expect(result.state.encounteredChars).toContain('K');
    expect(result.state.encounteredChars).toContain('M');
    expect(result.state.encounteredChars).toContain('R');
    expect(result.state.encounteredChars.length).toBe(3);
  });
});
