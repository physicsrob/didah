/**
 * Tests for character emission programs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runActiveEmission, runPassiveEmission } from '../charPrograms';
import { FakeClock } from '../clock';
import { TestInputBus } from '../inputBus';
import { MockIO } from '../io';

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
    const config = {
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 60000
    };

    // Start emission
    const emissionPromise = runActiveEmission(
      config,
      'A',
      io,
      input,
      clock,
      signal
    );

    // Type correct character after 100ms
    setTimeout(() => {
      input.type('A', clock.now());
    }, 0);

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
    const config = {
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'slow' as const, // 5 × dit = 5 × 60 = 300ms window
      lengthMs: 60000
    };

    // Start emission
    const emissionPromise = runActiveEmission(
      config,
      'B',
      io,
      input,
      clock,
      signal
    );

    // Advance time past the window
    setTimeout(() => {
      clock.advance(400);
    }, 0);

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

  it('logs incorrect keys during window', async () => {
    const config = {
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 60000
    };

    // Start emission
    const emissionPromise = runActiveEmission(
      config,
      'C',
      io,
      input,
      clock,
      signal
    );

    // Type incorrect characters
    setTimeout(() => {
      input.type('A', clock.now());
      input.type('B', clock.now());
      input.type('C', clock.now()); // Finally correct
    }, 0);

    const result = await emissionPromise;

    expect(result).toBe('correct');

    // Check that incorrect keys were logged
    const logCalls = io.getCalls('log');
    const incorrectLogs = logCalls.filter(c => c.args[0].type === 'incorrect');
    expect(incorrectLogs).toHaveLength(2);
    expect(incorrectLogs[0].args[0].got).toBe('A');
    expect(incorrectLogs[1].args[0].got).toBe('B');
  });

  it('handles replay when enabled and timeout occurs', async () => {
    const config = {
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'fast' as const,
      lengthMs: 60000,
      replay: true
    };

    // Start emission
    const emissionPromise = runActiveEmission(
      config,
      'D',
      io,
      input,
      clock,
      signal
    );

    // Advance clock to trigger timeout (fast = 2×60ms = 120ms)
    setTimeout(() => {
      clock.advance(120);  // This triggers the timeout
    }, 0);

    // Advance for the replay to complete
    setTimeout(() => {
      clock.advance(50);  // This completes the replay
    }, 10);

    const result = await emissionPromise;

    expect(result).toBe('timeout');

    // Check that replay was called
    const replayCalls = io.getCalls('replay');
    expect(replayCalls).toHaveLength(1);
    expect(replayCalls[0].args).toEqual(['D']);
  });

  it('respects case-insensitive input', async () => {
    const config = {
      mode: 'active' as const,
      wpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 60000
    };

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
    setTimeout(() => {
      input.type('e', clock.now());
    }, 0);

    const result = await emissionPromise;

    expect(result).toBe('correct');
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
    const config = {
      mode: 'passive' as const,
      wpm: 20,
      speedTier: 'slow' as const, // 3×dit pre, 3×dit post
      lengthMs: 60000
    };

    clock.now(); // Record start time

    // Start emission
    const emissionPromise = runPassiveEmission(
      config,
      'F',
      io,
      clock,
      signal
    );

    // Advance through audio (mocked at 100ms)
    setTimeout(() => clock.advance(100), 0);

    // Advance through pre-reveal delay (3 × 60 = 180ms)
    setTimeout(() => clock.advance(180), 100);

    // Advance through post-reveal delay (3 × 60 = 180ms)
    setTimeout(() => clock.advance(180), 300);

    await emissionPromise;

    // Check sequence of calls
    const calls = io.calls;

    // Should hide first
    expect(calls[0]).toEqual({ method: 'hide', args: [] });

    // Should log emission
    expect(calls[1].method).toBe('log');
    expect(calls[1].args[0].type).toBe('emission');

    // Should play audio
    expect(calls[2]).toEqual({ method: 'playChar', args: ['F'] });

    // Should reveal after pre-reveal delay
    const revealCall = calls.find(c => c.method === 'reveal');
    expect(revealCall).toBeDefined();
    expect(revealCall?.args).toEqual(['F']);
  });

  it('respects speed tier timings', async () => {
    const config = {
      mode: 'passive' as const,
      wpm: 20, // dit = 60ms
      speedTier: 'fast' as const, // 2×dit pre, 1×dit post
      lengthMs: 60000
    };

    const startTime = clock.now(); // Record start time

    // Start emission
    const emissionPromise = runPassiveEmission(
      config,
      'G',
      io,
      clock,
      signal
    );

    // Schedule clock advances for the expected timings
    // Audio playback: 100ms (MockIO default)
    // Fast speed: 2×dit pre-reveal (120ms), 1×dit post-reveal (60ms)
    setTimeout(() => clock.advance(100), 0);  // Advance for audio
    setTimeout(() => clock.advance(120), 10);  // Advance for pre-reveal
    setTimeout(() => clock.advance(60), 20);   // Advance for post-reveal

    await emissionPromise;

    const totalTime = clock.now() - startTime;

    // Should take 280ms total (100ms audio + 120ms pre + 60ms post)
    expect(totalTime).toBe(280);

    // Verify the reveal happened
    const revealCall = io.calls.find(c => c.method === 'reveal');
    expect(revealCall).toBeDefined();
    expect(revealCall?.args).toEqual(['G']);
  });

  it('handles abort signal', async () => {
    const config = {
      mode: 'passive' as const,
      wpm: 20,
      speedTier: 'medium' as const,
      lengthMs: 60000
    };

    const controller = new AbortController();

    // Start emission
    const emissionPromise = runPassiveEmission(
      config,
      'H',
      io,
      clock,
      controller.signal
    );

    // Advance past audio, then abort during pre-reveal delay
    setTimeout(() => {
      clock.advance(100); // Past audio
      controller.abort();
    }, 0);

    await expect(emissionPromise).rejects.toThrow('Aborted');
  });
});