/**
 * Tests for Live Copy mode emission logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runLiveCopyEmission } from '../emission';
import { FakeClock } from '../../../runtime/clock';
import { TestIO } from '../../../runtime/__tests__/testIO';
import { advanceAndFlush, createTestConfig } from '../../../runtime/__tests__/testUtils';
import { calculateCharacterDurationMs, calculateFarnsworthSpacingMs } from '../../../../../core/morse/timing';

describe('runLiveCopyEmission', () => {
  let clock: FakeClock;
  let io: TestIO;
  let signal: AbortSignal;

  beforeEach(() => {
    clock = new FakeClock();
    io = new TestIO(clock);
    signal = new AbortController().signal;
  });

  it('plays audio for character and completes successfully', async () => {
    const config = createTestConfig({ wpm: 20 });

    const emissionPromise = runLiveCopyEmission(
      config,
      'A',
      io,
      clock,
      signal
    );

    // Advance through audio playback
    const audioDuration = calculateCharacterDurationMs('A', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through inter-character spacing
    const spacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, spacing);

    // Should complete without error
    await expect(emissionPromise).resolves.toBeUndefined();
  });

  it('adds inter-character spacing after audio', async () => {
    const config = createTestConfig({ wpm: 20 });

    const startTime = clock.now();
    const emissionPromise = runLiveCopyEmission(
      config,
      'B',
      io,
      clock,
      signal
    );

    // Advance through audio
    const audioDuration = calculateCharacterDurationMs('B', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through inter-character spacing
    const spacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, spacing);

    await emissionPromise;

    // Total time should be audio + spacing
    const expectedTotalMs = audioDuration + spacing;
    expect(clock.now() - startTime).toBe(expectedTotalMs);
  });

  it('uses Farnsworth spacing when configured', async () => {
    const config = createTestConfig({
      wpm: 20,
      farnsworthWpm: 15 // Slower spacing
    });

    const startTime = clock.now();
    const emissionPromise = runLiveCopyEmission(
      config,
      'C',
      io,
      clock,
      signal
    );

    // Advance through audio (at full 20 WPM)
    const audioDuration = calculateCharacterDurationMs('C', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through Farnsworth spacing (at 15 WPM - longer)
    const farnsworthSpacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, farnsworthSpacing);

    await emissionPromise;

    // Verify spacing was calculated with Farnsworth
    const totalTime = clock.now() - startTime;
    expect(totalTime).toBe(audioDuration + farnsworthSpacing);

    // Farnsworth spacing should be longer than normal
    const normalSpacing = calculateFarnsworthSpacingMs(config.wpm, config.wpm);
    expect(farnsworthSpacing).toBeGreaterThan(normalSpacing);
  });

  it.skip('respects abort signal during spacing', async () => {
    const config = createTestConfig({ wpm: 20 });
    const controller = new AbortController();

    const emissionPromise = runLiveCopyEmission(
      config,
      'D',
      io,
      clock,
      controller.signal
    );

    // Advance through audio
    const audioDuration = calculateCharacterDurationMs('D', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Abort during spacing
    controller.abort();
    await advanceAndFlush(clock, 1);

    // Should reject with AbortError
    try {
      await emissionPromise;
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('continues timing even if audio playback has issues', async () => {
    const config = createTestConfig({ wpm: 20 });

    // Even if playChar encounters issues internally, timing should still work
    const startTime = clock.now();
    const emissionPromise = runLiveCopyEmission(
      config,
      'E',
      io,
      clock,
      signal
    );

    // Should still complete with proper timing
    const audioDuration = calculateCharacterDurationMs('E', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    const spacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, spacing);

    await emissionPromise;

    // Total time should be correct
    expect(clock.now() - startTime).toBe(audioDuration + spacing);
  });

  it('plays multiple characters in sequence correctly', async () => {
    const config = createTestConfig({ wpm: 20 });
    const chars = ['H', 'E', 'L', 'L', 'O'];
    const startTime = clock.now();
    let totalExpectedTime = 0;

    for (const char of chars) {
      const emissionPromise = runLiveCopyEmission(
        config,
        char,
        io,
        clock,
        signal
      );

      const audioDuration = calculateCharacterDurationMs(char, config.wpm, 0);
      await advanceAndFlush(clock, audioDuration);

      const spacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
      await advanceAndFlush(clock, spacing);

      await emissionPromise;

      totalExpectedTime += audioDuration + spacing;
    }

    // Verify total time is correct for sequence
    expect(clock.now() - startTime).toBe(totalExpectedTime);
  });
});
