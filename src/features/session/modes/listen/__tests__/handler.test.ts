/**
 * Tests for Listen mode handler logic
 *
 * Listen mode is simpler - no stats, no replay, no input.
 * Just plays audio, updates timing, and publishes.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FakeClock } from '../../../runtime/clock';
import { TestInputBus } from '../../../runtime/inputBus';
import { TestIO } from '../../../runtime/__tests__/testIO';
import { createTestConfig, advanceAndFlush } from '../../../runtime/__tests__/testUtils';
import type { HandlerContext } from '../../shared/types';
import type { SessionSnapshot } from '../../../runtime/io';
import { calculateCharacterDurationMs, getListenModeTimingMs } from '../../../../../core/morse/timing';

const { handleListenCharacter } = await import('../handler');

describe('handleListenCharacter - integration', () => {
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

    // Create initial snapshot (Listen doesn't need mode-specific state)
    snapshot = {
      phase: 'running' as const,
      startedAt: clock.now(),
      remainingMs: 60000,
      emissions: []
    };

    // Create handler context
    ctx = {
      io,
      input,
      clock,
      snapshot,
      sourceContent: { id: 'test', text: 'ABC' },
      updateSnapshot: (updates: Partial<SessionSnapshot>) => {
        snapshot = { ...snapshot, ...updates };
      },
      updateStats: () => {
        throw new Error('Listen mode should not update stats');
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

    const handlerPromise = handleListenCharacter(config, 'A', startTime, ctx, signal.signal, null, false);

    // Advance through audio
    const audioDuration = calculateCharacterDurationMs('A', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through pre-reveal and post-reveal delays
    const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, preRevealDelayMs);
    await advanceAndFlush(clock, postRevealDelayMs);

    await handlerPromise;

    // Should have published
    expect(publishCalled).toBe(true);
  });

  it('updates remaining time after emission', async () => {
    const config = createTestConfig({ wpm: 20, lengthMs: 60000 });
    const startTime = clock.now();

    const handlerPromise = handleListenCharacter(config, 'B', startTime, ctx, signal.signal, null, false);

    // Advance through audio
    const audioDuration = calculateCharacterDurationMs('B', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    // Advance through pre-reveal and post-reveal delays
    const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, preRevealDelayMs);
    await advanceAndFlush(clock, postRevealDelayMs);

    await handlerPromise;

    // Remaining time should be updated
    const totalTime = audioDuration + preRevealDelayMs + postRevealDelayMs;
    expect(snapshot.remainingMs).toBe(60000 - totalTime);
  });

  it('does not call updateStats (Listen mode has no stats)', async () => {
    const config = createTestConfig({ wpm: 20 });

    const handlerPromise = handleListenCharacter(config, 'C', clock.now(), ctx, signal.signal, null, false);

    const audioDuration = calculateCharacterDurationMs('C', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration);

    const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
    await advanceAndFlush(clock, preRevealDelayMs);
    await advanceAndFlush(clock, postRevealDelayMs);

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
      const handlerPromise = handleListenCharacter(config, char, startTime, ctx, signal.signal, null, false);

      const audioDuration = calculateCharacterDurationMs(char, config.wpm, 0);
      await advanceAndFlush(clock, audioDuration);

      const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
      await advanceAndFlush(clock, preRevealDelayMs);
      await advanceAndFlush(clock, postRevealDelayMs);

      await handlerPromise;
    }

    // Should have published for each character
    expect(publishCalled).toBe(true);

    // Time should have advanced appropriately
    expect(clock.now()).toBeGreaterThan(startTime);
  });

  it.skip('respects abort signal', async () => {
    const config = createTestConfig({ wpm: 20 });

    const handlerPromise = handleListenCharacter(config, 'G', clock.now(), ctx, signal.signal, null, false);

    // Abort after starting audio
    const audioDuration = calculateCharacterDurationMs('G', config.wpm, 0);
    await advanceAndFlush(clock, audioDuration / 2);

    signal.abort();
    await advanceAndFlush(clock, 10);

    // Should reject with abort error
    await expect(handlerPromise).rejects.toThrow();
  });

  describe('display offset timing', () => {
    it('adds character to emissions with zero offset (default)', async () => {
      const config = createTestConfig({ mode: 'listen', wpm: 20, listenTimingOffset: 0 });
      const startTime = clock.now();

      const handlerPromise = handleListenCharacter(config, 'A', startTime, ctx, signal.signal, null, false);

      // Character should appear immediately (offset = 0s)
      await advanceAndFlush(clock, 1);
      expect(ctx.snapshot.emissions).toHaveLength(1);
      expect(ctx.snapshot.emissions[0].char).toBe('A');

      // Complete the emission
      const audioDuration = calculateCharacterDurationMs('A', config.wpm, 0);
      await advanceAndFlush(clock, audioDuration);

      const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
      await advanceAndFlush(clock, preRevealDelayMs + postRevealDelayMs);

      await handlerPromise;
    });
  });

  describe('word-level reveal mode', () => {
    it('buffers characters and reveals word at word boundary (hasSpaceAfter)', async () => {
      const config = createTestConfig({ mode: 'listen', wpm: 20, listenTimingOffset: 'word' });
      const startTime = clock.now();

      // Send characters C-A-T with hasSpaceAfter=true on T
      const word = ['C', 'A', 'T'];

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        const hasSpaceAfter = i === word.length - 1;

        const handlerPromise = handleListenCharacter(config, char, startTime, ctx, signal.signal, null, hasSpaceAfter);

        // Audio plays
        const audioDuration = calculateCharacterDurationMs(char, config.wpm, 0);
        await advanceAndFlush(clock, audioDuration);

        const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
        await advanceAndFlush(clock, preRevealDelayMs + postRevealDelayMs);

        await handlerPromise;

        // Before word boundary, emissions should be empty
        if (!hasSpaceAfter) {
          expect(ctx.snapshot.emissions).toHaveLength(0);
        }
      }

      // After word boundary, all characters should be revealed at once
      expect(ctx.snapshot.emissions).toHaveLength(3);
      expect(ctx.snapshot.emissions[0].char).toBe('C');
      expect(ctx.snapshot.emissions[1].char).toBe('A');
      expect(ctx.snapshot.emissions[2].char).toBe('T');

      // Buffer should be cleared
      expect(ctx.snapshot.listenState?.bufferedWord).toHaveLength(0);
    });

    it('reveals word when space character is received', async () => {
      const config = createTestConfig({ mode: 'listen', wpm: 20, listenTimingOffset: 'word' });
      const startTime = clock.now();

      // Send characters D-O-G
      const word = ['D', 'O', 'G'];

      for (const char of word) {
        const handlerPromise = handleListenCharacter(config, char, startTime, ctx, signal.signal, null, false);

        const audioDuration = calculateCharacterDurationMs(char, config.wpm, 0);
        await advanceAndFlush(clock, audioDuration);

        const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
        await advanceAndFlush(clock, preRevealDelayMs + postRevealDelayMs);

        await handlerPromise;
      }

      // Before space, emissions should be empty
      expect(ctx.snapshot.emissions).toHaveLength(0);

      // Send a space
      const handlerPromise = handleListenCharacter(config, ' ', startTime, ctx, signal.signal, null, false);

      const audioDuration = calculateCharacterDurationMs(' ', config.wpm, 0);
      await advanceAndFlush(clock, audioDuration);

      const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
      await advanceAndFlush(clock, preRevealDelayMs + postRevealDelayMs);

      await handlerPromise;

      // After space, word should be revealed along with the space
      expect(ctx.snapshot.emissions).toHaveLength(4);
      expect(ctx.snapshot.emissions[0].char).toBe('D');
      expect(ctx.snapshot.emissions[1].char).toBe('O');
      expect(ctx.snapshot.emissions[2].char).toBe('G');
      expect(ctx.snapshot.emissions[3].char).toBe(' ');
    });

    it('handles multiple words in sequence', async () => {
      const config = createTestConfig({ mode: 'listen', wpm: 20, listenTimingOffset: 'word' });
      const startTime = clock.now();

      // Send "HI BYE" (two words)
      const sequence = [
        { char: 'H', hasSpaceAfter: false },
        { char: 'I', hasSpaceAfter: true },
        { char: ' ', hasSpaceAfter: false },
        { char: 'B', hasSpaceAfter: false },
        { char: 'Y', hasSpaceAfter: false },
        { char: 'E', hasSpaceAfter: true }
      ];

      for (const { char, hasSpaceAfter } of sequence) {
        const handlerPromise = handleListenCharacter(config, char, startTime, ctx, signal.signal, null, hasSpaceAfter);

        const audioDuration = calculateCharacterDurationMs(char, config.wpm, 0);
        await advanceAndFlush(clock, audioDuration);

        const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
        await advanceAndFlush(clock, preRevealDelayMs + postRevealDelayMs);

        await handlerPromise;
      }

      // Should have both words revealed plus the space
      expect(ctx.snapshot.emissions).toHaveLength(6);
      expect(ctx.snapshot.emissions.map(e => e.char).join('')).toBe('HI BYE');
    });

    it('initializes listenState when using word mode', async () => {
      const config = createTestConfig({ mode: 'listen', wpm: 20, listenTimingOffset: 'word' });
      const startTime = clock.now();

      // Initially no listenState
      expect(ctx.snapshot.listenState).toBeUndefined();

      const handlerPromise = handleListenCharacter(config, 'X', startTime, ctx, signal.signal, null, false);

      const audioDuration = calculateCharacterDurationMs('X', config.wpm, 0);
      await advanceAndFlush(clock, audioDuration);

      const { preRevealDelayMs, postRevealDelayMs } = getListenModeTimingMs(config.wpm, config.farnsworthWpm);
      await advanceAndFlush(clock, preRevealDelayMs + postRevealDelayMs);

      await handlerPromise;

      // listenState should be initialized
      expect(ctx.snapshot.listenState).toBeDefined();
      expect(ctx.snapshot.listenState?.bufferedWord).toHaveLength(1);
      expect(ctx.snapshot.listenState?.bufferedWord[0]).toBe('X');
    });
  });

  describe('audio timing invariance', () => {
    it('maintains consistent audio intervals regardless of display offset', async () => {
      // Test that display offset does NOT affect the interval between audio playbacks
      const offsets: (0 | 0.5 | 1.0 | 1.5)[] = [0, 0.5, 1.0, 1.5];
      const testSequence = 'ABC';
      const allIntervals: number[][] = [];

      for (const offset of offsets) {
        // Reset for each offset test
        clock = new FakeClock();
        io = new TestIO(clock);
        input = new TestInputBus();
        signal = new AbortController();
        snapshot = {
          phase: 'running' as const,
          startedAt: clock.now(),
          remainingMs: 60000,
          emissions: []
        };
        ctx = {
          io,
          input,
          clock,
          snapshot,
          sourceContent: { id: 'test', text: testSequence },
          updateSnapshot: (updates: Partial<SessionSnapshot>) => {
            snapshot = { ...snapshot, ...updates };
          },
          updateStats: () => {
            throw new Error('Listen mode should not update stats');
          },
          updateRemainingTime: (startTime: number, config) => {
            const elapsed = clock.now() - startTime;
            snapshot.remainingMs = Math.max(0, config.lengthMs - elapsed);
          },
          publish: () => {},
          waitIfPaused: async () => {},
          requestQuit: () => {}
        };

        const config = createTestConfig({
          mode: 'listen',
          wpm: 20,
          listenTimingOffset: offset
        });

        // Play the sequence
        const promises: Promise<void>[] = [];
        for (const char of testSequence) {
          const startTime = clock.now();
          const promise = handleListenCharacter(config, char, startTime, ctx, signal.signal, null, false);
          promises.push(promise);

          // Advance clock in small increments to let everything complete
          // Use a generous amount to ensure all timing completes
          for (let i = 0; i < 200; i++) {
            await advanceAndFlush(clock, 50);
          }
        }

        await Promise.all(promises);

        // Get the audio timestamps
        const timestamps = io.getAudioPlayTimestamps();
        expect(timestamps.length).toBe(testSequence.length);

        // Calculate intervals between consecutive audio playbacks
        const intervals: number[] = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i - 1]);
        }

        allIntervals.push(intervals);
      }

      // Now verify that ALL offsets produced the SAME intervals
      // This is the invariance property: display offset should not affect audio timing
      const referenceIntervals = allIntervals[0];
      const referenceOffset = offsets[0];

      for (let i = 1; i < allIntervals.length; i++) {
        const currentIntervals = allIntervals[i];
        const currentOffset = offsets[i];

        // Each interval should match the reference
        for (let j = 0; j < referenceIntervals.length; j++) {
          expect(currentIntervals[j],
            `Audio interval ${j} should be the same for offset ${referenceOffset} and ${currentOffset}`
          ).toBe(referenceIntervals[j]);
        }
      }
    });
  });
});
