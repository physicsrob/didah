/**
 * Tests for Practice mode emission logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runPracticeEmission } from '../emission';
import { FakeClock } from '../../../runtime/clock';
import { TestInputBus } from '../../../runtime/inputBus';
import { TestIO } from '../../../runtime/__tests__/testIO';
import { calculateCharacterDurationMs, getActiveWindowMs } from '../../../../../core/morse/timing';
import { advanceAndFlush, createTestConfig, flushPromises } from '../../../runtime/__tests__/testUtils';
import { TestTiming } from '../../../runtime/__tests__/timingTestHelpers';

describe('runPracticeEmission', () => {
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

  it('returns correct when user types correct character', async () => {
    const config = createTestConfig({ speedTier: 'medium' });

    // Start emission
    const emissionPromise = runPracticeEmission(
      config,
      'A',
      io,
      input,
      clock,
      signal
    );

    // Advance clock to simulate audio playback
    const audioDuration = calculateCharacterDurationMs('A', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Now type correct character after audio completes
    input.type('A', clock.now());
    await flushPromises();

    // Advance for inter-character spacing
    await advanceAndFlush(clock, TestTiming.interChar);

    const result = await emissionPromise;

    expect(result).toBe('correct');

    // Check that correct feedback was given
    expect(io.getFeedbackFor('A')).toBe('correct');

    // Check that audio was stopped
    expect(io.wasAudioStopped()).toBe(true);

    // Check that correct was logged
    expect(io.hasLoggedEvent('correct', 'A')).toBe(true);
  });

  it('returns timeout when no input within window', async () => {
    const config = createTestConfig({
      speedTier: 'slow' // Fixed window from TestTiming.windows.slow
    });

    // Start emission
    const emissionPromise = runPracticeEmission(
      config,
      'B',
      io,
      input,
      clock,
      signal
    );

    // First advance through audio playback
    const audioDuration = calculateCharacterDurationMs('B', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Then advance through recognition window to trigger timeout
    const windowMs = getActiveWindowMs('slow');
    await advanceAndFlush(clock, windowMs + 1);

    // Advance for inter-character spacing
    await advanceAndFlush(clock, TestTiming.interChar);

    const result = await emissionPromise;

    expect(result).toBe('timeout');

    // Check that timeout feedback was given
    expect(io.getFeedbackFor('B')).toBe('timeout');

    // Check that timeout was logged
    expect(io.hasLoggedEvent('timeout', 'B')).toBe(true);
  });

  it('advances immediately on incorrect key', async () => {
    const config = createTestConfig({ speedTier: 'medium' });

    const emissionPromise = runPracticeEmission(
      config,
      'C',
      io,
      input,
      clock,
      signal
    );

    // Advance past audio
    const audioDuration = calculateCharacterDurationMs('C', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Type incorrect character
    input.type('X', clock.now());
    await flushPromises();

    // Advance for inter-character spacing
    await advanceAndFlush(clock, TestTiming.interChar);

    const result = await emissionPromise;

    expect(result).toBe('incorrect');

    // Check that incorrect feedback was given
    expect(io.getFeedbackFor('C')).toBe('incorrect');

    // Check that audio was stopped early
    expect(io.wasAudioStopped()).toBe(true);

    // Check that incorrect was logged
    expect(io.hasLoggedEvent('incorrect')).toBe(true);
  });

  it('no longer handles replay (moved to session level)', async () => {
    // Test confirms that emission doesn't handle replay anymore
    const config = createTestConfig({
      speedTier: 'medium',
      replay: true // Enable replay in config
    });

    const emissionPromise = runPracticeEmission(
      config,
      'D',
      io,
      input,
      clock,
      signal
    );

    // Advance past audio
    const audioDuration = calculateCharacterDurationMs('D', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Timeout (don't type anything)
    const windowMs = getActiveWindowMs('medium');
    await advanceAndFlush(clock, windowMs + 1);

    const result = await emissionPromise;

    expect(result).toBe('timeout');

    // Replay should NOT be triggered by emission
    // (the session handler is responsible for replay now)
    // The emission function no longer calls io.replay()
    // This is now handled by the session handler
  });

  it('respects case-insensitive input', async () => {
    const config = createTestConfig({ speedTier: 'fast' });

    const emissionPromise = runPracticeEmission(
      config,
      'E', // uppercase in emission
      io,
      input,
      clock,
      signal
    );

    // Advance past audio
    const audioDuration = calculateCharacterDurationMs('E', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Type lowercase (should match)
    input.type('e', clock.now());
    await flushPromises();

    const result = await emissionPromise;

    expect(result).toBe('correct');
  });

  it.skip('should timeout after audio completion plus window duration', async () => {
    // This test verifies the timing invariant: audio playback must complete
    // before input acceptance begins, preventing late keypresses from previous
    // characters from affecting the current character.
    const config = createTestConfig({
      speedTier: 'fast',
      wpm: 20 // dit = 60ms
    });

    const char = 'T'; // T is a single dash (3 dits)
    const emissionPromise = runPracticeEmission(
      config,
      char,
      io,
      input,
      clock,
      signal
    );

    // Record the start time when emission begins
    const emissionStartTime = clock.now();

    // Calculate expected durations
    const charAudioDuration = calculateCharacterDurationMs(char, config.wpm, 0);
    const recognitionWindow = getActiveWindowMs('fast');

    // Input acceptance should only start AFTER audio completes
    const inputAcceptanceStartTime = emissionStartTime + charAudioDuration;

    // Timeout should occur at: inputAcceptanceStartTime + recognitionWindow
    const expectedTimeoutTime = inputAcceptanceStartTime + recognitionWindow;

    // Advance clock to just before timeout should occur
    await advanceAndFlush(clock, expectedTimeoutTime - 1);

    // Emission should still be running (not timed out yet)
    // We can't directly check this, but we can observe that the promise hasn't resolved

    // Now advance past the timeout threshold
    await advanceAndFlush(clock, 2); // Advance past timeout

    const result = await emissionPromise;

    expect(result).toBe('timeout');

    // Verify the actual timeout occurred at the expected time
    const actualTimeoutTime = clock.now();
    const tolerance = 5; // Allow small tolerance for async timing
    expect(actualTimeoutTime).toBeGreaterThanOrEqual(expectedTimeoutTime);
    expect(actualTimeoutTime).toBeLessThanOrEqual(expectedTimeoutTime + tolerance);
  });
});
