/**
 * Tests for Runner mode handler logic - specifically pre-spawn behavior
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FakeClock } from '../../../runtime/clock';
import { TestInputBus } from '../../../runtime/inputBus';
import { TestIO } from '../../../runtime/__tests__/testIO';
import { createTestConfig, advanceAndFlush, flushPromises } from '../../../runtime/__tests__/testUtils';
import type { HandlerContext } from '../../shared/types';
import type { SessionSnapshot } from '../../../runtime/io';
import { calculateCharacterDurationMs } from '../../../../../core/morse/timing';
import { getRunnerGame, getOrCreateRunnerGame, unregisterRunnerGame } from '../gameRegistry';
import { CHARACTER_X, CHARACTER_WIDTH } from '../constants';
import { setupCanvasMock } from './canvasMock';

// Setup canvas mocking before importing handler
setupCanvasMock();

const { handleRunnerCharacter } = await import('../handler');

/**
 * Helper to advance both FakeClock and GameEngine time together.
 * The game engine uses its own internal time that's normally driven by requestAnimationFrame,
 * but in tests we need to manually sync it with our FakeClock.
 */
async function advanceGameTime(clock: FakeClock, ms: number) {
  const game = getRunnerGame()!;
  const engine = game.getEngine();

  // Update game engine with the delta time
  engine.update(ms / 1000); // engine.update takes seconds

  // Also advance the clock and flush promises
  await advanceAndFlush(clock, ms);
}

describe('handleRunnerCharacter - pre-spawn behavior', () => {
  let clock: FakeClock;
  let io: TestIO;
  let input: TestInputBus;
  let signal: AbortController;
  let snapshot: SessionSnapshot;
  let ctx: HandlerContext;

  beforeEach(async () => {
    clock = new FakeClock();
    io = new TestIO(clock);
    input = new TestInputBus();
    signal = new AbortController();

    // Create initial snapshot
    snapshot = {
      phase: 'running' as const,
      startedAt: clock.now(),
      remainingMs: 300000, // 5 minutes
      emissions: []
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
        // No-op for runner mode
      },
      updateRemainingTime: (startTime: number, config) => {
        const elapsed = clock.now() - startTime;
        snapshot.remainingMs = Math.max(0, config.lengthMs - elapsed);
      },
      publish: () => {
        // No-op for tests
      },
      waitIfPaused: async () => {
        // No-op for tests
      },
      requestQuit: () => {
        // No-op for tests
      }
    };

    // Initialize game
    const canvas = document.createElement('canvas');
    const game = getOrCreateRunnerGame(canvas);
    await game.start();

    // Let game initialize
    await flushPromises();
  }, 5000); // 5 second timeout for canvas/animation setup

  afterEach(() => {
    unregisterRunnerGame();
  });

  it('should pre-spawn second obstacle immediately after first jump starts (BEFORE jump completes)', async () => {
    const config = createTestConfig({ wpm: 20, startingLevel: 1 });
    const startTime = clock.now();

    // Start first character handler with 'B' as next character
    const handler1Promise = handleRunnerCharacter(config, 'A', startTime, ctx, signal.signal, 'B');

    const game = getRunnerGame()!;
    const engine = game.getEngine();
    const levelConfig = engine.getConfig();

    // Advance through initial 1-second delay for first obstacle
    await advanceGameTime(clock, 1000);

    // Advance through morse (both FakeClock and GameEngine time)
    const morseDuration = calculateCharacterDurationMs('A', levelConfig.wpm, 0);
    await advanceGameTime(clock, morseDuration);

    // React to first character
    const timeAtJumpStart = clock.now();
    input.type('A', clock.now());
    await flushPromises();

    // At this moment, the jump has started but NOT completed
    // CORRECT BEHAVIOR: Pre-spawn should happen RIGHT NOW (while still jumping)
    const state = engine.getState();
    expect(state.character.state).toBe('jumping');
    const jumpDuration = state.character.jumpDuration!;

    // Small advance to let pre-spawn logic execute (but NOT enough to complete jump)
    await advanceGameTime(clock, 10);

    // VERIFY: Character should STILL be jumping
    expect(engine.getState().character.state).toBe('jumping');

    // EXPECTED: Obstacle B should already be pre-spawned by now
    const obstacles = engine.getState().obstacles;
    const obstacleB = obstacles.find(o => o.requiredLetter === 'B');

    expect(obstacleB).toBeDefined();

    if (obstacleB) {
      // Since pre-spawn happens at jump START, timeOffset should be jumpDuration + downtime
      const downtime = levelConfig.downtime;
      const correctTimeOffset = jumpDuration + downtime;

      // Calculate expected position
      const morseDurationB = calculateCharacterDurationMs('B', levelConfig.wpm, 0) / 1000;
      const expectedMinimumOffset = correctTimeOffset * levelConfig.scrollSpeed;

      // The obstacle should be positioned far enough to arrive at correct time
      const minExpectedX = CHARACTER_X + CHARACTER_WIDTH + expectedMinimumOffset;
      expect(obstacleB.x).toBeGreaterThanOrEqual(minExpectedX);

      // Check morseEndTime: should be timeAtJumpStart + jumpDuration + downtime + morseDurationB
      // Convert clock time (ms) to seconds to match engine time units
      const expectedMorseEndTime = (timeAtJumpStart / 1000) + correctTimeOffset + morseDurationB;
      expect(obstacleB.morseEndTime).toBeGreaterThanOrEqual(expectedMorseEndTime - 0.1);
      expect(obstacleB.morseEndTime).toBeLessThanOrEqual(expectedMorseEndTime + 0.1);
    }

    // Clean up - abort the handler
    signal.abort();
    await handler1Promise.catch(() => {});
  });

  it('should maintain proper spacing between consecutive obstacles', async () => {
    const config = createTestConfig({ wpm: 20, startingLevel: 1 });
    const startTime = clock.now();

    const game = getRunnerGame()!;
    const engine = game.getEngine();
    const levelConfig = engine.getConfig();

    // Process first character with 'B' as next
    const handler1Promise = handleRunnerCharacter(config, 'A', startTime, ctx, signal.signal, 'B');

    // Advance through initial 1-second delay for first obstacle
    await advanceGameTime(clock, 1000);

    // Advance through morse for A
    const morseDurationA = calculateCharacterDurationMs('A', levelConfig.wpm, 0);
    await advanceGameTime(clock, morseDurationA);

    // React to A
    input.type('A', clock.now());
    await flushPromises();

    expect(engine.getState().character.state).toBe('jumping');
    const jumpDuration = engine.getState().character.jumpDuration!;

    // Small delay to let pre-spawn execute (but character still jumping)
    await advanceGameTime(clock, 10);

    // VERIFY: Still jumping
    expect(engine.getState().character.state).toBe('jumping');

    // Get both obstacles
    const obstacleA = engine.getState().obstacles.find(o => o.requiredLetter === 'A')!;
    const obstacleB = engine.getState().obstacles.find(o => o.requiredLetter === 'B');

    expect(obstacleA).toBeDefined();
    expect(obstacleB).toBeDefined();

    if (obstacleB) {
      // CORRECT: Since pre-spawn happens while jumping, offset = jumpDuration + downtime
      const downtime = levelConfig.downtime;
      const correctOffsetDistance = (jumpDuration + downtime) * levelConfig.scrollSpeed;

      // B should be further right than A by at least the offset distance
      // (plus B's own morse + approach distance, but we'll just check minimum)
      const spacing = obstacleB.x - obstacleA.x;
      expect(spacing).toBeGreaterThan(correctOffsetDistance);
    }

    // Clean up
    signal.abort();
    await handler1Promise.catch(() => {});
  });

  it('should have second obstacle arrive at correct time after jump completes', async () => {
    const config = createTestConfig({ wpm: 20, startingLevel: 1 });
    const startTime = clock.now();

    const game = getRunnerGame()!;
    const engine = game.getEngine();
    const levelConfig = engine.getConfig();

    // Process first character with 'B' as next
    const handler1Promise = handleRunnerCharacter(config, 'A', startTime, ctx, signal.signal, 'B');

    // Advance through initial 1-second delay for first obstacle
    await advanceGameTime(clock, 1000);

    // Advance through morse for A
    const morseDurationA = calculateCharacterDurationMs('A', levelConfig.wpm, 0);
    await advanceGameTime(clock, morseDurationA);

    // React to A
    const timeAtJumpStart = clock.now();
    input.type('A', clock.now());
    await flushPromises();

    expect(engine.getState().character.state).toBe('jumping');
    const jumpDuration = engine.getState().character.jumpDuration!;

    // Small delay for pre-spawn (character still jumping)
    await advanceGameTime(clock, 10);

    // VERIFY: Still jumping
    expect(engine.getState().character.state).toBe('jumping');

    const obstacleB = engine.getState().obstacles.find(o => o.requiredLetter === 'B');
    expect(obstacleB).toBeDefined();

    if (obstacleB) {
      const downtime = levelConfig.downtime;
      const morseDurationB = calculateCharacterDurationMs('B', levelConfig.wpm, 0) / 1000;

      // CORRECT: Since pre-spawn happens at jump START, B's morse should end at:
      // timeAtJumpStart + jumpDuration + downtime + morseDurationB
      // Convert clock time (ms) to seconds to match engine time units
      const expectedBMorseEndTime = (timeAtJumpStart / 1000) + jumpDuration + downtime + morseDurationB;

      // Allow small tolerance for timing
      expect(obstacleB.morseEndTime).toBeGreaterThanOrEqual(expectedBMorseEndTime - 0.1);
      expect(obstacleB.morseEndTime).toBeLessThanOrEqual(expectedBMorseEndTime + 0.1);

      // Advance through jump + downtime + morse playing (convert seconds to ms)
      await advanceGameTime(clock, (jumpDuration + downtime + morseDurationB) * 1000);

      // Now advance by B's approach time (convert seconds to ms)
      // The obstacle should arrive at character at morseEndTime + approachTime
      const approachTime = obstacleB.approachTime;
      await advanceGameTime(clock, approachTime * 1000);

      // Check obstacle position - should be at or near collision point
      const currentState = engine.getState();
      const currentObstacleB = currentState.obstacles.find(o => o.requiredLetter === 'B');

      if (currentObstacleB) {
        const collisionPoint = CHARACTER_X + CHARACTER_WIDTH;
        const tolerance = 50; // pixels

        expect(currentObstacleB.x).toBeLessThanOrEqual(collisionPoint + tolerance);
        expect(currentObstacleB.x).toBeGreaterThanOrEqual(collisionPoint - tolerance);
      }
    }

    // Clean up
    signal.abort();
    await handler1Promise.catch(() => {});
  });
});
