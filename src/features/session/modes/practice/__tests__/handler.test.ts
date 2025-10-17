/**
 * Tests for Practice mode handler logic
 *
 * These tests verify the handler's integration responsibilities:
 * - Updating stats
 * - Managing history
 * - Handling replay
 * - Managing timing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeClock } from '../../../runtime/clock';
import { TestInputBus } from '../../../runtime/inputBus';
import { TestIO } from '../../../runtime/__tests__/testIO';
import { createTestConfig, advanceAndFlush, flushPromises } from '../../../runtime/__tests__/testUtils';
import type { HandlerContext } from '../../shared/types';
import type { SessionSnapshot } from '../../../runtime/io';
import { calculateCharacterDurationMs, getActiveWindowMs } from '../../../../../core/morse/timing';

// Use dynamic import to ensure proper mocking
const { handlePracticeCharacter } = await import('../handler');

describe('handlePracticeCharacter - integration', () => {
  let clock: FakeClock;
  let io: TestIO;
  let input: TestInputBus;
  let signal: AbortController;
  let snapshot: SessionSnapshot;
  let ctx: HandlerContext;
  let publishCalled: boolean;
  let statsUpdates: Array<'correct' | 'incorrect' | 'timeout'>;

  beforeEach(() => {
    clock = new FakeClock();
    io = new TestIO(clock);
    input = new TestInputBus();
    signal = new AbortController();
    publishCalled = false;
    statsUpdates = [];

    // Create initial snapshot with Practice state
    snapshot = {
      phase: 'running' as const,
      startedAt: clock.now(),
      remainingMs: 60000,
      emissions: [],
      practiceState: {
        previous: [],
        stats: {
          correct: 0,
          incorrect: 0,
          timeout: 0,
          accuracy: 0
        }
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
      updateStats: (outcome: 'correct' | 'incorrect' | 'timeout') => {
        statsUpdates.push(outcome);
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

  it('updates stats and history for correct input', async () => {
    const config = createTestConfig({ wpm: 20, speedTier: 'medium' });
    const startTime = clock.now();

    // Start handler in background
    const handlerPromise = handlePracticeCharacter(config, 'A', startTime, ctx, signal.signal, null, false);

    // Advance through audio
    const audioDuration = calculateCharacterDurationMs('A', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Type correct character
    input.type('A', clock.now());
    await flushPromises();

    // Advance through post-audio window
    await advanceAndFlush(clock, 100);

    await handlerPromise;

    // Should have updated stats
    expect(statsUpdates).toContain('correct');

    // Should have updated history
    expect(snapshot.practiceState?.previous).toHaveLength(1);
    expect(snapshot.practiceState?.previous[0]).toMatchObject({
      char: 'A',
      result: 'correct'
    });

    // Should have published
    expect(publishCalled).toBe(true);
  });

  it('updates stats and history for timeout', async () => {
    const config = createTestConfig({ wpm: 20, speedTier: 'medium' });
    const startTime = clock.now();

    // Start handler
    const handlerPromise = handlePracticeCharacter(config, 'B', startTime, ctx, signal.signal, null, false);

    // Advance through audio
    const audioDuration = calculateCharacterDurationMs('B', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through active window without typing
    const activeWindow = getActiveWindowMs(config.speedTier);
    await advanceAndFlush(clock, activeWindow);

    // Advance through inter-character spacing (3 dits)
    await advanceAndFlush(clock, 180);

    await handlerPromise;

    // Should have recorded timeout
    expect(statsUpdates).toContain('timeout');
    expect(snapshot.practiceState?.previous[0]?.result).toBe('timeout');
  });

  it.skip('throws error if practiceState not initialized', async () => {
    const config = createTestConfig({ wpm: 20 });

    // Remove practiceState
    ctx.snapshot = {
      ...snapshot,
      practiceState: undefined
    };

    // Start the handler
    const handlerPromise = handlePracticeCharacter(config, 'C', clock.now(), ctx, signal.signal, null, false);

    // Advance through emission
    await advanceAndFlush(clock, 500);
    input.type('C', clock.now());
    await advanceAndFlush(clock, 100);

    // Should throw
    await expect(handlerPromise).rejects.toThrow('Practice mode handler called but practiceState not initialized');
  });

  it('publishes snapshot after completing emission', async () => {
    const config = createTestConfig({ wpm: 20, speedTier: 'fast' });

    const handlerPromise = handlePracticeCharacter(config, 'D', clock.now(), ctx, signal.signal, null, false);

    // Complete emission quickly
    await advanceAndFlush(clock, 500);
    input.type('D', clock.now());
    await advanceAndFlush(clock, 100);

    await handlerPromise;

    expect(publishCalled).toBe(true);
  });

  it('handles replay when enabled and outcome is incorrect', async () => {
    const config = createTestConfig({ wpm: 20, speedTier: 'medium', replay: true });

    // Mock replay method
    let replayCalled = false;
    io.replay = vi.fn(async () => {
      replayCalled = true;
      await clock.sleep(100, signal.signal);
    });

    const handlerPromise = handlePracticeCharacter(config, 'E', clock.now(), ctx, signal.signal, null, false);

    // Go through emission with incorrect input
    const audioDuration = calculateCharacterDurationMs('E', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    input.type('X', clock.now()); // Wrong key
    await flushPromises();
    await advanceAndFlush(clock, 100);

    // Advance through replay
    await advanceAndFlush(clock, 100);

    // Advance through spacing
    await advanceAndFlush(clock, 180);

    await handlerPromise;

    expect(replayCalled).toBe(true);
    expect(snapshot.practiceState?.previous[0]?.result).toBe('incorrect');
  });
});
