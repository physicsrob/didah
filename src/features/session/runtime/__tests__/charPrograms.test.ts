/**
 * Tests for character emission programs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runActiveEmission, runPassiveEmission } from '../charPrograms';
import { FakeClock } from '../clock';
import { TestInputBus } from '../inputBus';
import { MockIO } from '../io';
import { calculateCharacterDurationMs } from '../../../../core/morse/timing';
import { advanceAndFlush, createTestConfig, flushPromises } from './testUtils';

describe('runActiveEmission', () => {
  let clock: FakeClock;
  let io: MockIO;
  let input: TestInputBus;
  let signal: AbortSignal;

  beforeEach(() => {
    clock = new FakeClock();
    io = new MockIO(clock);
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

    // Advance for inter-character spacing (3 × 60ms = 180ms)
    await advanceAndFlush(clock, 180);

    const result = await emissionPromise;

    expect(result).toBe('correct');

    // Check that correct feedback was given
    const feedbackCalls = io.getCalls('feedback');
    expect(feedbackCalls).toHaveLength(1);
    expect(feedbackCalls[0].args).toEqual(['correct', 'A']);

    // Check that audio was stopped
    const stopCalls = io.getCalls('stopAudio');
    expect(stopCalls).toHaveLength(1);

    // Check that correct was logged
    const logCalls = io.getCalls('log');
    const correctLog = logCalls.find(c => c.args[0].type === 'correct');
    expect(correctLog).toBeDefined();
  });

  it('returns timeout when no input within window', async () => {
    const config = createTestConfig({
      speedTier: 'slow' // 2000ms fixed window
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

    // Calculate actual timings with new fixed windows
    const charDuration = calculateCharacterDurationMs('B', config.wpm);
    const windowMs = 2000; // Fixed 2000ms for slow
    const totalTimeout = charDuration + windowMs;

    // Advance past timeout
    await advanceAndFlush(clock, totalTimeout + 1);

    // Advance for inter-character spacing
    await advanceAndFlush(clock, 180);

    const result = await emissionPromise;

    expect(result).toBe('timeout');

    // Check that timeout feedback was given
    const feedbackCalls = io.getCalls('feedback');
    expect(feedbackCalls).toHaveLength(1);
    expect(feedbackCalls[0].args).toEqual(['timeout', 'B']);

    // Check that timeout was logged
    const logCalls = io.getCalls('log');
    const timeoutLog = logCalls.find(c => c.args[0].type === 'timeout');
    expect(timeoutLog).toBeDefined();
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
    const logCalls = io.getCalls('log');
    const incorrectLogs = logCalls.filter(c => c.args[0].type === 'incorrect');
    expect(incorrectLogs).toHaveLength(1);
    expect(incorrectLogs[0].args[0].got).toBe('A');

    // Check that feedback was triggered for incorrect
    const feedbackCalls = io.getCalls('feedback');
    expect(feedbackCalls.some(c => c.args[0] === 'incorrect')).toBe(true);
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

    // Calculate actual timings with new fixed windows
    const charDuration = calculateCharacterDurationMs('D', config.wpm);
    const windowMs = 500; // Fixed 500ms for fast
    const totalTimeout = charDuration + windowMs;

    // Advance to trigger timeout
    await advanceAndFlush(clock, totalTimeout + 1);

    // Advance for the replay to complete (same as char duration)
    await advanceAndFlush(clock, charDuration);

    // Advance for inter-character spacing (3 × 60ms = 180ms)
    await advanceAndFlush(clock, 180);

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
    await advanceAndFlush(clock, 180);

    const result = await emissionPromise;

    expect(result).toBe('correct');
  });

  it('should timeout after audio completion plus window duration', async () => {
    // Using slow WPM and long character to test timing
    const config = createTestConfig({
      wpm: 5, // Very slow = 240ms dit
      speedTier: 'slow' // Fixed 2000ms window
    });

    // Character 'H' = '....' (4 dits + 3 intra-symbol spacing)
    // Expected: audio duration = calculateCharacterDurationMs('H', 5) = 1680ms
    // Expected timeout: 1680ms audio + 2000ms window = 3680ms
    const audioDuration = calculateCharacterDurationMs('H', config.wpm);
    const windowMs = 2000; // Fixed 2000ms for slow
    const expectedTimeout = audioDuration + windowMs;

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
    await advanceAndFlush(clock, 180);

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
  let io: MockIO;
  let signal: AbortSignal;

  beforeEach(() => {
    clock = new FakeClock();
    io = new MockIO(clock);
    signal = new AbortController().signal;
  });

  it('follows passive timing sequence', async () => {
    const config = createTestConfig({
      mode: 'passive',
      speedTier: 'slow' // 3×dit pre, 3×dit post
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

    // Calculate timings
    const charDuration = calculateCharacterDurationMs('F', config.wpm);
    const preRevealMs = 180; // 3 × 60ms dit
    const postRevealMs = 180; // 3 × 60ms dit

    // Advance through complete sequence
    await advanceAndFlush(clock, charDuration); // Audio playback
    await advanceAndFlush(clock, preRevealMs); // Pre-reveal delay
    await advanceAndFlush(clock, postRevealMs); // Post-reveal delay

    await emissionPromise;

    // Check sequence of calls
    const calls = io.calls;

    // Should hide first
    expect(calls[0]).toEqual({ method: 'hide', args: [] });

    // Should log emission
    expect(calls[1].method).toBe('log');
    expect(calls[1].args[0].type).toBe('emission');

    // Should play audio
    expect(calls[2]).toEqual({ method: 'playChar', args: ['F', 20] });

    // Should reveal after pre-reveal delay
    const revealCall = calls.find(c => c.method === 'reveal');
    expect(revealCall).toBeDefined();
    expect(revealCall?.args).toEqual(['F']);
  });

  it('respects speed tier timings', async () => {
    const config = createTestConfig({
      mode: 'passive',
      wpm: 20, // dit = 60ms
      speedTier: 'fast' // 2×dit pre, 1×dit post
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

    // Calculate expected timings
    const charDuration = calculateCharacterDurationMs('G', config.wpm);
    const preRevealMs = 120; // 2×dit = 120ms for fast
    const postRevealMs = 60; // 1×dit = 60ms for fast

    // Advance through complete sequence
    await advanceAndFlush(clock, charDuration);
    await advanceAndFlush(clock, preRevealMs);
    await advanceAndFlush(clock, postRevealMs);

    await emissionPromise;

    const totalTime = clock.now() - startTime;
    const expectedTotal = charDuration + preRevealMs + postRevealMs;
    expect(totalTime).toBe(expectedTotal);

    // Verify the reveal happened
    const revealCall = io.calls.find(c => c.method === 'reveal');
    expect(revealCall).toBeDefined();
    expect(revealCall?.args).toEqual(['G']);
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