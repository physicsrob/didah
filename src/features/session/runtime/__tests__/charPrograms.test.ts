/**
 * Tests for character emission programs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runActiveEmission, runPassiveEmission } from '../charPrograms';
import { FakeClock } from '../clock';
import { TestInputBus } from '../inputBus';
import { TestIO } from './testIO';
import { calculateCharacterDurationMs } from '../../../../core/morse/timing';
import { advanceAndFlush, createTestConfig, flushPromises } from './testUtils';
import { TestTiming, getCharTimeout, getPassiveSequence } from './timingTestHelpers';

describe('runActiveEmission', () => {
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
    const emissionPromise = runActiveEmission(
      config,
      'A',
      io,
      input,
      clock,
      signal
    );

    // Type correct character immediately
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
    const emissionPromise = runActiveEmission(
      config,
      'B',
      io,
      input,
      clock,
      signal
    );

    // Calculate actual timings with timing helpers
    const totalTimeout = getCharTimeout('B', 'slow', config.wpm);

    // Advance past timeout
    await advanceAndFlush(clock, totalTimeout + 1);

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

    // Start emission
    const emissionPromise = runActiveEmission(
      config,
      'C',
      io,
      input,
      clock,
      signal
    );

    // Type incorrect character
    input.type('A', clock.now());
    await flushPromises();

    const result = await emissionPromise;

    // Should return timeout (fail) immediately on wrong key
    expect(result).toBe('timeout');

    // Check that incorrect key was logged
    expect(io.hasLoggedEvent('incorrect', 'C')).toBe(true);
    expect(io.getIncorrectAttempts('C')).toContain('A');

    // Check that feedback was triggered for incorrect
    expect(io.getFeedbackFor('C')).toBe('incorrect');
  });

  it('handles replay when enabled and timeout occurs', async () => {
    const config = createTestConfig({
      speedTier: 'fast',
      replay: true
    });

    // Start emission
    const emissionPromise = runActiveEmission(
      config,
      'D',
      io,
      input,
      clock,
      signal
    );

    // Calculate actual timings with timing helpers
    const charDuration = calculateCharacterDurationMs('D', config.wpm);
    const totalTimeout = getCharTimeout('D', 'fast', config.wpm);

    // Advance to trigger timeout
    await advanceAndFlush(clock, totalTimeout + 1);

    // Advance for the replay to complete (same as char duration)
    await advanceAndFlush(clock, charDuration);

    // Advance for inter-character spacing
    await advanceAndFlush(clock, TestTiming.interChar);

    const result = await emissionPromise;

    expect(result).toBe('timeout');

    // Check that replay was called
    const replayCalls = io.getCalls('replay');
    expect(replayCalls).toHaveLength(1);
    expect(replayCalls[0].args).toEqual(['D', 20]);
  });

  it('respects case-insensitive input', async () => {
    const config = createTestConfig({ speedTier: 'medium' });

    // Start emission for uppercase character
    const emissionPromise = runActiveEmission(
      config,
      'E',
      io,
      input,
      clock,
      signal
    );

    // Type lowercase
    input.type('e', clock.now());
    await flushPromises();

    // Advance for inter-character spacing after correct input
    await advanceAndFlush(clock, TestTiming.interChar);

    const result = await emissionPromise;

    expect(result).toBe('correct');
  });

  it('should timeout after audio completion plus window duration', async () => {
    // Using slow WPM and long character to test timing
    const config = createTestConfig({
      wpm: 5, // Very slow = 240ms dit
      speedTier: 'slow' // Fixed window from TestTiming.windows.slow
    });

    // Character 'H' = '....' (4 dits + 3 intra-symbol spacing)
    // Expected: audio duration = calculateCharacterDurationMs('H', 5) = 1680ms
    // Expected timeout: 1680ms audio + TestTiming.windows.slow = 3680ms
    const expectedTimeout = getCharTimeout('H', 'slow', config.wpm);

    const startTime = clock.now();

    // Start emission
    const emissionPromise = runActiveEmission(
      config,
      'H',
      io,
      input,
      clock,
      signal
    );

    // Advance to just before timeout
    await advanceAndFlush(clock, expectedTimeout - 1);

    // Should not have timed out yet
    let feedbackCalls = io.getCalls('feedback');
    expect(feedbackCalls).toHaveLength(0);

    // Advance past timeout
    await advanceAndFlush(clock, 2);

    // Now should have timed out
    feedbackCalls = io.getCalls('feedback');
    expect(feedbackCalls).toHaveLength(1);
    expect(feedbackCalls[0].args).toEqual(['timeout', 'H']);

    // Advance for inter-character spacing
    await advanceAndFlush(clock, TestTiming.interChar);

    const result = await emissionPromise;
    expect(result).toBe('timeout');

    // Verify timeout happened at the correct time
    const timeoutLogs = io.getCalls('log').filter(c => c.args[0].type === 'timeout');
    expect(timeoutLogs).toHaveLength(1);
    const timeoutTime = timeoutLogs[0].args[0].at;
    expect(timeoutTime).toBeGreaterThanOrEqual(startTime + expectedTimeout);
  });
});

describe('runPassiveEmission', () => {
  let clock: FakeClock;
  let io: TestIO;
  let signal: AbortSignal;

  beforeEach(() => {
    clock = new FakeClock();
    io = new TestIO(clock);
    signal = new AbortController().signal;
  });

  it('follows passive timing sequence', async () => {
    const config = createTestConfig({
      mode: 'passive',
      speedTier: 'slow' // Timings from TestTiming.passive.slow
    });

    const startTime = clock.now();

    // Start emission
    const emissionPromise = runPassiveEmission(
      config,
      'F',
      io,
      clock,
      signal
    );

    // Calculate timings using helper
    const sequence = getPassiveSequence('F', 'slow', config.wpm);

    // Advance through complete sequence
    await advanceAndFlush(clock, sequence.playChar); // Audio playback
    await advanceAndFlush(clock, sequence.preReveal); // Pre-reveal delay
    await advanceAndFlush(clock, sequence.postReveal); // Post-reveal delay

    await emissionPromise;

    // Check sequence of operations
    // Should hide first
    expect(io.getHideCount()).toBeGreaterThan(0);

    // Should log emission
    expect(io.hasLoggedEvent('emission', 'F')).toBe(true);

    // Should reveal after delays
    expect(io.getReveals()).toContain('F');
  });

  it('respects speed tier timings', async () => {
    const config = createTestConfig({
      mode: 'passive',
      wpm: 20, // dit = 60ms
      speedTier: 'fast' // Timings from TestTiming.passive.fast
    });

    const startTime = clock.now();

    // Start emission
    const emissionPromise = runPassiveEmission(
      config,
      'G',
      io,
      clock,
      signal
    );

    // Calculate expected timings using helper
    const sequence = getPassiveSequence('G', 'fast', config.wpm);

    // Advance through complete sequence
    await advanceAndFlush(clock, sequence.playChar);
    await advanceAndFlush(clock, sequence.preReveal);
    await advanceAndFlush(clock, sequence.postReveal);

    await emissionPromise;

    const totalTime = clock.now() - startTime;
    expect(totalTime).toBe(sequence.total);

    // Verify the reveal happened
    expect(io.getReveals()).toContain('G');
  });

  it('handles abort signal', async () => {
    const config = createTestConfig({
      mode: 'passive',
      speedTier: 'medium'
    });

    const controller = new AbortController();

    // Start emission
    const emissionPromise = runPassiveEmission(
      config,
      'H',
      io,
      clock,
      controller.signal
    );

    // Calculate audio duration
    const charDuration = calculateCharacterDurationMs('H', config.wpm);

    // Advance past audio, then abort during pre-reveal delay
    await advanceAndFlush(clock, charDuration);
    controller.abort();

    await expect(emissionPromise).rejects.toThrow('Aborted');
  });
});