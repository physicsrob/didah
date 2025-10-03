/**
 * Tests for Listen mode emission logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runListenEmission } from '../emission';
import { FakeClock } from '../../../runtime/clock';
import { TestIO } from '../../../runtime/__tests__/testIO';
import { calculateCharacterDurationMs, wpmToDitMs } from '../../../../../core/morse/timing';
import { advanceAndFlush, createTestConfig } from '../../../runtime/__tests__/testUtils';
import { getListenSequence } from '../../../runtime/__tests__/timingTestHelpers';

describe('runListenEmission', () => {
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
      mode: 'listen',
      speedTier: 'slow' // Timings from TestTiming.passive.slow
    });


    // Start emission
    const emissionPromise = runListenEmission(
      config,
      'F',
      io,
      clock,
      signal
    );

    // Calculate timings using helper
    const sequence = getListenSequence('F', config.wpm);

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

  it('uses standard 3-dit spacing regardless of speed tier', async () => {
    // Test that Listen mode ignores speedTier and always uses 3-dit spacing
    const testSpeedTiers = ['slow', 'medium', 'fast', 'lightning'] as const;

    for (const speedTier of testSpeedTiers) {
      // Reset state for each iteration
      io = new TestIO(clock);

      const config = createTestConfig({
        mode: 'listen',
        wpm: 20, // dit = 60ms
        speedTier // Should be ignored
      });

      const startTime = clock.now();

      // Start emission
      const emissionPromise = runListenEmission(
        config,
        'G',
        io,
        clock,
        signal
      );

      // All speed tiers should use the same timing (standard 3-dit spacing)
      const sequence = getListenSequence('G', config.wpm);

      // Advance through complete sequence
      await advanceAndFlush(clock, sequence.playChar);
      await advanceAndFlush(clock, sequence.preReveal);
      await advanceAndFlush(clock, sequence.postReveal);

      await emissionPromise;

      const totalTime = clock.now() - startTime;

      // Total time should be consistent across all speed tiers
      // Character duration + 3 dits of spacing (split 66/34)
      const charDuration = calculateCharacterDurationMs('G', config.wpm, 0);
      const expectedSpacing = wpmToDitMs(config.wpm) * 3;
      const expectedTotal = charDuration + expectedSpacing;

      // Allow for rounding differences
      expect(totalTime).toBeGreaterThanOrEqual(expectedTotal - 2);
      expect(totalTime).toBeLessThanOrEqual(expectedTotal + 2);

      // Verify the reveal happened
      expect(io.getReveals()).toContain('G');

      // Reset clock for next iteration
      clock = new FakeClock();
    }
  });

  it('handles abort signal', async () => {
    const config = createTestConfig({
      mode: 'listen',
      speedTier: 'medium'
    });

    const controller = new AbortController();

    // Start emission
    const emissionPromise = runListenEmission(
      config,
      'H',
      io,
      clock,
      controller.signal
    );

    // Calculate audio duration
    const charDuration = calculateCharacterDurationMs('H', config.wpm, 0);

    // Advance past audio, then abort during pre-reveal delay
    await advanceAndFlush(clock, charDuration);
    controller.abort();

    await expect(emissionPromise).rejects.toThrow('Aborted');
  });
});
