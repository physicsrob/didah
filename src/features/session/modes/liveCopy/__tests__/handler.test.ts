/**
 * Tests for Live Copy mode handler logic
 *
 * Live Copy mode is simple - just plays audio with spacing.
 * No stats, no replay, no input handling (UI owns that).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FakeClock } from '../../../runtime/clock';
import { TestInputBus } from '../../../runtime/inputBus';
import { TestIO } from '../../../runtime/__tests__/testIO';
import { createTestConfig, advanceAndFlush } from '../../../runtime/__tests__/testUtils';
import type { HandlerContext } from '../../shared/types';
import type { SessionSnapshot } from '../../../runtime/io';
import { calculateCharacterDurationMs, calculateFarnsworthSpacingMs } from '../../../../../core/morse/timing';

const { handleLiveCopyCharacter } = await import('../handler');

describe('handleLiveCopyCharacter - integration', () => {
  let clock: FakeClock;
  let io: TestIO;
  let input: TestInputBus;
  let signal: AbortController;
  let snapshot: SessionSnapshot;
  let ctx: HandlerContext;
  let publishCalled: boolean;

  beforeEach(() => {
    clock = new FakeClock();
    io = new TestIO(clock);
    input = new TestInputBus();
    signal = new AbortController();
    publishCalled = false;

    // Create initial snapshot (Live Copy has its own state managed by UI)
    snapshot = {
      phase: 'running' as const,
      startedAt: clock.now(),
      remainingMs: 60000,
      emissions: [],
      liveCopyState: {
        typedString: ''
      }
    };

    // Create handler context
    ctx = {
      io,
      input,
      clock,
      snapshot,
      updateSnapshot: (updates: Partial<SessionSnapshot>) => {
        snapshot = { ...snapshot, ...updates };
      },
      updateStats: () => {
        throw new Error('Live Copy mode should not update stats');
      },
      updateRemainingTime: (startTime: number, config) => {
        const elapsed = clock.now() - startTime;
        snapshot.remainingMs = Math.max(0, config.lengthMs - elapsed);
      },
      publish: () => {
        publishCalled = true;
      },
      waitIfPaused: async () => {
        // No-op for tests - pause not tested here
      },
      requestQuit: () => {
        // No-op for tests - quit not tested here
      }
    };
  });

  it('completes emission and publishes snapshot', async () => {
    const config = createTestConfig({ wpm: 20 });
    const startTime = clock.now();

    const handlerPromise = handleLiveCopyCharacter(config, 'A', startTime, ctx, signal.signal, null);

    // Advance through audio
    const audioDuration = calculateCharacterDurationMs('A', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through inter-character spacing
    const spacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, spacing);

    await handlerPromise;

    // Should have published
    expect(publishCalled).toBe(true);
  });

  it('updates remaining time after emission', async () => {
    const config = createTestConfig({ wpm: 20, lengthMs: 60000 });
    const startTime = clock.now();

    const handlerPromise = handleLiveCopyCharacter(config, 'B', startTime, ctx, signal.signal, null);

    // Advance through audio
    const audioDuration = calculateCharacterDurationMs('B', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through spacing
    const spacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, spacing);

    await handlerPromise;

    // Remaining time should be updated
    const totalTime = audioDuration + spacing;
    expect(snapshot.remainingMs).toBe(60000 - totalTime);
  });

  it('does not call updateStats (Live Copy mode has no stats during session)', async () => {
    const config = createTestConfig({ wpm: 20 });

    const handlerPromise = handleLiveCopyCharacter(config, 'C', clock.now(), ctx, signal.signal, null);

    const audioDuration = calculateCharacterDurationMs('C', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    const spacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, spacing);

    await handlerPromise;

    // If updateStats was called, it would throw
    // Test passes if no error thrown
    expect(publishCalled).toBe(true);
  });

  it('handles multiple characters in sequence', async () => {
    const config = createTestConfig({ wpm: 20 });
    const chars = ['D', 'E', 'F'];
    const startTime = clock.now();

    for (const char of chars) {
      const handlerPromise = handleLiveCopyCharacter(config, char, startTime, ctx, signal.signal, null);

      const audioDuration = calculateCharacterDurationMs(char, config.wpm, 0);
      await advanceAndFlush(clock, audioDuration);

      const spacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
      await advanceAndFlush(clock, spacing);

      await handlerPromise;
    }

    // Should have published for each character
    expect(publishCalled).toBe(true);

    // Time should have advanced appropriately
    expect(clock.now()).toBeGreaterThan(startTime);
  });

  it('uses Farnsworth spacing when configured', async () => {
    const config = createTestConfig({
      wpm: 20,
      farnsworthWpm: 15 // Slower spacing
    });
    const startTime = clock.now();

    const handlerPromise = handleLiveCopyCharacter(config, 'G', startTime, ctx, signal.signal, null);

    // Advance through audio (at full WPM)
    const audioDuration = calculateCharacterDurationMs('G', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through Farnsworth spacing (slower)
    const farnsworthSpacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, farnsworthSpacing);

    await handlerPromise;

    // Total time should include Farnsworth spacing
    const totalTime = clock.now() - startTime;
    expect(totalTime).toBe(audioDuration + farnsworthSpacing);

    // Farnsworth spacing should be longer than normal
    const normalSpacing = calculateFarnsworthSpacingMs(config.wpm, config.wpm);
    expect(farnsworthSpacing).toBeGreaterThan(normalSpacing);
  });

  it('logs emission events for evaluation at session end', async () => {
    const config = createTestConfig({ wpm: 20 });
    const startTime = clock.now();

    const handlerPromise = handleLiveCopyCharacter(config, 'H', startTime, ctx, signal.signal, null);

    // Advance through audio
    const audioDuration = calculateCharacterDurationMs('H', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through spacing
    const spacing = calculateFarnsworthSpacingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, spacing);

    await handlerPromise;

    // Should have logged an emission event
    const emissionEvents = io.getLoggedEvents('emission');
    expect(emissionEvents).toHaveLength(1);
    expect(emissionEvents[0]).toMatchObject({
      type: 'emission',
      char: 'H'
    });
    expect(emissionEvents[0].at).toBeDefined();
  });
});
